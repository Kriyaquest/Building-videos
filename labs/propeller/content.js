/* Propeller car lab: all visible text for Learn / Challenge / Quiz.
   Draft for KriyaQuest review. Physics numbers in the lab are approximate (not measured on the real kit). */
window.LAB_CONTENT = {
  learnLede: "Five ideas explain everything the car does.",
  learn: [
    { tag: "Newton's third law", title: "Push back, move forward",
      body: "The spinning propeller pushes air backward. The air pushes back on the propeller with an equal force in the opposite direction, and that push moves the whole car forward. This push is called thrust." },
    { tag: "Forces", title: "Thrust fights friction",
      body: "Thrust pushes the car forward. Friction in the wheels and air drag push against it. The car speeds up only while thrust is bigger than those two together. If thrust is smaller than the friction gripping the wheels, the propeller spins but the car stays put." },
    { tag: "Newton's second law", title: "a = F ÷ m",
      body: "Acceleration is the net force divided by the mass. With the same push, a car with half the mass speeds up twice as fast. That is why the Mini car out-accelerates the Big car in the lab." },
    { tag: "Circuits", title: "The loop must be complete",
      body: "Current only flows round a closed loop: battery, motor and back to the battery. One open joint anywhere and the motor stops. Swapping the motor's two wires makes current flow the other way, so the motor spins in reverse." },
    { tag: "The motor", title: "A 5 V motor on a 9 V battery",
      body: "The kit runs a 5 V motor from a 9 V battery. That makes it spin faster than its rating, which gives more thrust but also more heat. In the lab the motor temperature tile shows this. On the real kit, do not leave the motor running for long." }
  ],
  challenge: [
    { title: "Big car or Mini car?",
      ask: "Which car reaches the 10 m finish line first, the Big car or the Mini car?",
      tryIt: "Run the Big car, then switch to Mini and run again. The first run stays on the graph as a dashed line so you can compare.",
      setup: { car: "big" },
      reveal: "The lighter Mini car wins. The propeller pushes with about the same force on both cars, but a = F ÷ m, so less mass means more acceleration." },
    { title: "Spinning but stuck",
      ask: "Can you make the propeller spin at full speed while the car does not move at all?",
      tryIt: "Try a heavier car (use the weight box) and a rougher floor (the wheel friction slider).",
      setup: { car: "custom", m: 300, mu: 0.1 },
      reveal: "Yes. When thrust is smaller than the friction gripping the wheels, the forces balance and the car stays still. More weight and a rougher floor both increase that friction." },
    { title: "More voltage",
      ask: "If you raise the battery from 9 V to 12 V, what changes? What else besides speed?",
      tryIt: "Set the battery to 12 V, run, and watch the speed and the motor temperature tile.",
      setup: { car: "big", V: 12 },
      reveal: "The motor spins faster, so thrust rises and the car goes faster. The motor also runs hotter, which is why a motor has a voltage rating." },
    { title: "Break the circuit",
      ask: "What happens if just one joint in the wiring is open?",
      tryIt: "Open the black wire joint in the wiring panel and press Run.",
      setup: { car: "big", wiring: { blacks: false } },
      reveal: "Nothing moves. The loop is broken, so no current flows. Every joint matters. Now try the swap-wires box to see the motor spin the other way." }
  ],
  quiz: [
    { q: "The propeller pushes air backward. What pushes the car forward?",
      o: ["Gravity", "The air pushing back on the propeller", "The wheels pushing the ground", "The battery"], a: 1,
      why: "Every force has an equal and opposite force (Newton's third law). The air pushes back on the propeller, and the car is attached to it." },
    { q: "The propeller spins but the car does not move. What is the most likely reason?",
      o: ["The battery is too strong", "The wheels are too big", "Thrust is smaller than the friction gripping the wheels", "The air is too light"], a: 2,
      why: "The car only starts when thrust beats the friction on the wheels. A heavier car or a rougher floor increases that friction." },
    { q: "Two cars get the same push. One has half the mass. Which accelerates more?",
      o: ["The heavier car", "The lighter car, twice as much", "Both the same", "The lighter car, half as much"], a: 1,
      why: "a = F ÷ m. Halving the mass doubles the acceleration for the same net force." },
    { q: "Why does the motor stop if one wire joint is open?",
      o: ["The battery runs out", "The propeller falls off", "Current needs a complete loop to flow", "Open joints make the car heavier"], a: 2,
      why: "Current flows only round a closed loop. A single gap stops it everywhere in the circuit." },
    { q: "A 5 V motor runs on a 9 V battery. Compared with its rating, the motor will…",
      o: ["Spin slower", "Spin faster and get hotter", "Not spin at all", "Spin the same"], a: 1,
      why: "More voltage than the rating makes it spin faster, giving more thrust, but it also heats up more." }
  ]
};
