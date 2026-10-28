// Rollo, the roll of flooring who helps you plan the job. Rollo offers a tip
// when tapped, grins when it lays as one piece, looks careful when there's a
// seam or a lot of waste, and unrolls a little if you tap five times fast.
// Everything Rollo says goes through the bubble's live region, so a screen
// reader hears it too. Moods are driven by the app, never on a timer of its
// own.
(function () {
  "use strict";
  var btn = document.getElementById("rollo");
  var bubble = document.getElementById("rollo-bubble");
  var dock = document.getElementById("rollo-dock");
  var hide = document.getElementById("rollo-hide");
  if (!btn) { window.Rollo = { react: function () {}, context: function () {}, say: function () {} }; return; }

  var still = matchMedia("(prefers-reduced-motion: reduce)");
  var baseMood = "calm", tipKey = "start";
  var bubbleTimer = null, flashTimer = null, taps = [], tipAt = {};

  var TIPS = {
    start: [
      "Hi, I'm Rollo! Tell me the room size and your roll width and I'll plan the lengths.",
      "Measure the widest and longest points. Walls are never perfectly square.",
      "Carpet is usually 4 or 5 metres wide; sheet vinyl 2, 3 or 4. Check the roll before you buy."
    ],
    room: [
      "Round the room up a touch. A floor that's a shade long trims off; one that's short can't stretch.",
      "Alcoves, bay windows and the bit into the doorway all need covering. Add for them.",
      "One number is the width, the other the length. I'll try the roll both ways round for you."
    ],
    roll: [
      "A wider roll can mean no seam at all. It's worth asking what widths the shop stocks.",
      "A patterned floor wastes more, because each length is cut to a whole pattern repeat.",
      "Buy it all from one roll and one batch, so the colour and pile match across the room."
    ],
    result: [
      "A single piece with no seam is the dream. I'll always point you at it if it's there.",
      "Seams run the length of the room. Keep them out of the doorway and the main path.",
      "These are planning numbers. Ask the shop to cut a little long, and let vinyl relax flat before trimming."
    ]
  };

  function setMood(m) { btn.setAttribute("data-mood", m); }

  function say(text, ms) {
    if (dock.classList.contains("tucked")) return;
    bubble.textContent = text;
    bubble.classList.remove("pop"); void bubble.offsetWidth; bubble.classList.add("pop");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bubble.textContent = ""; }, ms || 7000);
  }

  function flash(m, ms) {
    setMood(m);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { setMood(baseMood); }, ms || 1500);
  }

  // Cycle the tips for wherever the user is, so tapping again says something
  // new rather than repeating the same line.
  function tip() {
    var list = TIPS[tipKey] || TIPS.start;
    var i = tipAt[tipKey] || 0;
    say(list[i % list.length]);
    tipAt[tipKey] = i + 1;
  }

  function unroll() {
    if (still.matches) return;
    var rect = btn.getBoundingClientRect();
    for (var i = 0; i < 5; i++) {
      (function (n) {
        var s = document.createElement("span");
        s.className = "mat-fly";
        s.style.left = (rect.left + 20) + "px";
        s.style.top = (rect.top + 14) + "px";
        s.style.setProperty("--dx", (Math.random() * 150 - 75) + "px");
        s.style.setProperty("--dy", (-50 - Math.random() * 80) + "px");
        s.style.setProperty("--dr", (Math.random() * 400 - 200) + "deg");
        s.style.animationDelay = (n * 0.05) + "s";
        document.body.appendChild(s);
        setTimeout(function () { s.remove(); }, 1200);
      })(i);
    }
  }

  btn.addEventListener("click", function () {
    var now = Date.now();
    taps = taps.filter(function (t) { return now - t < 900; });
    taps.push(now);
    if (taps.length >= 5) { taps = []; unroll(); say("Whee! Right, rolling back up. Where were we?"); flash("happy"); return; }
    tip();
    flash("think", 900);
  });

  hide.addEventListener("click", function () {
    var tucked = dock.classList.toggle("tucked");
    hide.textContent = tucked ? "" : "tuck away";
    if (!tucked) { say("Back! Tap me any time for a tip."); }
  });

  // Eyes track the pointer a little, so Rollo feels awake. Cheap, eyes only.
  if (!still.matches) {
    document.addEventListener("pointermove", function (e) {
      var r = btn.getBoundingClientRect();
      var dx = Math.max(-2, Math.min(2, (e.clientX - (r.left + r.width / 2)) / 60));
      btn.querySelector(".rollo-face").style.transform = "translateX(" + dx + "px)";
    }, { passive: true });
  }

  // Public hooks the page calls.
  window.Rollo = {
    // Where the user is, so the next tip fits: "room", "roll" or "start".
    context: function (key) { tipKey = TIPS[key] ? key : "start"; baseMood = "calm"; setMood(baseMood); },
    // React to a result: "seamless" (one piece), "seam" (a join), "bad".
    react: function (kind) {
      tipKey = "result";
      if (kind === "seamless") { flash("happy"); say("Lovely. That lays as one piece, no seam at all."); }
      else if (kind === "seam") { flash("warn"); say("This one needs a seam. I've put it the way that keeps the run shortest."); }
      else if (kind === "bad") { flash("think"); say("I couldn't read those sizes. Check the numbers and units?"); }
    },
    say: say
  };

  setTimeout(function () { if (!dock.classList.contains("tucked")) say(TIPS.start[0]); }, 900);
})();
