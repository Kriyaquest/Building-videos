/* Propeller car lab: the Play pane (2D side view).
   Physics, wiring and readouts are ported from the original prototype (propeller-car-lab.html).
   All numbers are estimates, not measured on the real kit. */
(function () {
"use strict";
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fx = (x, d) => { const r = Math.abs(x) < 0.5 * Math.pow(10, -d) ? 0 : x; return r.toFixed(d); };

/* ---------------- Parameters ---------------- */
const TRACK = 10;                                   // metres to the finish line
const DEF = { V: 9, Vr: 5, B: 4, D: 6, m: 50, mu: 0.03 };
const CARS = { big: { m: 50, L: 2 }, mini: { m: 25, L: 1.6 } };   // placeholder weights (g), L = body size in inches (air drag only)
const p = Object.assign({ L: CARS.big.L }, DEF);
let car = "big";
const SLIDERS = [
  { k: "V",  label: "Battery voltage",    min: 1.5,  max: 12,   step: 0.5,   unit: "V",  dec: 1 },
  { k: "Vr", label: "Motor rating",       min: 3,    max: 12,   step: 1,     unit: "V",  dec: 0 },
  { k: "B",  label: "Propeller blades",   min: 2,    max: 6,    step: 1,     unit: "",   dec: 0 },
  { k: "D",  label: "Propeller diameter", min: 3,    max: 10,   step: 0.5,   unit: "cm", dec: 1 },
  { k: "mu", label: "Wheel friction",     min: 0.005, max: 0.15, step: 0.005, unit: "",  dec: 3 }
];
function surfaceName(mu) { return mu < 0.015 ? "very smooth (glass-like)" : mu < 0.035 ? "smooth tiles" : mu < 0.06 ? "wooden floor" : mu < 0.1 ? "rough cement" : "carpet"; }
function hintFor(k) {
  switch (k) {
    case "V": return "Motor speed rises with voltage; thrust rises with speed squared.";
    case "Vr": return "The voltage the motor is designed for. The kit motor is 5 V.";
    case "B": return "More blades grip more air but load the motor.";
    case "D": return "Bigger props move more air but slow the motor down.";
    case "mu": return "Rolling coefficient · " + surfaceName(p.mu);
  }
  return "";
}

/* ---------------- Wiring ---------------- */
const STEPS = [
  { k: "snapMale",    text: "Twist the snap's red wire onto the male jumper wire" },
  { k: "motorFemale", text: "Twist the motor's red wire onto the female jumper wire" },
  { k: "blacks",      text: "Connect the motor's black wire to the snap's black wire" },
  { k: "snapBatt",    text: "Clip the snap onto the 9V battery" },
  { k: "jumpers",     text: "Join the male and female jumper wires" }
];
const wiring = { snapMale: true, motorFemale: true, blacks: true, snapBatt: true, jumpers: true, swapped: false };
const circuitClosed = () => STEPS.every(s => wiring[s.k]);
const openNames = { snapMale: "the snap's red wire isn't twisted onto the male jumper", motorFemale: "the motor's red wire isn't twisted onto the female jumper", blacks: "the two black wires aren't connected", snapBatt: "the snap isn't clipped onto the battery", jumpers: "the male and female jumpers aren't joined" };

/* ---------------- Physics model ---------------- */
const RHO = 1.2, G = 9.81;
const sim = { x: 0, v: 0, a: 0, t: 0, rpm: 0, temp: 25, thrust: 0, fric: 0, drag: 0, running: false, burned: false, finished: null, stuck: false, trace: [], last: [], traceClock: 0 };
function noLoadRPM() { return 12000 * p.V / p.Vr; }                  // small hobby motor: ~12,000 rpm unloaded at its rated voltage
function loadFactor() { return 1 / (1 + 0.55 * Math.pow(p.D / 6, 4) * Math.pow(p.B / 4, 0.6)); }  // propeller drag slows the motor
function targetRPM() { return noLoadRPM() * loadFactor(); }
function thrustFrom(rpm, v) {
  if (Math.abs(rpm) < 1) return 0;
  const dir = Math.sign(rpm), n = Math.abs(rpm) / 60, Dm = p.D / 100;
  const Ct = 0.1 * Math.pow(p.B / 4, 0.45);
  let T0 = Ct * RHO * n * n * Math.pow(Dm, 4);                       // static thrust  T = Ct·ρ·n²·D⁴
  if (dir < 0) T0 *= 0.45;                                           // blades shaped for the other direction push less
  const vp = Math.max(0.5, 0.55 * Dm * n);                           // pitch speed: thrust fades as the car approaches it
  return dir * T0 * Math.max(0, 1 - (dir * v) / vp);
}
function dragArea() { const Lm = p.L * 0.0254; return 0.57 * Lm * 0.5 * Lm; }
function rollFric() { return p.mu * (p.m / 1000) * G; }

function step(h) {
  const closed = circuitClosed() && !sim.burned;
  const pol = wiring.swapped ? -1 : 1;
  const target = closed ? pol * targetRPM() : 0;
  sim.rpm += (target - sim.rpm) * (1 - Math.exp(-h / 0.25));
  const m = p.m / 1000, Fr = rollFric(), Fs = 1.3 * Fr;
  const T = thrustFrom(sim.rpm, sim.v);
  let a, fric = 0, drag = 0;
  if (Math.abs(sim.v) < 1e-4) {
    if (Math.abs(T) > Fs) { fric = -Math.sign(T) * Fr; a = (T + fric) / m; sim.v += a * h; sim.stuck = false; }
    else { a = 0; sim.v = 0; fric = -T; sim.stuck = closed && Math.abs(sim.rpm) > 0.9 * Math.abs(target) && Math.abs(sim.rpm) > 50; }
  } else {
    const s = Math.sign(sim.v);
    fric = -s * Fr; drag = -s * 0.5 * RHO * 0.9 * dragArea() * sim.v * sim.v;
    a = (T + fric + drag) / m;
    const nv = sim.v + a * h;
    sim.v = (nv * sim.v < 0) ? 0 : nv;
    sim.stuck = false;
  }
  sim.x += sim.v * h; sim.t += h; sim.a = a; sim.thrust = T; sim.fric = fric; sim.drag = drag;
  const ratio = p.V / p.Vr;                                          // motor heating grows with (applied ÷ rated voltage)²
  const heat = closed ? 0.8 * ratio * ratio : 0;
  sim.temp += (heat - 0.06 * (sim.temp - 25)) * h;
  if (sim.temp > 110 && !sim.burned) sim.burned = true;
  sim.traceClock += h;
  if (sim.traceClock >= 0.05) { sim.traceClock = 0; sim.trace.push([sim.t, sim.v]); }
  if (sim.x >= TRACK) { sim.x = TRACK; sim.v = 0; sim.running = false; sim.finished = { t: sim.t, dir: 1 }; }
  if (sim.x <= -1.2) { sim.x = -1.2; sim.v = 0; sim.running = false; sim.finished = { t: sim.t, dir: -1 }; }
}
function resetCar() {
  if (sim.trace.length > 4) sim.last = sim.trace;
  Object.assign(sim, { x: 0, v: 0, a: 0, t: 0, rpm: 0, thrust: 0, fric: 0, drag: 0, running: false, finished: null, stuck: false, trace: [], traceClock: 0 });
  if (sim.burned) { sim.burned = false; sim.temp = 25; }
  dirty = true; uiDirty = true;
}

/* ---------------- State shared with the loop ---------------- */
let introDone = false, slow = false, dirty = true, uiDirty = true;
let propAng = 0, dotOffset = 0, raf = 0, lastT = 0, uiClock = 0;
const col = {};
function readColors() {
  const cs = getComputedStyle(document.documentElement);
  ["--scene", "--floor", "--floor-line", "--thrust", "--friction", "--air", "--current", "--accent", "--muted", "--line", "--ink", "--surface"].forEach(k => { col[k] = cs.getPropertyValue(k).trim(); });
}

/* ---------------- Markup ---------------- */
function mount(host) {
  host.innerHTML = `
  <div class="left">
    <div class="stagebox">
      <div class="stage" id="stage">
        <canvas id="cv" aria-label="Side view of the propeller car on a 10 metre track"></canvas>
        <canvas id="sketch" aria-label="Hand-drawn design sketch of the propeller car"></canvas>
        <div class="play-wrap" id="playWrap"><button class="btn primary" id="playBtn">&#9654; Play</button><span class="play-note">turns the sketch into a working car</span></div>
        <div class="hud" id="hud" hidden><span id="h-v">0.00</span><small>m/s</small><span id="h-x">0.00</span><small>m</small><span id="h-t">0.0</span><small>s</small></div>
        <div class="badge" id="badge" data-kind="info" hidden></div>
      </div>
      <div class="toolbar" id="toolbar" hidden>
        <button class="btn primary small" id="runBtn">Run</button>
        <button class="btn small" id="resetBtn">Reset</button>
        <button class="btn small" id="slowBtn" aria-pressed="false">Slow-mo</button>
        <button class="btn small" id="sketchBtn">Sketch</button>
      </div>
    </div>
    <div class="info">
      <div class="status" id="status" data-kind="info" role="status" aria-live="polite"></div>
      <div class="legend" aria-hidden="true"><span><i style="background:var(--thrust)"></i>thrust</span><span><i style="background:var(--friction)"></i>friction + drag</span><span><i style="background:var(--air)"></i>air</span><span><i style="background:var(--current)"></i>current</span></div>
    </div>
    <div class="data">
      <div class="readouts" id="readouts"></div>
      <p class="equation"><span class="lab">Newton's second law, live</span><code id="equation"></code></p>
      <div class="card graph-card">
        <div class="graph-head"><h2>Velocity over time</h2><div class="graph-key"><span><i></i>this run</span><span><i class="last"></i>previous run</span></div></div>
        <canvas id="graph" aria-label="Velocity against time graph"></canvas>
      </div>
      <p class="approx">Numbers are estimates from a simple model, not measurements of the real kit.</p>
    </div>
  </div>
  <div class="right">
    <section class="card">
      <h2>Choose a car</h2>
      <p class="sub">Compare the big car with the mini car, or type your own weight.</p>
      <div class="seg" id="carSeg">
        <button data-car="big" aria-pressed="true">Big car</button><button data-car="mini" aria-pressed="false">Mini car</button><button data-car="custom" aria-pressed="false">Custom</button>
      </div>
      <div class="wrow"><label for="wIn">Weight</label><input id="wIn" type="number" inputmode="decimal" min="10" max="500" step="5" value="${p.m}"><span>grams</span></div>
      <div class="hint" id="wHint"></div>
    </section>
    <section class="card">
      <h2>Wire the circuit</h2>
      <p class="sub">Tap a joint in the diagram or a step below to connect or disconnect it.</p>
      <svg id="schem" viewBox="0 0 340 200" role="img" aria-label="Circuit diagram: 9V battery, snap, jumper wires and motor"></svg>
      <ol class="steps" id="steps"></ol>
      <label class="swap"><input type="checkbox" id="swap"> Swap the motor's red and black wires (reverse polarity)</label>
      <div class="row"><button class="btn small" id="allOn">Connect all</button><button class="btn small" id="allOff">Disconnect all</button></div>
    </section>
    <section class="card">
      <h2>Change the car</h2>
      <p class="sub">Every change updates the physics straight away, even mid-run.</p>
      <div id="controls"></div>
      <div class="warnbox" id="warn" hidden></div>
      <div class="row"><button class="btn small" id="defaults">Restore kit values</button></div>
    </section>
  </div>`;
  buildControls(); buildSteps(); buildTiles(); wireEvents();
  readColors(); renderSchematic(); refreshControls(); updateTiles(); updateStatus();
  new ResizeObserver(() => { drawSketch(); dirty = true; uiDirty = true; }).observe($("stage"));
  if (document.fonts) document.fonts.load("500 24px Caveat").then(() => { drawSketch(); }).catch(() => {});
  LabKit.onActive(a => { readColors(); dirty = true; uiDirty = true; if (a) startLoop(); else stopLoop(); });
}

/* ---------------- Controls ---------------- */
function buildControls() {
  const box = $("controls"); box.innerHTML = "";
  SLIDERS.forEach(s => {
    const d = document.createElement("div"); d.className = "ctl";
    d.innerHTML = `<div class="top-row"><label for="in-${s.k}">${s.label}</label><output id="out-${s.k}"></output></div>
      <input type="range" id="in-${s.k}" min="${s.min}" max="${s.max}" step="${s.step}" value="${p[s.k]}">
      <span class="h" id="h-${s.k}"></span>`;
    box.appendChild(d);
    d.querySelector("input").addEventListener("input", e => { p[s.k] = parseFloat(e.target.value); onParam(); });
  });
}
function refreshControls() {
  SLIDERS.forEach(s => {
    $("in-" + s.k).value = p[s.k];
    $("out-" + s.k).textContent = p[s.k].toFixed(s.dec) + (s.unit ? " " + s.unit : "");
    $("h-" + s.k).textContent = hintFor(s.k);
  });
  document.querySelectorAll("#carSeg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.car === car));
  if (document.activeElement !== $("wIn")) $("wIn").value = Math.round(p.m * 10) / 10;
  $("wHint").textContent = `Weight force ${(p.m / 1000 * G).toFixed(2)} N · friction grows with weight`;
  const w = $("warn"), r = p.V / p.Vr;
  if (r > 2.5) { w.hidden = false; w.dataset.kind = "bad"; w.innerHTML = `<strong>Too much voltage.</strong> The ${p.Vr} V motor is getting ${p.V} V (${r.toFixed(1)}× its rating). It will overheat quickly and can burn out.`; }
  else if (r > 1.05) { w.hidden = false; w.dataset.kind = "warn"; w.innerHTML = `<strong>Over-voltage.</strong> The ${p.Vr} V motor is running on ${p.V} V (${r.toFixed(1)}× its rating). It spins faster than rated and runs hotter.`; }
  else if (r < 0.7) { w.hidden = false; w.dataset.kind = "info"; w.innerHTML = `<strong>Under-powered.</strong> ${p.V} V is well below the motor's ${p.Vr} V rating, so it turns slowly and may not beat friction.`; }
  else w.hidden = true;
}
function onParam() { refreshControls(); dirty = true; uiDirty = true; }
function setCar(id) {
  car = id;
  if (id !== "custom") { p.m = CARS[id].m; p.L = CARS[id].L; }
  resetCar(); onParam();
}

/* ---------------- Wiring panel ---------------- */
function buildSteps() {
  const ol = $("steps"); ol.innerHTML = "";
  STEPS.forEach((s, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<button class="step" data-k="${s.k}" aria-pressed="${wiring[s.k]}"><span class="n">${i + 1}</span><span>${s.text}</span><span class="st">${wiring[s.k] ? "joined" : "open"}</span></button>`;
    li.firstChild.addEventListener("click", () => { wiring[s.k] = !wiring[s.k]; onWiring(); });
    ol.appendChild(li);
  });
  $("swap").checked = wiring.swapped;
}
function onWiring() { buildSteps(); renderSchematic(); dirty = true; uiDirty = true; }

function renderSchematic() {
  const w = wiring, sy = w.snapBatt ? 64 : 44, closed = circuitClosed() && !sim.burned;
  const flowing = closed && introDone && sim.running;
  const red = [], blk = [];
  red.push(`M38 ${sy} V20 H118`);
  if (w.snapMale) red.push("M118 20 H130");
  red.push("M130 20 H182");                                          // male jumper
  if (w.jumpers) red.push("M182 20 H198");
  red.push("M198 20 H250");                                          // female jumper
  if (w.motorFemale) red.push("M250 20 H262");
  red.push(w.swapped ? "M262 20 H312 V80 L288 100 V116" : "M262 20 H312 V116");
  blk.push(`M66 ${sy} V34 H190`);
  if (w.blacks) blk.push("M190 34 H202");
  blk.push(w.swapped ? "M202 34 H288 V80 L312 100 V116" : "M202 34 H288 V116");
  const flowPath = w.swapped
    ? `M38 ${sy} V20 H312 V80 L288 100 V116 L300 140 L312 116 V100 L288 80 V34 H66 V${sy}`
    : `M38 ${sy} V20 H312 V116 L300 140 L288 116 V34 H66 V${sy}`;
  const joint = (k, x, y, n, label, by = -10) => {
    const on = w[k];
    return `<g class="hs" data-k="${k}" role="button" tabindex="0" aria-label="${label}: ${on ? "connected" : "open"}">
      <circle cx="${x}" cy="${y}" r="12" fill="transparent"/>
      <circle class="ring" cx="${x}" cy="${y}" r="${on ? 5 : 6}" fill="${on ? "var(--accent)" : "var(--surface)"}" stroke="${on ? "var(--accent)" : "var(--friction)"}" stroke-width="2" ${on ? "" : 'stroke-dasharray="3 2"'}/>
      <circle cx="${x + 10}" cy="${y + by}" r="6.5" fill="var(--accent)"/><text class="badge" x="${x + 10}" y="${y + by + 3}" text-anchor="middle">${n}</text></g>`;
  };
  $("schem").innerHTML = `
    <text x="152" y="60" text-anchor="middle">male jumper</text><text x="238" y="60" text-anchor="middle">female jumper</text>
    <rect x="20" y="96" width="64" height="92" rx="5" fill="#2f62c0"/>
    <rect x="31" y="89" width="14" height="7" rx="1.5" fill="#9aa7b3"/><rect x="58" y="89" width="16" height="7" rx="1.5" fill="#9aa7b3"/>
    <text x="38" y="112" text-anchor="middle" style="fill:#fff;font-weight:600">+</text><text x="66" y="112" text-anchor="middle" style="fill:#fff;font-weight:600">−</text>
    <text x="52" y="150" text-anchor="middle" style="fill:#fff;font-size:18px;font-weight:600">9V</text>
    <path class="wr" d="${red.join(" ")}"/>
    <path class="wb" d="${blk.join(" ")}"/>
    ${flowing ? `<path class="flow" d="${flowPath}"/>` : ""}
    <rect x="24" y="${sy}" width="56" height="16" rx="3" fill="#1d3f8f"/><text x="52" y="${sy + 11.5}" text-anchor="middle" style="fill:#fff">snap</text>
    <rect x="176" y="15" width="8" height="10" rx="1.5" fill="var(--ink)"/><rect x="196" y="15" width="8" height="10" rx="1.5" fill="var(--muted)"/>
    <circle cx="300" cy="140" r="24" fill="var(--surface)" stroke="var(--ink)" stroke-width="2.5"/>
    <text x="300" y="146" text-anchor="middle" style="fill:var(--ink);font-size:17px;font-weight:600">M</text>
    <rect x="283" y="112" width="10" height="8" fill="#9aa7b3"/><rect x="307" y="112" width="10" height="8" fill="#9aa7b3"/>
    <circle cx="317" cy="126" r="2.5" fill="#d83a34"/>
    <text x="300" y="182" text-anchor="middle">5V motor</text><text x="300" y="193" text-anchor="middle">red dot = +</text>
    <text x="104" y="${sy + 11}">${w.snapBatt ? "" : "lifted off"}</text>
    ${joint("snapMale", 124, 20, 1, "Snap red to male jumper")}
    ${joint("motorFemale", 256, 20, 2, "Motor red to female jumper")}
    ${joint("blacks", 196, 34, 3, "Black to black", 10)}
    ${joint("snapBatt", 52, sy - 2, 4, "Snap onto battery").replace(`cy="${sy - 2}" r="12"`, `cy="${sy + 8}" r="16"`)}
    ${joint("jumpers", 190, 20, 5, "Join jumpers")}`;
  $("schem").querySelectorAll(".hs").forEach(g => {
    const t = () => { wiring[g.dataset.k] = !wiring[g.dataset.k]; onWiring(); };
    g.addEventListener("click", t);
    g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); t(); } });
  });
}

/* ---------------- Readouts, equation, status ---------------- */
const TILES = [["rpm", "Motor speed", "rpm"], ["thrust", "Thrust", "N"], ["resist", "Friction + drag", "N"], ["net", "Net force", "N"], ["acc", "Acceleration", "m/s²"],
  ["vel", "Velocity", "m/s"], ["spd", "Speed", "cm/s"], ["dist", "Distance", "m"], ["time", "Time", "s"], ["temp", "Motor temp", "°C"]];
function buildTiles() {
  $("readouts").innerHTML = TILES.map(([k, l, u]) => `<div class="tile t-${k}" id="tile-${k}"><div class="k">${l}</div><div class="v"><span id="v-${k}">0</span><small>${u}</small></div><div class="s" id="s-${k}"></div>${k === "temp" ? '<div class="bar"><span id="bar-temp"></span></div>' : ""}</div>`).join("");
}
function updateTiles() {
  const net = sim.thrust + sim.fric + sim.drag;
  $("v-rpm").textContent = Math.round(Math.abs(sim.rpm)).toLocaleString("en-IN");
  $("s-rpm").textContent = sim.burned ? "burned out" : sim.rpm < -50 ? "spinning in reverse" : Math.abs(sim.rpm) > 50 ? `${Math.round(Math.abs(sim.rpm) / 60)} turns each second` : "stopped";
  $("v-thrust").textContent = fx(sim.thrust, 3); $("s-thrust").textContent = sim.thrust > 0.0005 ? "pushing forward" : sim.thrust < -0.0005 ? "pushing backward" : "";
  $("v-resist").textContent = fx(sim.fric + sim.drag, 3); $("s-resist").textContent = Math.abs(sim.drag) > 0.0005 ? `drag ${fx(Math.abs(sim.drag), 3)} N` : sim.stuck ? "static grip holds car" : "";
  $("v-net").textContent = fx(net, 3); $("s-net").textContent = Math.abs(net) < 0.0005 ? "forces balanced" : "";
  $("v-acc").textContent = fx(sim.a, 2);
  $("v-vel").textContent = fx(sim.v, 2); $("s-vel").textContent = sim.v > 0.005 ? "forward" : sim.v < -0.005 ? "backward" : "still";
  $("v-spd").textContent = fx(Math.abs(sim.v) * 100, 0); $("s-spd").textContent = `${fx(Math.abs(sim.v) * 3.6, 2)} km/h`;
  $("v-dist").textContent = fx(sim.x, 2); $("s-dist").textContent = `finish line at ${TRACK} m`;
  $("v-time").textContent = fx(sim.t, 1);
  $("v-temp").textContent = Math.round(sim.temp);
  $("bar-temp").style.width = clamp((sim.temp - 25) / 85 * 100, 0, 100) + "%";
  const tt = $("tile-temp"); tt.classList.toggle("hot", sim.temp > 60 && !sim.burned); tt.classList.toggle("burn", sim.burned);
  $("s-temp").textContent = sim.burned ? "motor burned out" : sim.temp > 60 ? "getting hot" : "burns out at 110 °C";
  $("h-v").textContent = fx(Math.abs(sim.v), 2); $("h-x").textContent = fx(sim.x, 2); $("h-t").textContent = fx(sim.t, 1);
  const m = p.m / 1000;
  if (introDone && (sim.running || sim.t > 0)) {
    $("equation").textContent = `a = F_net ÷ m = (${fx(sim.thrust, 3)} ${sim.fric + sim.drag < 0 ? "−" : "+"} ${fx(Math.abs(sim.fric + sim.drag), 3)}) N ÷ ${m.toFixed(3)} kg = ${fx(sim.a, 3)} m/s²`;
  } else {
    const closed = circuitClosed() && !sim.burned, pol = wiring.swapped ? -1 : 1;
    const T0 = closed ? Math.abs(thrustFrom(pol * targetRPM(), 0)) : 0, Fs = 1.3 * rollFric();
    const a0 = T0 > Fs ? (T0 - rollFric()) / m : 0;
    $("equation").textContent = closed
      ? `At switch-on: thrust ${T0.toFixed(3)} N vs. grip ${Fs.toFixed(3)} N → ${T0 > Fs ? `starts moving, a = (${T0.toFixed(3)} − ${rollFric().toFixed(3)}) N ÷ ${m.toFixed(3)} kg = ${a0.toFixed(3)} m/s²` : "not enough thrust to start moving"}`
      : "Circuit is open: no current, no thrust, so a = 0 ÷ m = 0 m/s²";
  }
}
let lastStatus = "";
function updateStatus() {
  const closed = circuitClosed();
  let kind, head, text;
  if (sim.burned) { kind = "bad"; head = "Motor burned out"; text = `The ${p.Vr} V motor overheated on ${p.V} V. Lower the battery voltage or pick a higher motor rating, then press Reset to fit a new motor.`; }
  else if (!closed) { const miss = STEPS.filter(s => !wiring[s.k]).map(s => openNames[s.k]); kind = "bad"; head = "Open circuit · car won't move"; text = `${miss[0].charAt(0).toUpperCase() + miss[0].slice(1)}${miss.length > 1 ? ` (and ${miss.length - 1} more gap${miss.length > 2 ? "s" : ""})` : ""}. With a gap anywhere in the loop, no current flows, so the motor and propeller stay still.`; }
  else if (sim.finished) { kind = "ok"; head = sim.finished.dir > 0 ? "Finished" : "Rolled off the back"; text = sim.finished.dir > 0 ? `The car covered ${TRACK} m in ${sim.finished.t.toFixed(1)} s. Change a setting and press Run to compare runs on the graph.` : `The car drove backward off the start of the track in ${sim.finished.t.toFixed(1)} s. Swap the motor wires back and press Run.`; }
  else if (sim.stuck && sim.running) { kind = "warn"; head = "Propeller spins, car stays put"; text = `Thrust (${Math.abs(sim.thrust).toFixed(3)} N) is less than the friction gripping the wheels (${(1.3 * rollFric()).toFixed(3)} N), so the forces balance and nothing moves. Try more voltage, a lighter car or a smoother floor.`; }
  else if (wiring.swapped) { kind = "warn"; head = "Polarity reversed · car goes backward"; text = "Current now enters the motor through the other terminal, so it spins the opposite way. The propeller pushes air forward and the car rolls backward, slowly, because the blades are shaped to push the other way."; }
  else if (!sim.running) { kind = "info"; head = "Circuit complete · ready"; text = sim.t > 0 ? "Paused. Press Run to carry on." : introDone ? "Press Run to switch the motor on." : "Press Play on the sketch to build the car and switch it on."; }
  else { kind = "ok"; head = "Circuit complete · car moves forward"; text = "Current flows from the battery's + terminal through the motor and back to −. The propeller pushes air backward, and the air pushes the car forward, nose first."; }
  const key = kind + head + text;
  if (key !== lastStatus) { lastStatus = key; const s = $("status"); s.dataset.kind = kind; s.innerHTML = `<b>${head}</b>${text}`; const b = $("badge"); b.dataset.kind = kind; b.textContent = head; }
  const rb = $("runBtn"), want = sim.running ? "Pause" : (sim.finished ? "Run again" : "Run");
  if (rb.textContent !== want) rb.textContent = want;
}

/* ---------------- Graph ---------------- */
function drawGraph() {
  const c = $("graph"), dpr = Math.min(devicePixelRatio || 1, 2), W = c.clientWidth, H = c.clientHeight;
  if (!W || !H) return;
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
  const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const ink = col["--muted"], line = col["--line"], acc = col["--accent"], last = col["--muted"];
  const all = sim.trace.concat(sim.last);
  let tMax = 4, vMax = 0.5, vMin = 0;
  all.forEach(([t, v]) => { tMax = Math.max(tMax, t); vMax = Math.max(vMax, v); vMin = Math.min(vMin, v); });
  const niceStep = r => { const raw = r / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag; return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag; };
  const vs = niceStep(vMax - vMin); vMax = Math.ceil(vMax * 1.08 / vs) * vs; vMin = vMin < 0 ? Math.floor(vMin * 1.08 / vs) * vs : 0;
  const ts = niceStep(tMax); tMax = Math.ceil(tMax / ts) * ts;
  const L = 46, R = 10, T = 10, B = 30, pw = W - L - R, ph = H - T - B;
  const X = t => L + t / tMax * pw, Y = v => T + (vMax - v) / (vMax - vMin) * ph;
  g.font = "11px " + getComputedStyle(document.documentElement).getPropertyValue("--f-mono"); g.fillStyle = ink; g.strokeStyle = line; g.lineWidth = 1;
  g.textAlign = "right"; g.textBaseline = "middle";
  for (let v = vMin; v <= vMax + 1e-9; v += vs) { const y = Math.round(Y(v)) + .5; g.beginPath(); g.moveTo(L, y); g.lineTo(W - R, y); g.stroke(); g.fillText(v.toFixed(vs < 0.1 ? 2 : vs < 1 ? 1 : 0), L - 6, y); }
  g.textAlign = "center"; g.textBaseline = "top";
  for (let t = 0; t <= tMax + 1e-9; t += ts) { const x = Math.round(X(t)) + .5; g.beginPath(); g.moveTo(x, T); g.lineTo(x, T + ph); g.stroke(); g.fillText(t.toFixed(ts < 1 ? 1 : 0), x, T + ph + 5); }
  g.fillText("time (s)", L + pw / 2, T + ph + 17);
  g.save(); g.translate(11, T + ph / 2); g.rotate(-Math.PI / 2); g.textBaseline = "middle"; g.fillText("velocity (m/s)", 0, 0); g.restore();
  const plot = (tr, color, dash, w) => { if (tr.length < 2) return; g.save(); g.strokeStyle = color; g.lineWidth = w; g.setLineDash(dash); g.lineJoin = "round"; g.beginPath(); tr.forEach(([t, v], i) => i ? g.lineTo(X(t), Y(v)) : g.moveTo(X(t), Y(v))); g.stroke(); g.restore(); };
  plot(sim.last, last, [5, 4], 1.6);
  plot(sim.trace, acc, [], 2.4);
  if (sim.trace.length) { const [t, v] = sim.trace[sim.trace.length - 1]; g.fillStyle = acc; g.beginPath(); g.arc(X(t), Y(v), 3.5, 0, Math.PI * 2); g.fill(); }
}

/* ---------------- Hand-drawn sketch (intro) ---------------- */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function drawSketch() {
  const c = $("sketch"), st = $("stage"), dpr = Math.min(devicePixelRatio || 1, 2);
  if (!c || !st) return;
  const W = st.clientWidth, H = st.clientHeight; if (!W || !H) return;
  c.width = W * dpr; c.height = H * dpr;
  const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const R = mulberry32(9);
  const INK = "#27323f", INK2 = "#56616d";
  g.fillStyle = "#f8fafc"; g.fillRect(0, 0, W, H);
  g.strokeStyle = "#d7e3ef"; g.lineWidth = 1;
  for (let x = 0.5; x < W; x += 22) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  for (let y = 0.5; y < H; y += 22) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
  g.strokeStyle = "#f0b4b4"; g.beginPath(); g.moveTo(W * 0.035, 0); g.lineTo(W * 0.035, H); g.stroke();
  const sc = Math.min(W / 1000, H / 650), labels = sc >= 0.5;        // on small stages the drawing is shown without the small print
  g.translate((W - 1000 * sc) / 2, Math.max(0, (H - 650 * sc) / 2)); g.scale(sc, sc);

  const densify = (pts, closed, step = 16) => { const out = [], n = pts.length, segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) { const a = pts[i], b = pts[(i + 1) % n], len = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.ceil(len / step));
      for (let j = 0; j < k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]); }
    out.push(closed ? pts[0] : pts[n - 1]); return out; };
  const stroke = (pts, o = {}) => {
    const { closed = false, color = INK, w = 1.8, j = 1.0, passes = 2, fill = null, fa = 0.62, dash = null } = o;
    const P = densify(pts, closed);
    if (fill) { g.save(); g.globalAlpha = fa; g.fillStyle = fill; const ox = (R() - .5) * 3, oy = (R() - .5) * 3; g.beginPath(); P.forEach((q, i) => i ? g.lineTo(q[0] + ox, q[1] + oy) : g.moveTo(q[0] + ox, q[1] + oy)); g.closePath(); g.fill(); g.restore(); }
    g.save(); g.strokeStyle = color; g.lineCap = "round"; g.lineJoin = "round"; if (dash) g.setLineDash(dash);
    for (let s = 0; s < passes; s++) { g.lineWidth = s ? w * 0.55 : w; g.globalAlpha = s ? 0.5 : 0.95; const ph = R() * 6; g.beginPath();
      P.forEach((q, i) => { const dx = Math.sin(i * 0.9 + ph) * j + (R() - .5) * j * .7, dy = Math.cos(i * 0.7 + ph) * j + (R() - .5) * j * .7; i ? g.lineTo(q[0] + dx, q[1] + dy) : g.moveTo(q[0] + dx, q[1] + dy); });
      g.stroke(); }
    g.restore();
  };
  const rect = (x, y, w, h, o) => stroke([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], Object.assign({ closed: true }, o));
  const circ = (cx, cy, r, o) => { const pts = [], a0 = R() * 6; for (let i = 0; i < 40; i++) { const a = a0 + i / 40 * Math.PI * 2; pts.push([cx + Math.cos(a) * r * (1 + (R() - .5) * .03), cy + Math.sin(a) * r * (1 + (R() - .5) * .03)]); } stroke(pts, Object.assign({ closed: true }, o)); };
  const arrow = (x1, y1, x2, y2, o = {}) => { stroke([[x1, y1], [x2, y2]], o); const a = Math.atan2(y2 - y1, x2 - x1), hl = o.head || 14; stroke([[x2 - hl * Math.cos(a - .45), y2 - hl * Math.sin(a - .45)], [x2, y2], [x2 - hl * Math.cos(a + .45), y2 - hl * Math.sin(a + .45)]], o); };
  const text = (t, x, y, size = 24, color = INK, align = "left", weight = 500) => { if (!labels) return; g.save(); g.font = `${weight} ${size}px Caveat, "Segoe Print", "Comic Sans MS", cursive`; g.fillStyle = color; g.textAlign = align; g.fillText(t, x, y); g.restore(); };
  const leader = (x1, y1, x2, y2) => { if (!labels) return; stroke([[x1, y1], [x2, y2]], { w: 1.1, j: .5, passes: 1, color: INK2 }); g.fillStyle = INK2; g.beginPath(); g.arc(x2, y2, 2.4, 0, 7); g.fill(); };
  const bez = (p0, p1, p2, p3, n = 24) => { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } return out; };

  const C = { yellow: "#f2c230", teal: "#2fb3ad", blue: "#2f62c0", snap: "#1d3f8f", orange: "#f08a24", tan: "#c9a26b", grey: "#aab4be", red: "#d83a34", air: "#3f8fd0", green: "#1f9950" };
  const S = 28, cx = 600, gy = 440, X = x => cx + x * S, Y = y => gy - y * S;

  g.save(); g.font = `700 46px Caveat, "Segoe Print", "Comic Sans MS", cursive`; g.fillStyle = INK; g.fillText("Propeller Car", 700, 50); g.restore();
  text("Propel Forces Adventure · design sketch", 702, 78, 22, INK2);

  stroke([[X(-12.5), gy], [X(10.5), gy]], { w: 2 });
  for (let x = X(-12.2); x < X(10.3); x += 16) stroke([[x, gy + 3], [x - 9, gy + 12]], { w: 1, passes: 1, j: .3, color: INK2 });

  [4.8, -4.8].forEach(xw => { circ(X(xw), Y(2.25), 2.25 * S, { fill: C.teal, w: 2 }); circ(X(xw), Y(2.25), 0.75 * S, { fill: "#ffffff", fa: .9, w: 1.5 }); circ(X(xw), Y(2.25), 0.42 * S, { fill: C.orange, fa: .85, w: 1.2, passes: 1 }); });
  rect(X(-7), Y(3.5), 14 * S, 0.8 * S, { fill: C.yellow, w: 2 });
  stroke([[X(-3.5), Y(3.4)], [X(-3.5), Y(2.8)]], { dash: [4, 4], w: 1.2, passes: 1 }); stroke([[X(-0.5), Y(3.4)], [X(-0.5), Y(2.8)]], { dash: [4, 4], w: 1.2, passes: 1 });
  rect(X(1.8 - 0.875), Y(8.35), 1.75 * S, 4.85 * S, { fill: C.blue, w: 2 });
  text("9V", X(1.8), Y(6.4), 26, "#ffffff", "center", 700);
  rect(X(1.8 - 1.3), Y(5.1), 2.6 * S, 1.6 * S, { fill: C.yellow, w: 1.8 });
  rect(X(1.8 - 0.7), Y(8.95), 1.4 * S, 0.6 * S, { fill: C.snap, w: 1.6 });
  rect(X(0.3), Y(6.7), 0.3 * S, 3.2 * S, { fill: C.tan, w: 1.4 });
  rect(X(-6.85), Y(6.7), 1.3 * S, 3.2 * S, { fill: C.yellow, w: 1.8 });
  rect(X(-7.2), Y(8.2), 2.6 * S, 2 * S, { fill: C.grey, w: 1.8 });
  rect(X(-4.6), Y(8.0), 0.4 * S, 1.6 * S, { fill: "#ffffff", fa: .9, w: 1.3 });
  stroke([[X(-7.2), Y(7.2)], [X(-8.0), Y(7.2)]], { w: 2.2 });
  const px = X(-8.05), py = Y(7.2), pr = 3 * S;
  stroke([[px, py], [px - 7, py - pr * 0.35], [px - 5, py - pr * 0.9], [px, py - pr], [px + 5, py - pr * 0.9], [px + 6, py - pr * 0.3]], { closed: true, fill: "#ffffff", fa: .95, w: 1.6 });
  stroke([[px, py], [px - 6, py + pr * 0.3], [px - 5, py + pr * 0.9], [px, py + pr], [px + 5, py + pr * 0.9], [px + 7, py + pr * 0.35]], { closed: true, fill: "#ffffff", fa: .95, w: 1.6 });
  circ(px, py, 0.4 * S, { fill: "#ffffff", fa: 1, w: 1.5 });
  stroke(bez([X(1.55), Y(8.95)], [X(0.8), Y(12.2)], [X(-3.4), Y(11.8)], [X(-4.25), Y(7.8)]), { color: C.red, w: 2.6, j: .6 });
  stroke(bez([X(2.05), Y(8.95)], [X(1.8), Y(10.8)], [X(-3.0), Y(10.6)], [X(-4.25), Y(7.35)]), { color: "#1d1f22", w: 2.4, j: .6 });
  rect(X(-1.35), Y(11.35), 0.9 * S, 0.35 * S, { fill: "#333", fa: .9, w: 1.2, passes: 1 });
  text("M | F", X(-0.9), Y(11.75), 17, INK2, "center");
  stroke([[X(0.35), Y(11.2)], [X(0.55), Y(11.55)], [X(0.75), Y(11.15)], [X(0.95), Y(11.5)]], { w: 1.4, passes: 1, color: C.red });
  [5.8, 7.2, 8.6].forEach((yy, i) => { const pts = []; for (let k = 0; k <= 24; k++) { const x = X(-8.8) - k * (2.6 * S / 24); pts.push([x, Y(yy) + Math.sin(k * 0.7 + i) * 3]); } stroke(pts, { color: C.air, w: 2, j: .4 }); const e = pts[pts.length - 1]; arrow(e[0] + 14, e[1], e[0] - 4, e[1], { color: C.air, w: 2, head: 12, j: .3 }); });
  arrow(X(4.2), Y(5.4), X(9.4), Y(5.4), { color: C.green, w: 3.2, head: 18, j: .6 });
  text("THRUST · car moves forward", X(4.1), Y(6.1), 22, C.green, "left", 700);

  text("air pushed backward", X(-8.9), Y(4.4), 23, C.air, "right", 700);
  text("4-blade propeller", X(-9.2), Y(3.1), 23, INK, "right"); leader(X(-9.1), Y(3.25), X(-8.1), Y(4.5));
  text("foam motor holder", X(-9.2), Y(1.4), 23, INK, "right"); leader(X(-9.1), Y(1.55), X(-6.85), Y(4.4));
  text("5V DC motor", X(-8.2), Y(11.9), 24); leader(X(-6.2), Y(11.55), X(-5.9), Y(8.3));
  text("red (+) & black (−) wires", X(-3.6), Y(12.45), 22); leader(X(-1.4), Y(12.15), X(-0.9), Y(11.5));
  text("9V battery standing in", X(3.2), Y(10.9), 23); text("a foam mount, snap on top", X(3.2), Y(10.1), 23); leader(X(3.15), Y(10.2), X(2.35), Y(8.7));
  text("wooden stand", X(-4.3), Y(5.1), 22); leader(X(-1.5), Y(5.35), X(0.3), Y(5.35));
  text("rounded D-shaped nose", X(7.25), Y(1.3), 22); leader(X(7.6), Y(1.8), X(7.02), Y(3.1));
  text("yellow foam body · circular cutout (dashed)", X(-1.5), gy + 42, 22, INK, "center"); leader(X(-1.5), gy + 22, X(-1.5), Y(2.75));
  text("turquoise foam wheels · axles run through orange channel tubes", X(3.6), gy + 80, 22, INK, "center"); leader(X(4.8), gy + 60, X(4.8), Y(0.5));

  const ix = 24, iy = 20, k = 9, icx = 150, icy = 116, TX = x => icx + x * k, TZ = z => icy + z * k;
  rect(ix, iy, 252, 186, { w: 1.3, passes: 1, color: INK2 });
  text("top view", ix + 10, iy + 24, 22, INK2, "left", 700);
  [[4.8, 1], [4.8, -1], [-4.8, 1], [-4.8, -1]].forEach(([x, s]) => rect(TX(x - 2.25), TZ(s > 0 ? 4.2 : -6), 4.5 * k, 1.8 * k, { fill: C.teal, w: 1.2, passes: 1 }));
  [4.8, -4.8].forEach(x => rect(TX(x - 0.45), TZ(-3.6), 0.9 * k, 7.2 * k, { fill: C.orange, fa: .8, w: 1, passes: 1 }));
  const dpts = [[TX(-7), TZ(-4)], [TX(3), TZ(-4)]]; for (let i = 1; i <= 16; i++) { const a = -Math.PI / 2 + i / 16 * Math.PI; dpts.push([TX(3 + 4 * Math.cos(a)), TZ(4 * Math.sin(a))]); } dpts.push([TX(-7), TZ(4)]);
  stroke(dpts, { closed: true, fill: C.yellow, fa: .55, w: 1.6 });
  circ(TX(-2), TZ(0), 1.5 * k, { fill: "#f8fafc", fa: 1, w: 1.3 });
  rect(TX(1.8 - 0.875), TZ(-1.33), 1.75 * k, 2.65 * k, { fill: C.blue, w: 1.2, passes: 1 });
  rect(TX(-6.85), TZ(-1.5), 1.3 * k, 3 * k, { fill: C.yellow, w: 1.2, passes: 1 });
  rect(TX(-7.2), TZ(-1), 2.6 * k, 2 * k, { fill: C.grey, w: 1.2, passes: 1 });
  stroke([[TX(-8.05), TZ(-3)], [TX(-8.05), TZ(3)]], { w: 2.4, passes: 1 });
  text("front →", TX(7.4), TZ(0.5), 19, INK2);
}

/* ---------------- Live 2D scene ---------------- */
const WIRE_RED = bez2([1.55, 8.95], [0.8, 12.2], [-3.4, 11.8], [-4.25, 7.8]);
const WIRE_BLK = bez2([2.05, 8.95], [1.8, 10.8], [-3.0, 10.6], [-4.25, 7.35]);
function bez2(p0, p1, p2, p3, n = 30) { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } return out; }
const seeds = Array.from({ length: 70 }, () => ({ x: -9 - Math.random() * 30, r: Math.random(), a: Math.random() * 6.28 }));

function updateVisuals(dt) {
  const vis = Math.min(1, Math.abs(sim.rpm) / 14000), dir = Math.sign(sim.rpm);
  if (Math.abs(sim.rpm) > 30) propAng += dir * dt * (reduceMotion ? 2 : 8 + 28 * vis);
  dotOffset += dt * (reduceMotion ? 0.15 : 0.6);
  const len = 6 * p.D, speed = (reduceMotion ? 40 : 140) * vis;
  seeds.forEach(q => {
    if (vis > 0.01) { q.x -= dir * speed * dt * (0.7 + q.r * 0.6); q.a += dir * dt * 2.5; }
    if (dir >= 0 && q.x < -8.3 - len) { q.x = -8.3 - Math.random() * 2; q.r = Math.random(); }
    if (dir < 0 && q.x > -8.4) { q.x = -8.3 - len + Math.random() * 2; q.r = Math.random(); }
  });
}

function draw() {
  const c = $("cv"), st = $("stage"), dpr = Math.min(devicePixelRatio || 1, 2), W = st.clientWidth, H = st.clientHeight;
  if (!W || !H) return;
  if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
  const g = c.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = col["--scene"]; g.fillRect(0, 0, W, H);
  const gy = Math.round(H * 0.74), s = Math.max(4, Math.min(W / 30, (gy - 50) / 11.5)), ox = W * 0.46, pxM = 100 * s;
  const sx = xm => ox + (xm - sim.x) * pxM;                          // world metres → screen x
  const X = x => ox + x * s, Y = y => gy - y * s;                    // car cm → screen
  // floor + ticks
  g.fillStyle = col["--floor"]; g.fillRect(0, gy, W, H - gy);
  g.strokeStyle = col["--floor-line"]; g.fillStyle = col["--muted"]; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(0, gy + .5); g.lineTo(W, gy + .5); g.stroke();
  g.font = "600 11px " + getComputedStyle(document.documentElement).getPropertyValue("--f-mono"); g.textAlign = "center"; g.textBaseline = "top";
  const i0 = Math.floor((sim.x - ox / pxM) * 10) - 1, i1 = Math.ceil((sim.x + (W - ox) / pxM) * 10) + 1;
  for (let i = i0; i <= i1; i++) {
    const x = Math.round(sx(i / 10)) + .5, major = i % 10 === 0, jit = ((i * 2654435761) >>> 0) % 4;
    g.beginPath(); g.moveTo(x, gy); g.lineTo(x, gy + (major ? 15 : i % 5 === 0 ? 10 : 4 + jit)); g.stroke();
    if (major && i / 10 >= 0 && i / 10 <= TRACK) g.fillText(i / 10 + " m", x, gy + 17);
  }
  // start + finish flags: short posts on the ground, label underneath
  [[0, "START", col["--thrust"]], [TRACK, "FINISH", col["--friction"]]].forEach(([xm, label, color]) => {
    const x = sx(xm); if (x < -40 || x > W + 40) return;
    g.fillStyle = color; g.fillRect(x - 1.5, gy - 26, 3, 26);
    g.font = "700 10px " + getComputedStyle(document.documentElement).getPropertyValue("--f-body"); g.textAlign = "center"; g.textBaseline = "top"; g.fillText(label, x, gy + 30);
  });
  // minimap: progress along the whole 10 m track
  const mx0 = 16, mx1 = W - 16, my = 18, mp = clamp((sim.x) / TRACK, 0, 1);
  g.strokeStyle = col["--floor-line"]; g.lineWidth = 3; g.lineCap = "round"; g.beginPath(); g.moveTo(mx0, my); g.lineTo(mx1, my); g.stroke();
  g.strokeStyle = col["--accent"]; g.beginPath(); g.moveTo(mx0, my); g.lineTo(mx0 + (mx1 - mx0) * mp, my); g.stroke(); g.lineCap = "butt";
  g.lineWidth = 1; g.strokeStyle = col["--floor-line"]; g.fillStyle = col["--muted"]; g.font = "600 10px system-ui,sans-serif"; g.textAlign = "center"; g.textBaseline = "top";
  for (let m = 0; m <= TRACK; m += 1) { const x = Math.round(mx0 + (mx1 - mx0) * m / TRACK) + .5; g.beginPath(); g.moveTo(x, my - 4); g.lineTo(x, my + 4); g.stroke(); if (m % 5 === 0) g.fillText(m + " m", x, my + 7); }
  g.fillStyle = "#f2c230"; g.strokeStyle = "#1f2937"; g.lineWidth = 1.5; g.beginPath(); g.arc(mx0 + (mx1 - mx0) * mp, my, 5.5, 0, 7); g.fill(); g.stroke();

  drawCar(g, X, Y, s, ox, gy);
}

function drawCar(g, X, Y, s, ox, gy) {
  const OUT = "#1f2937", Cc = { yellow: "#f2c230", teal: "#2fb3ad", blue: "#2f62c0", snap: "#1d3f8f", orange: "#f08a24", tan: "#c9a26b", grey: "#aab4be" };
  const box = (x, y, w, h, fill, lw = 1.4) => { g.fillStyle = fill; g.fillRect(X(x), Y(y + h), w * s, h * s); g.strokeStyle = OUT; g.lineWidth = lw; g.strokeRect(X(x), Y(y + h), w * s, h * s); };
  const vis = Math.min(1, Math.abs(sim.rpm) / 14000), dir = Math.sign(sim.rpm);
  // air (behind the car)
  if (vis > 0.01 && introDone) {
    const R = p.D / 2;
    g.fillStyle = col["--air"];
    seeds.forEach(q => {
      const rr = R * 0.85 * Math.sqrt(q.r), y = 7.2 + Math.sin(q.a) * rr, x = q.x;
      g.globalAlpha = 0.8 * vis; g.fillRect(X(x), Y(y), Math.max(2, 0.7 * s * (reduceMotion ? 0.5 : 1)), 1.6);
    });
    g.globalAlpha = 1;
  }
  // wheels
  const ang = sim.x / 0.0225;
  [4.8, -4.8].forEach(xw => {
    const cx = X(xw), cy = Y(2.25), r = 2.25 * s;
    g.fillStyle = Cc.teal; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.6; g.stroke();
    g.fillStyle = "#fff"; g.beginPath(); g.arc(cx, cy, 0.75 * s, 0, 7); g.fill(); g.stroke();
    g.strokeStyle = "#0f766e"; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(ang) * r * 0.92, cy + Math.sin(ang) * r * 0.92); g.stroke();
    g.fillStyle = Cc.orange; g.beginPath(); g.arc(cx + Math.cos(ang) * r * 0.55, cy + Math.sin(ang) * r * 0.55, 0.32 * s, 0, 7); g.fill();
  });
  box(-7, 2.7, 14, 0.8, Cc.yellow, 1.8);                                   // body
  box(0.925, 3.5, 1.75, 4.85, Cc.blue);                                    // battery
  g.fillStyle = "#fff"; g.font = `700 ${Math.max(9, 1.1 * s)}px system-ui,sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("9V", X(1.8), Y(6.6));
  box(0.5, 3.5, 2.6, 1.6, Cc.yellow);                                      // battery mount
  box(1.1, 8.35, 1.4, 0.6, Cc.snap);                                       // snap
  box(0.3, 3.5, 0.3, 3.2, Cc.tan);                                         // wooden stand
  box(-6.85, 3.5, 1.3, 3.2, Cc.yellow);                                    // motor holder
  box(-7.2, 6.2, 2.6, 2.0, Cc.grey);                                       // motor
  box(-4.6, 6.4, 0.4, 1.6, "#fff");
  g.strokeStyle = OUT; g.lineWidth = 2.2; g.beginPath(); g.moveTo(X(-7.2), Y(7.2)); g.lineTo(X(-8.0), Y(7.2)); g.stroke();   // shaft
  // wires + jumper
  const wire = (pts, color) => { g.strokeStyle = color; g.lineWidth = Math.max(1.5, 0.22 * s); g.lineCap = "round"; g.beginPath(); pts.forEach(([x, y], i) => i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))); g.stroke(); g.lineCap = "butt"; };
  wire(WIRE_RED, "#d83a34"); wire(WIRE_BLK, "#1d1f22");
  box(-1.35, 11.35, 0.9, 0.35, "#333", 1);
  const closed = circuitClosed() && !sim.burned;
  if (!closed) {
    g.strokeStyle = col["--friction"]; g.lineWidth = 2; g.setLineDash([4, 3]); g.beginPath(); g.arc(X(-0.9), Y(11.5), 1.1 * s, 0, 7); g.stroke(); g.setLineDash([]);
    g.fillStyle = col["--friction"]; g.font = `700 ${Math.max(10, 0.9 * s)}px system-ui,sans-serif`; g.textAlign = "center"; g.textBaseline = "bottom"; g.fillText("open circuit", X(-0.9), Y(12.9));
  } else if (sim.running && introDone) {                                 // current dots (battery + → motor → battery −)
    g.fillStyle = col["--current"];
    for (let k = 0; k < 6; k++) {
      const t = (dotOffset + k / 6) % 1, tt = wiring.swapped ? 1 - t : t;
      const a = WIRE_RED[Math.round(tt * (WIRE_RED.length - 1))], b = WIRE_BLK[Math.round((1 - tt) * (WIRE_BLK.length - 1))];
      g.beginPath(); g.arc(X(a[0]), Y(a[1]), Math.max(2, 0.22 * s), 0, 7); g.fill(); g.beginPath(); g.arc(X(b[0]), Y(b[1]), Math.max(2, 0.22 * s), 0, 7); g.fill();
    }
  }
  // propeller, edge-on: blade tips swing up and down as it spins
  const Rp = p.D / 2 * s, px = X(-8.05), py = Y(7.2);
  if (vis > 0.12) { g.fillStyle = "rgba(255,255,255," + (0.5 * vis) + ")"; g.beginPath(); g.ellipse(px, py, 0.3 * s, Rp, 0, 0, 7); g.fill(); }
  for (let k = 0; k < p.B; k++) {
    const a = propAng + k * Math.PI * 2 / p.B, ty = Math.sin(a) * Rp, bw = (0.35 + 0.35 * Math.abs(Math.cos(a))) * s;
    g.globalAlpha = 1 - 0.55 * vis; g.fillStyle = "#fff"; g.strokeStyle = OUT; g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(px, py); g.lineTo(px - bw, py - ty * 0.5); g.lineTo(px, py - ty); g.lineTo(px + bw, py - ty * 0.5); g.closePath(); g.fill(); g.stroke();
  }
  g.globalAlpha = 1; g.fillStyle = "#fff"; g.strokeStyle = OUT; g.beginPath(); g.arc(px, py, 0.4 * s, 0, 7); g.fill(); g.stroke();
  // force arrows (0.1 N ≈ 14 cm of arrow)
  if (introDone && sim.running) {
    const arrow = (x1, y, len, sign, color, label) => {
      const x2 = x1 + sign * len, hl = Math.min(2 * s, len * s * 0.5);
      g.strokeStyle = color; g.fillStyle = color; g.lineWidth = Math.max(2.5, 0.28 * s);
      g.beginPath(); g.moveTo(X(x1), Y(y)); g.lineTo(X(x2) - sign * hl * 0.6, Y(y)); g.stroke();
      g.beginPath(); g.moveTo(X(x2), Y(y)); g.lineTo(X(x2) - sign * hl, Y(y) - hl * 0.55); g.lineTo(X(x2) - sign * hl, Y(y) + hl * 0.55); g.closePath(); g.fill();
      g.font = `700 ${Math.max(10, 0.85 * s)}px system-ui,sans-serif`; g.textAlign = sign > 0 ? "left" : "right"; g.textBaseline = "middle"; g.fillText(label, X(x2) + sign * 6, Y(y));
    };
    const tl = Math.abs(sim.thrust) / 0.1 * 14, fl = Math.abs(sim.fric + sim.drag) / 0.1 * 14;
    if (tl > 0.6) arrow(4.2, 5.9, Math.max(tl, 2.6), Math.sign(sim.thrust), col["--thrust"], "thrust");
    if (fl > 0.6) arrow(4.2, -1.4, Math.max(fl, 2.4), Math.sign(sim.fric + sim.drag), col["--friction"], "friction + drag");
  }
}

/* ---------------- Loop ---------------- */
function tick(dt) {
  const h0 = dt * (slow ? 0.25 : 1);
  if (introDone) {
    if (sim.running) { let h = h0; while (h > 1e-6) { const s = Math.min(h, 1 / 240); step(s); h -= s; } }
    else if (!sim.finished && sim.t === 0) sim.rpm *= Math.exp(-dt / 0.25);
  }
  const moving = introDone && (sim.running || Math.abs(sim.rpm) > 1);
  if (moving) updateVisuals(h0);
  if (moving || dirty) { draw(); dirty = false; }
  uiClock += dt;
  if (uiClock > 0.08 && (moving || uiDirty)) { uiClock = 0; uiDirty = false; updateTiles(); updateStatus(); drawGraph(); }
  if (sim.running !== lastRun) { lastRun = sim.running; renderSchematic(); }
}
let lastRun = false;
function loop(now) { raf = requestAnimationFrame(loop); const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; tick(dt); }
function startLoop() { if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(loop); } }
function stopLoop() { cancelAnimationFrame(raf); raf = 0; }

/* ---------------- Events ---------------- */
function showLive(on) { $("toolbar").hidden = !on; $("hud").hidden = !on; $("badge").hidden = !on; }
function startIntro(instant) {
  $("sketch").classList.add("gone"); $("playWrap").hidden = true;
  const go = () => { introDone = true; sim.running = true; showLive(true); dirty = true; uiDirty = true; renderSchematic(); };
  if (instant || reduceMotion) go(); else setTimeout(go, 900);
}
function backToSketch() {
  resetCar(); introDone = false; showLive(false);
  $("sketch").classList.remove("gone"); $("playWrap").hidden = false; renderSchematic();
}
function applySetup(o) {                                              // used by the Challenge pane
  if (o.car) setCar(o.car);
  ["m", "V", "Vr", "B", "D", "mu"].forEach(k => { if (o[k] != null) p[k] = o[k]; });
  if (o.wiring) Object.assign(wiring, o.wiring);
  resetCar(); refreshControls(); onWiring();
  if (!introDone) startIntro(true);
  sim.running = false; dirty = true; uiDirty = true;
}
function wireEvents() {
  $("playBtn").addEventListener("click", () => startIntro(false));
  $("sketchBtn").addEventListener("click", backToSketch);
  $("resetBtn").addEventListener("click", () => { resetCar(); renderSchematic(); });
  $("runBtn").addEventListener("click", () => { if (sim.finished) resetCar(); sim.running = !sim.running; renderSchematic(); dirty = true; uiDirty = true; });
  $("slowBtn").addEventListener("click", e => { slow = !slow; e.currentTarget.setAttribute("aria-pressed", slow); });
  $("swap").addEventListener("change", e => { wiring.swapped = e.target.checked; onWiring(); });
  $("allOn").addEventListener("click", () => { STEPS.forEach(s => wiring[s.k] = true); onWiring(); });
  $("allOff").addEventListener("click", () => { STEPS.forEach(s => wiring[s.k] = false); onWiring(); });
  $("defaults").addEventListener("click", () => { Object.assign(p, DEF); setCar("big"); });
  document.querySelectorAll("#carSeg button").forEach(b => b.addEventListener("click", () => setCar(b.dataset.car)));
  $("wIn").addEventListener("input", e => {
    const v = parseFloat(e.target.value);
    if (!(v >= 10 && v <= 500)) return;                                // ignore half-typed numbers
    p.m = v; car = (v === CARS.big.m && p.L === CARS.big.L) ? "big" : (v === CARS.mini.m && p.L === CARS.mini.L) ? "mini" : "custom"; onParam();
  });
  $("wIn").addEventListener("change", e => { p.m = clamp(parseFloat(e.target.value) || DEF.m, 10, 500); onParam(); });
}

LabKit.start({
  play: { mount, setup: applySetup },
  learn: window.LAB_CONTENT.learn, learnLede: window.LAB_CONTENT.learnLede,
  challenge: window.LAB_CONTENT.challenge,
  quiz: window.LAB_CONTENT.quiz
});
})();
