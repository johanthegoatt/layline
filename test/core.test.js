"use strict";
const test = require("node:test");
const assert = require("node:assert");
const L = require("../src/core.js");

test("a room that fits inside one roll width lays as a single piece", () => {
  const r = L.plan({ room: { w: 3.4, l: 2.1, unit: "m" }, rollWidth: 4, rollUnit: "m", material: "carpet" });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.seamless, true);
  // Running the drops down the 2.1 m length is one piece and the shorter run.
  assert.strictEqual(r.recommend, "lengthwise");
  assert.strictEqual(r.lengthwise.drops, 1);
  assert.strictEqual(r.lengthwise.seams, 0);
  assert.strictEqual(r.lengthwise.totalLenMm, 2200); // 2.1 m + 0.1 m trim
});

test("turning the roll the other way can remove a seam", () => {
  // 5 m x 4 m on a 4 m roll: drops down the length need a seam, but across
  // the 4 m width is a single piece.
  const r = L.plan({ room: { w: 5, l: 4, unit: "m" }, rollWidth: 4, rollUnit: "m", material: "carpet" });
  assert.strictEqual(r.lengthwise.seams, 1);
  assert.strictEqual(r.widthwise.seams, 0);
  assert.strictEqual(r.recommend, "widthwise");
  assert.strictEqual(r.seamless, true);
  assert.strictEqual(r.widthwise.drops, 1);
  assert.strictEqual(r.widthwise.totalLenMm, 5100);
});

test("when both ways need a seam, the shorter run is recommended", () => {
  const r = L.plan({ room: { w: 6, l: 5, unit: "m" }, rollWidth: 4, rollUnit: "m", material: "carpet" });
  assert.strictEqual(r.seamless, false);
  assert.strictEqual(r.lengthwise.seams, 1);
  assert.strictEqual(r.widthwise.seams, 1);
  assert.strictEqual(r.recommend, "lengthwise");
  assert.strictEqual(r.lengthwise.totalLenMm, 10200); // 2 x (5 m + 0.1 m)
});

test("the last strip width is reported for a seamed plan", () => {
  const r = L.plan({ room: { w: 5, l: 4, unit: "m" }, rollWidth: 4, rollUnit: "m" });
  assert.strictEqual(r.lengthwise.lastStripMm, 1000); // 5 m across minus one 4 m roll
});

test("waste is the roll area bought minus the room area", () => {
  const r = L.plan({ room: { w: 3.4, l: 2.1, unit: "m" }, rollWidth: 4, rollUnit: "m" });
  assert.strictEqual(r.roomAreaM2, 7.14);
  assert.strictEqual(r.lengthwise.areaBoughtM2, 8.8); // 4 m x 2.2 m
  assert.strictEqual(r.lengthwise.wasteM2, 1.66);
  assert.strictEqual(r.lengthwise.wastePct, 23);
});

test("a pattern repeat rounds each drop up to a whole repeat", () => {
  const r = L.plan({ room: { w: 3.4, l: 2.1, unit: "m" }, rollWidth: 4, rollUnit: "m", repeatMm: 500 });
  // 2.1 m + 0.1 m trim = 2.2 m, rounded up to the next 0.5 m repeat = 2.5 m.
  assert.strictEqual(r.lengthwise.dropLenMm, 2500);
  assert.strictEqual(r.lengthwise.patternRounded, true);
});

test("price per running metre costs the recommended run", () => {
  const r = L.plan({ room: { w: 3.4, l: 2.1, unit: "m" }, rollWidth: 4, rollUnit: "m", price: 20, priceUnit: "linm" });
  assert.strictEqual(r.lengthwise.totalLenM, 2.2);
  assert.strictEqual(r.lengthwise.cost, 44); // 2.2 m x 20
});

test("price per square metre costs the area bought", () => {
  const r = L.plan({ room: { w: 3.4, l: 2.1, unit: "m" }, rollWidth: 4, rollUnit: "m", price: 15, priceUnit: "sqm" });
  assert.strictEqual(r.lengthwise.cost, 132); // 8.8 m2 x 15
});

test("roll width accepts feet", () => {
  assert.strictEqual(Math.round(L.toMm(12, "ft")), 3658);
  assert.strictEqual(L.ROLLS["carpet-us"].widthsMm[0], 3658);
});

test("vinyl advice talks about pattern, carpet advice talks about pile", () => {
  const vinyl = L.plan({ room: { w: 3.5, l: 4, unit: "m" }, rollWidth: 3, rollUnit: "m", material: "vinyl" });
  assert.strictEqual(vinyl.pile, false);
  assert.ok(vinyl.advice.join(" ").indexOf("Match the pattern") >= 0);

  const carpet = L.plan({ room: { w: 5, l: 6, unit: "m" }, rollWidth: 4, rollUnit: "m", material: "carpet" });
  assert.strictEqual(carpet.pile, true);
  assert.ok(carpet.advice.join(" ").indexOf("pile matches") >= 0);
});

test("missing or bad sizes fail cleanly", () => {
  assert.strictEqual(L.plan({ room: { w: 0, l: 2, unit: "m" }, rollWidth: 4 }).reason, "bad-room");
  assert.strictEqual(L.plan({ room: { w: 3, l: 2, unit: "m" }, rollWidth: 0 }).reason, "bad-roll");
  assert.strictEqual(L.orient(0, 100, 4000, 100, 0), null);
});

test("the share link round-trips the input", () => {
  const state = { rw: "3.4", rl: "2.1", ru: "m", rwid: "4", mat: "carpet", rep: "0" };
  assert.deepStrictEqual(L.unpack(L.pack(state)), state);
  assert.strictEqual(L.unpack("not valid base64 @@@"), null);
});
