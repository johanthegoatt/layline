// Layline core: planning carpet, vinyl and lino that comes off a roll of a
// fixed width. No DOM in here, so the same file runs in the page and under
// `node --test`.
//
// The problem a plain area calculator misses: these floorings are sold by the
// length off a roll that is a set width (carpet is usually 4 m or 5 m wide,
// sheet vinyl 2 m, 3 m or 4 m). You cannot buy "11 square metres"; you buy a
// length of the full roll width and trim the rest off. So the real questions
// are which way to run the roll, how many lengths ("drops") you need, how many
// running metres to order, where any seam falls, and how much you throw away.
//
// Two orientations are always possible: run the drops along the room's length,
// or along its width. One may need no seam at all while the other does, and the
// cheaper one is not always the one with fewer seams, so Layline works out both
// and says which to use and why. A seam is the thing people regret, so when one
// orientation is a single piece it is preferred even at a little more waste.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Layline = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var IN = 25.4; // mm per inch

  // Everything is held in millimetres inside so room sizes and roll widths can
  // mix units freely.
  var TO_MM = { mm: 1, cm: 10, m: 1000, in: IN, ft: 304.8 };

  function toMm(value, unit) {
    var n = typeof value === "number" ? value : parseFloat(String(value == null ? "" : value).replace(",", "."));
    var k = TO_MM[unit];
    if (!isFinite(n) || !k) return NaN;
    return n * k;
  }

  function round2(x) { return Math.round(x * 100) / 100; }
  function roundTo(x, step) { return Math.round(x / step) * step; }

  // Common roll widths, grouped by material, as a convenience for the page.
  // Widths are the usual stocked sizes; a shop may carry others, so a custom
  // width is always allowed.
  var ROLLS = {
    carpet: { label: "Carpet", widthsMm: [4000, 5000], pile: true,
      note: "Carpet comes in 4 m and 5 m widths (5 m on fewer ranges)." },
    vinyl: { label: "Sheet vinyl / lino", widthsMm: [2000, 3000, 4000], pile: false,
      note: "Sheet vinyl comes in 2 m, 3 m and 4 m widths." },
    "carpet-us": { label: "Carpet (US, feet)", widthsMm: [3658, 4572], pile: true,
      note: "US broadloom comes 12 ft and 15 ft wide." }
  };

  // Plan one orientation: `alongMm` runs down the roll (the drop length) and
  // `acrossMm` is laid across the roll's fixed width.
  //
  //   drops     how many roll-widths sit side by side to cover `across`
  //   dropLen   length to cut each drop: the room run plus a trim allowance;
  //             for a patterned floor every drop is cut to a whole number of
  //             pattern repeats so the pattern lines up across a seam, which is
  //             where patterned goods waste the most
  //   seams     drops minus one, each running the length of the room
  //   lastStrip width of the final (narrowest) strip across the room
  function orient(alongMm, acrossMm, rollMm, trimMm, repeatMm) {
    if (!(alongMm > 0) || !(acrossMm > 0) || !(rollMm > 0)) return null;
    var drops = Math.ceil(acrossMm / rollMm - 1e-9);
    if (drops < 1) drops = 1;
    var dropLen = alongMm + trimMm;
    var repeated = false;
    if (repeatMm > 0) {
      var r = Math.ceil((dropLen - 1e-6) / repeatMm) * repeatMm;
      repeated = r > dropLen + 1e-6 || drops > 1;
      dropLen = r;
    }
    var totalLen = drops * dropLen;
    var lastStrip = acrossMm - (drops - 1) * rollMm;
    var areaBought = (rollMm / 1000) * (totalLen / 1000);
    return {
      drops: drops,
      seams: drops - 1,
      dropLenMm: Math.round(dropLen),
      totalLenMm: Math.round(totalLen),
      totalLenM: round2(totalLen / 1000),
      lastStripMm: Math.round(lastStrip),
      rollWidthMm: rollMm,
      areaBoughtM2: round2(areaBought),
      patternRounded: repeated && repeatMm > 0
    };
  }

  // A full plan for a rectangular room off one roll width.
  //   room:   { w, l, unit }
  //   rollWidth, rollUnit   the roll width (e.g. 4, "m")
  //   trim:   trim allowance per drop in mm (both ends), default 100 (~0.1 m)
  //   repeatMm: pattern repeat in mm, 0 for a plain floor
  //   material: "carpet" | "vinyl", shapes the laying advice
  //   price / priceUnit: optional, "linm" (per running metre of the roll) or
  //            "sqm" (per square metre), to cost the two orientations
  function plan(opts) {
    opts = opts || {};
    var w = toMm(opts.room && opts.room.w, opts.room && opts.room.unit);
    var l = toMm(opts.room && opts.room.l, opts.room && opts.room.unit);
    var rollMm = toMm(opts.rollWidth, opts.rollUnit || "m");
    var trim = isFinite(parseFloat(opts.trim)) ? Math.max(0, parseFloat(opts.trim)) : 100;
    var repeatMm = isFinite(parseFloat(opts.repeatMm)) ? Math.max(0, parseFloat(opts.repeatMm)) : 0;
    var material = ROLLS[opts.material] ? opts.material : "carpet";

    if (!(w > 0) || !(l > 0)) return { ok: false, reason: "bad-room" };
    if (!(rollMm > 0)) return { ok: false, reason: "bad-roll" };

    var roomAreaM2 = round2((w / 1000) * (l / 1000));

    // Orientation A: drops run the length (across = width). B: the other way.
    var lengthwise = orient(l, w, rollMm, trim, repeatMm);
    var widthwise = orient(w, l, rollMm, trim, repeatMm);

    [lengthwise, widthwise].forEach(function (o) {
      if (!o) return;
      o.wasteM2 = round2(o.areaBoughtM2 - roomAreaM2);
      o.wastePct = roomAreaM2 > 0 ? Math.round((o.areaBoughtM2 - roomAreaM2) / roomAreaM2 * 100) : 0;
      var price = parseFloat(opts.price);
      if (isFinite(price) && price > 0) {
        o.cost = round2(opts.priceUnit === "sqm" ? o.areaBoughtM2 * price : o.totalLenM * price);
      } else {
        o.cost = null;
      }
    });

    // Recommend: a single piece (no seam) beats a seamed plan even at more
    // waste, because a seam is what people regret. Otherwise fewer seams, then
    // the cheaper run (less length), then less waste.
    function better(a, b) {
      if (!b) return a;
      if ((a.seams === 0) !== (b.seams === 0)) return a.seams === 0 ? a : b;
      if (a.seams !== b.seams) return a.seams < b.seams ? a : b;
      if (a.totalLenMm !== b.totalLenMm) return a.totalLenMm < b.totalLenMm ? a : b;
      return a.areaBoughtM2 <= b.areaBoughtM2 ? a : b;
    }
    var rec = better(lengthwise, widthwise) === lengthwise ? "lengthwise" : "widthwise";
    var best = rec === "lengthwise" ? lengthwise : widthwise;
    var other = rec === "lengthwise" ? widthwise : lengthwise;

    return {
      ok: true,
      roomAreaM2: roomAreaM2,
      rollWidthMm: Math.round(rollMm),
      material: material,
      pile: ROLLS[material].pile,
      trimMm: Math.round(trim),
      repeatMm: Math.round(repeatMm),
      lengthwise: lengthwise,
      widthwise: widthwise,
      recommend: rec,
      seamless: best.seams === 0,
      advice: advise(material, best, other, rec)
    };
  }

  // The laying advice, which is the useful part on top of the numbers.
  function advise(material, best, other, rec) {
    var tips = [];
    var dir = rec === "lengthwise" ? "length" : "width";
    if (best.seams === 0) {
      tips.push("Run the roll the " + dir + " way of the room and it lays as one piece, with no seam.");
    } else {
      tips.push("This needs " + best.seams + (best.seams === 1 ? " seam" : " seams") +
        ", running the " + dir + " of the room. The last strip is " + (best.lastStripMm / 1000).toFixed(2) + " m wide.");
      if (other && other.seams < best.seams) {
        tips.push("Turning the roll the other way drops to " + other.seams +
          (other.seams === 1 ? " seam" : " seams") + " but orders " + other.totalLenM +
          " m instead of " + best.totalLenM + " m. Fewer seams usually wins.");
      }
    }
    if (material === "carpet" || material === "carpet-us") {
      tips.push("Lay every length the same way round so the pile matches; a flipped piece catches the light and the seam shows.");
      if (best.seams > 0) tips.push("Keep the seam out of the doorway and the main walking line, and run it towards the window so the light falls along it, not across it.");
    } else {
      tips.push("Match the pattern across any seam and keep the seam out of the main walking line. Let the sheet relax flat before you trim and stick it.");
    }
    if (best.patternRounded) {
      tips.push("Each length is cut to a whole pattern repeat so the pattern lines up, which is where a patterned floor wastes the most.");
    }
    tips.push("Planning figures only. Measure the widest points, add for alcoves and the doorway, and ask the shop to confirm the roll width before you order.");
    return tips;
  }

  // Stairs are the part people get wrong. A straight flight is carpeted with
  // one continuous strip running down the stairs, and each step takes the tread
  // (the bit you walk on) plus the riser (the upright) plus a little to wrap
  // over the nosing (the lip at the front). So the strip length is
  // (tread + riser + nosing) per step, times the steps, plus any landing and a
  // trim allowance. The strip is cut at the stair width off the roll, and the
  // pile must run DOWN the stairs so it wears and shades the same on every step.
  //
  //   steps      number of steps in the flight
  //   tread      { value, unit }  the depth you walk on
  //   riser      { value, unit }  the upright height
  //   width      { value, unit }  the width to carpet (full stair or a runner)
  //   nosingMm   wrap over the front lip per step, default 25 mm
  //   landingMm  extra strip for a landing at the top, default 0
  //   trim       trim allowance on the whole strip, default 100 mm
  //   rollWidth/rollUnit  the roll width, to say how many runs fit side by side
  //   price/priceUnit     optional, per running metre ("linm") or per m2 ("sqm")
  function stairs(opts) {
    opts = opts || {};
    var steps = parseInt(opts.steps, 10);
    var tread = toMm(opts.tread && opts.tread.value, opts.tread && opts.tread.unit);
    var riser = toMm(opts.riser && opts.riser.value, opts.riser && opts.riser.unit);
    var width = toMm(opts.width && opts.width.value, opts.width && opts.width.unit);
    var rollMm = toMm(opts.rollWidth, opts.rollUnit || "m");
    var nosing = isFinite(parseFloat(opts.nosingMm)) ? Math.max(0, parseFloat(opts.nosingMm)) : 25;
    var landing = isFinite(parseFloat(opts.landingMm)) ? Math.max(0, parseFloat(opts.landingMm)) : 0;
    var trim = isFinite(parseFloat(opts.trim)) ? Math.max(0, parseFloat(opts.trim)) : 100;
    var material = ROLLS[opts.material] ? opts.material : "carpet";

    if (!(steps > 0)) return { ok: false, reason: "bad-steps" };
    if (!(tread > 0) || !(riser > 0)) return { ok: false, reason: "bad-step" };
    if (!(width > 0)) return { ok: false, reason: "bad-width" };

    var perStepMm = tread + riser + nosing;
    var runMm = steps * perStepMm + landing + trim;
    var runM = round2(runMm / 1000);
    var areaUsedM2 = round2((width / 1000) * (runMm / 1000));

    // How many stair-width runs you can cut side by side out of one roll width,
    // so a couple of flights share a length instead of buying it twice. A stair
    // wider than the roll needs a join, which is best avoided on stairs.
    var runsPerWidth = rollMm > 0 ? Math.max(1, Math.floor(rollMm / width + 1e-9)) : 1;
    var tooWide = rollMm > 0 && width > rollMm;

    var out = {
      ok: true,
      steps: steps,
      perStepMm: Math.round(perStepMm),
      nosingMm: Math.round(nosing),
      widthMm: Math.round(width),
      landingMm: Math.round(landing),
      trimMm: Math.round(trim),
      runMm: Math.round(runMm),
      runM: runM,
      areaUsedM2: areaUsedM2,
      rollWidthMm: rollMm > 0 ? Math.round(rollMm) : null,
      runsPerWidth: runsPerWidth,
      tooWide: tooWide,
      pile: ROLLS[material].pile
    };

    var price = parseFloat(opts.price);
    out.cost = isFinite(price) && price > 0
      ? round2(opts.priceUnit === "sqm" ? areaUsedM2 * price : runM * price)
      : null;

    var tips = [];
    tips.push("Order " + runM + " m off the roll, cut " + (width / 1000).toFixed(2) + " m wide: " + steps +
      " steps at " + Math.round(perStepMm) + " mm each (tread + riser + nosing)" +
      (landing > 0 ? ", plus the landing" : "") + ".");
    tips.push("Measure every tread and riser; stairs are rarely identical, and averaging them leaves you short. Add the deepest step up if they vary.");
    if (out.pile) tips.push("Run the pile down the stairs so every step wears and shades the same way.");
    if (tooWide) tips.push("The stair is wider than the roll, so a full-width stair would need a join. A stair runner or a wider roll avoids it.");
    else if (runsPerWidth > 1) tips.push("You can cut " + runsPerWidth + " runs side by side from one roll width, so " + runsPerWidth + " flights of this width share the same length.");
    tips.push("Planning figures. Fit it as one strip with no seam on the stairs, and keep the pattern, if any, running true down the flight.");
    out.advice = tips;
    return out;
  }

  // The whole input goes in the URL fragment, which a browser never sends to a
  // server, so a shared link reopens on the same plan without anything leaving
  // the device.
  function pack(state) {
    var json = JSON.stringify(state);
    var b64 = typeof btoa === "function" ? btoa(unescape(encodeURIComponent(json))) : Buffer.from(json, "utf8").toString("base64");
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function unpack(text) {
    try {
      var b64 = String(text).replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      var json = typeof atob === "function" ? decodeURIComponent(escape(atob(b64))) : Buffer.from(b64, "base64").toString("utf8");
      var o = JSON.parse(json);
      return o && typeof o === "object" ? o : null;
    } catch (e) { return null; }
  }

  return {
    IN: IN, TO_MM: TO_MM, ROLLS: ROLLS,
    toMm: toMm, roundTo: roundTo,
    orient: orient, plan: plan, advise: advise, stairs: stairs,
    pack: pack, unpack: unpack
  };
});
