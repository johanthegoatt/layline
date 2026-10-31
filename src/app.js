// Layline page glue: read the form, run the engine in core.js, draw the two
// orientations, keep the share link in sync, and tell Rollo what's going on.
// All the real work lives in core.js so it can be tested without a browser.
(function () {
  "use strict";
  var L = window.Layline;
  var $ = function (id) { return document.getElementById(id); };

  var ids = ["room-w", "room-l", "room-unit", "material", "roll-width", "roll-unit", "trim", "repeat", "price", "price-unit", "stairs-on", "st-steps", "st-tread", "st-riser", "st-width"];
  var el = {};
  ids.forEach(function (id) { el[id] = $(id); });
  var out = $("out");

  function readState() {
    return {
      rw: el["room-w"].value.trim(), rl: el["room-l"].value.trim(), ru: el["room-unit"].value,
      mat: el.material.value, rwid: el["roll-width"].value.trim(), rwu: el["roll-unit"].value,
      trim: el.trim.value.trim(), rep: el.repeat.value.trim(),
      price: el.price.value.trim(), pu: el["price-unit"].value,
      son: el["stairs-on"].checked, ss: el["st-steps"].value.trim(), st: el["st-tread"].value.trim(),
      sr: el["st-riser"].value.trim(), swd: el["st-width"].value.trim()
    };
  }

  function writeState(s) {
    if (!s) return;
    if (s.rw != null) el["room-w"].value = s.rw;
    if (s.rl != null) el["room-l"].value = s.rl;
    if (s.ru) el["room-unit"].value = s.ru;
    if (s.mat) el.material.value = s.mat;
    if (s.rwid != null) el["roll-width"].value = s.rwid;
    if (s.rwu) el["roll-unit"].value = s.rwu;
    if (s.trim != null) el.trim.value = s.trim;
    if (s.rep != null) el.repeat.value = s.rep;
    if (s.price != null) el.price.value = s.price;
    if (s.pu) el["price-unit"].value = s.pu;
    if (typeof s.son === "boolean") el["stairs-on"].checked = s.son;
    if (s.ss != null) el["st-steps"].value = s.ss;
    if (s.st != null) el["st-tread"].value = s.st;
    if (s.sr != null) el["st-riser"].value = s.sr;
    if (s.swd != null) el["st-width"].value = s.swd;
  }

  function m(mm) { return (Math.round(mm / 10) / 100).toFixed(2) + " m"; }
  function money(n) { return (Math.round(n * 100) / 100).toString(); }

  function optionCard(name, o, isPick, pile) {
    if (!o) return "";
    var tag = isPick ? '<span class="pick-tag">✓ recommended</span>' : "";
    var seamLine = o.seams === 0
      ? '<span class="seam good">One piece, no seam</span>'
      : '<span class="seam warn">' + o.seams + (o.seams === 1 ? " seam" : " seams") + ', last strip ' + m(o.lastStripMm) + ' wide</span>';
    var costLine = o.cost != null ? '<div class="cell"><span class="k">Rough cost</span><span class="v">' + money(o.cost) + '</span></div>' : "";
    return '<div class="opt' + (isPick ? ' pick' : '') + '">' +
      '<div class="opt-h">' + name + tag + '</div>' +
      seamLine +
      '<div class="grid">' +
        '<div class="cell big"><span class="k">Order</span><span class="v">' + o.totalLenM + ' m</span></div>' +
        '<div class="cell"><span class="k">Lengths</span><span class="v">' + o.drops + '</span></div>' +
        '<div class="cell"><span class="k">Each</span><span class="v">' + m(o.dropLenMm) + '</span></div>' +
        costLine +
      '</div>' +
      '<p class="opt-sub">Buys ' + o.areaBoughtM2 + ' m² of the ' + m(o.rollWidthMm) + ' roll — ' + o.wasteM2 + ' m² (' + o.wastePct + '%) trimmed off.</p>' +
      '</div>';
  }

  function render(r) {
    if (!r || !r.ok) {
      out.innerHTML = '<div class="result bad"><h3>Can\'t plan that yet</h3>' +
        '<p class="msg">' + (r && r.reason === "bad-roll" ? "Enter the roll width." : "Fill in the room size and roll width to start.") + '</p></div>';
      return "bad";
    }
    var recName = r.recommend === "lengthwise" ? "Run the length" : "Run the width";
    var otherName = r.recommend === "lengthwise" ? "Run the width" : "Run the length";
    var rec = r.recommend === "lengthwise" ? r.lengthwise : r.widthwise;
    var other = r.recommend === "lengthwise" ? r.widthwise : r.lengthwise;

    var advice = '<ul class="advice">' + r.advice.map(function (a) { return "<li>" + a + "</li>"; }).join("") + "</ul>";

    out.innerHTML =
      '<div class="result">' +
        '<h3>' + r.roomAreaM2 + ' m² floor · ' + m(r.rollWidthMm) + ' roll · ' + (r.seamless ? "no seam needed" : rec.seams + (rec.seams === 1 ? " seam" : " seams")) + '</h3>' +
        '<div class="opts">' +
          optionCard(recName, rec, true, r.pile) +
          optionCard(otherName, other, false, r.pile) +
        '</div>' +
      '</div>' +
      '<div class="result">' +
        '<h3>Laying it</h3>' + advice +
      '</div>';

    return r.seamless ? "seamless" : "seam";
  }

  function recompute() {
    var s = readState();
    var r = L.plan({
      room: { w: s.rw, l: s.rl, unit: s.ru },
      material: s.mat,
      rollWidth: s.rwid, rollUnit: s.rwu,
      trim: s.trim === "" ? 100 : parseFloat(s.trim) * (s.rwu === "ft" ? 304.8 : 10), // trim typed in cm (or inches for ft rolls)
      repeatMm: s.rep === "" ? 0 : parseFloat(s.rep) * 10, // repeat typed in cm
      price: s.price, priceUnit: s.pu
    });
    var kind = render(r);
    renderStairs(s);
    if (window.Rollo && r.ok) window.Rollo.react(kind);
    syncLink(s);
  }

  function renderStairs(s) {
    var fields = $("stairs-fields");
    var host = $("stairs-out");
    var on = el["stairs-on"].checked;
    if (fields) fields.hidden = !on;
    if (!host) return;
    if (!on) { host.innerHTML = ""; return; }
    var r = L.stairs({
      steps: s.ss, tread: { value: s.st, unit: "mm" }, riser: { value: s.sr, unit: "mm" },
      width: { value: s.swd, unit: "mm" }, material: s.mat, rollWidth: s.rwid, rollUnit: s.rwu
    });
    if (!r.ok) {
      host.innerHTML = '<div class="result"><h3>Stairs</h3><p class="msg">Fill in the steps, tread, riser and width to plan the flight.</p></div>';
      return;
    }
    var adv = '<ul class="advice">' + r.advice.map(function (a) { return "<li>" + a + "</li>"; }).join("") + "</ul>";
    host.innerHTML =
      '<div class="result">' +
        '<h3>Stairs · ' + r.steps + ' steps · ' + m(r.widthMm) + ' wide</h3>' +
        '<div class="grid">' +
          '<div class="cell big"><span class="k">Order</span><span class="v">' + r.runM + ' m</span></div>' +
          '<div class="cell"><span class="k">Per step</span><span class="v">' + r.perStepMm + ' mm</span></div>' +
          '<div class="cell"><span class="k">Runs / width</span><span class="v">' + r.runsPerWidth + '</span></div>' +
        '</div>' +
        adv +
      '</div>';
  }

  var linkState = "";
  function syncLink(s) {
    linkState = L.pack(s);
    try { history.replaceState(null, "", "#" + linkState); } catch (e) { /* ignore */ }
  }

  $("share").addEventListener("click", function () {
    var url = location.origin + location.pathname + "#" + linkState;
    var done = $("share-done");
    function ok() { done.textContent = "Link copied"; setTimeout(function () { done.textContent = ""; }, 2500); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, function () { done.textContent = url; });
    else { done.textContent = url; }
  });

  // Offer the usual roll widths for the chosen material.
  function fillWidths() {
    var mat = L.ROLLS[el.material.value] || L.ROLLS.carpet;
    var unit = el["roll-unit"].value;
    var cur = el["roll-width"].value;
    var list = $("width-list");
    list.innerHTML = "";
    mat.widthsMm.forEach(function (w) {
      var v = unit === "ft" ? (w / 304.8) : (w / 1000);
      var o = document.createElement("option");
      o.value = Math.round(v * 100) / 100;
      list.appendChild(o);
    });
    $("roll-note").textContent = mat.note;
    if (cur === "") el["roll-width"].value = Math.round((mat.widthsMm[0] / 1000) * 100) / 100;
  }

  // Tips follow where the eye is.
  ["room-w", "room-l", "room-unit"].forEach(function (id) {
    el[id].addEventListener("focus", function () { if (window.Rollo) window.Rollo.context("room"); });
  });
  ["material", "roll-width", "roll-unit", "repeat", "trim"].forEach(function (id) {
    el[id].addEventListener("focus", function () { if (window.Rollo) window.Rollo.context("roll"); });
  });

  el.material.addEventListener("change", fillWidths);
  el["roll-unit"].addEventListener("change", fillWidths);

  ids.forEach(function (id) {
    el[id].addEventListener("input", recompute);
    el[id].addEventListener("change", recompute);
  });

  // Open on a shared link if there is one, otherwise a sensible starting point.
  var frag = location.hash.replace(/^#/, "");
  var initial = frag ? L.unpack(frag) : null;
  if (initial) { writeState(initial); }
  fillWidths();
  if (initial) recompute();
})();
