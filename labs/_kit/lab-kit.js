/* Lab kit: tabs, Learn / Challenge / Quiz / Connect renderers, theme, and the pause/theme messages from the host page.
   A lab calls LabKit.start({ play:{mount, setup}, learn:[], challenge:[], quiz:[], connect:[] }).
   Only panes that have content get a tab. Nothing is stored; nothing leaves the page. */
(function () {
  "use strict";
  var ICON = {
    play: '<svg viewBox="0 0 24 24"><polygon points="6 4 20 12 6 20 6 4"/></svg>',
    learn: '<svg viewBox="0 0 24 24"><path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z"/><path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/></svg>',
    challenge: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/></svg>',
    quiz: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4.5"/><path d="M12 17.5h.01"/></svg>',
    connect: '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>'
  };
  var LABELS = { play: "Play", learn: "Learn", challenge: "Challenge", quiz: "Quiz", connect: "Connect" };
  var ORDER = ["play", "learn", "challenge", "quiz", "connect"];

  var cfg, current = "play", hostPaused = false, listeners = [];
  var panes = {}, tabs = {};

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---- theme: ?theme=light|dark from the host page, else the device setting ---- */
  function setTheme(t) { if (t === "dark" || t === "light") document.documentElement.setAttribute("data-theme", t); }
  setTheme(new URLSearchParams(location.search).get("theme"));

  /* ---- active = should the animation run? (visible tab, host not paused, page not hidden) ---- */
  function active() { return current === "play" && !hostPaused && !document.hidden; }
  function notify() { var a = active(); listeners.forEach(function (fn) { fn(a); }); }
  document.addEventListener("visibilitychange", notify);
  window.addEventListener("message", function (e) {
    if (e.origin !== location.origin || !e.data || typeof e.data !== "object") return;
    if (e.data.kq === "pause") { hostPaused = true; notify(); }
    else if (e.data.kq === "resume") { hostPaused = false; notify(); }
    else if (e.data.kq === "theme") { setTheme(e.data.theme); notify(); }
  });

  function go(id) {
    if (!panes[id]) return;
    current = id;
    Object.keys(panes).forEach(function (k) {
      var on = k === id;
      panes[k].classList.toggle("on", on);
      tabs[k].setAttribute("aria-selected", on);
    });
    if (id !== "play") panes[id].scrollTop = 0;
    notify();
  }

  /* ---- renderers ---- */
  function renderCards(host, items, lede, head) {
    var inner = el("div", "pane-inner");
    inner.appendChild(el("h2", "", esc(head)));
    if (lede) inner.appendChild(el("p", "lede", esc(lede)));
    items.forEach(function (c) {
      var d = el("div", "card learn-card");
      d.innerHTML = (c.tag ? '<span class="tag">' + esc(c.tag) + "</span>" : "") + "<h3>" + esc(c.title) + "</h3><p>" + esc(c.body) + "</p>";
      if (c.href) { var a = el("a", "btn small", esc(c.linkText || "Open")); a.href = c.href; a.target = "_blank"; a.rel = "noopener"; a.style.marginTop = "10px"; d.appendChild(a); }
      inner.appendChild(d);
    });
    host.appendChild(inner);
  }

  function renderChallenges(host, items) {
    var inner = el("div", "pane-inner");
    inner.appendChild(el("h2", "", "Predict, then test"));
    inner.appendChild(el("p", "lede", "Make a guess first. Then set it up in Play and see if you were right."));
    items.forEach(function (c, i) {
      var d = el("div", "card chal");
      d.innerHTML = "<h3>" + esc(c.title) + '</h3><p class="ask">' + esc(c.ask) + '</p><p class="try">' + esc(c.tryIt) + "</p>";
      var row = el("div", "row");
      var go1 = el("button", "btn primary small", "Set it up in Play");
      go1.addEventListener("click", function () { if (c.setup && cfg.play.setup) cfg.play.setup(c.setup); go("play"); });
      var show = el("button", "btn small", "Show the answer");
      var ans = el("p", "reveal", esc(c.reveal)); ans.hidden = true;
      show.addEventListener("click", function () { ans.hidden = !ans.hidden; show.textContent = ans.hidden ? "Show the answer" : "Hide the answer"; });
      row.appendChild(go1); row.appendChild(show);
      d.appendChild(row); d.appendChild(ans);
      inner.appendChild(d);
    });
    host.appendChild(inner);
  }

  function renderQuiz(host, items) {
    var inner = el("div", "pane-inner"), done = 0, score = 0;
    inner.appendChild(el("h2", "", "Quick quiz"));
    inner.appendChild(el("p", "lede", items.length + " questions. Tap an answer to check it."));
    var foot = el("div", "quiz-foot"); foot.hidden = true;
    var res = el("b", ""); var again = el("button", "btn small", "Try again");
    foot.appendChild(res); foot.appendChild(again);
    function build() {
      done = 0; score = 0; foot.hidden = true;
      inner.querySelectorAll(".q").forEach(function (n) { n.remove(); });
      items.forEach(function (q, qi) {
        var d = el("div", "card q");
        d.innerHTML = '<span class="num">Question ' + (qi + 1) + "</span><h3>" + esc(q.q) + "</h3>";
        var box = el("div", "opts"), why = el("p", "why", esc(q.why)); why.hidden = true;
        q.o.forEach(function (text, oi) {
          var b = el("button", "opt", esc(text));
          b.addEventListener("click", function () {
            if (d.dataset.done) return; d.dataset.done = 1;
            var ok = oi === q.a; if (ok) score++;
            b.classList.add(ok ? "right" : "wrong"); box.children[q.a].classList.add("right");
            why.hidden = false; done++;
            if (done === items.length) { res.textContent = "You got " + score + " of " + items.length + " right."; foot.hidden = false; }
          });
          box.appendChild(b);
        });
        d.appendChild(box); d.appendChild(why); inner.insertBefore(d, foot);
      });
    }
    again.addEventListener("click", function () { build(); host.scrollTop = 0; });
    inner.appendChild(foot); host.appendChild(inner); build();
  }

  /* ---- start ---- */
  function start(c) {
    cfg = c;
    var root = document.getElementById("kit"), bar = el("div", "tabbar");
    bar.setAttribute("role", "tablist");
    var ids = ORDER.filter(function (id) { return c[id] && (id === "play" ? c.play.mount : c[id].length); });
    ids.forEach(function (id) {
      var p = el("section", "pane " + id); p.id = "pane-" + id; panes[id] = p; root.appendChild(p);
      if (id === "play") c.play.mount(p);
      else if (id === "learn") renderCards(p, c.learn, c.learnLede, "How it works");
      else if (id === "challenge") renderChallenges(p, c.challenge);
      else if (id === "quiz") renderQuiz(p, c.quiz);
      else renderCards(p, c.connect, c.connectLede, "Connect it");
      var t = el("button", "tab", ICON[id] + "<span>" + LABELS[id] + "</span>");
      t.setAttribute("role", "tab"); t.setAttribute("aria-controls", p.id);
      t.addEventListener("click", function () { go(id); });
      tabs[id] = t; bar.appendChild(t);
    });
    root.appendChild(bar);
    if (ids.length < 2) bar.hidden = true; // a lab with one pane needs no tab bar
    go(ids[0]);
  }

  window.LabKit = { start: start, go: go, active: active, onActive: function (fn) { listeners.push(fn); } };
})();
