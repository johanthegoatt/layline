# Layline

Work out how much carpet, vinyl or lino to buy off the roll, which way to run it, where any seam falls and how much you'll waste. It runs entirely in your browser; nothing you type is uploaded.

Live: https://layline.johanthegoat.xyz

## What it does

- **Which way to run it.** Carpet and sheet vinyl come off a roll of a set width (carpet is usually 4 m or 5 m, vinyl 2 m, 3 m or 4 m), and you pay for the full width even where the room is narrower. Running the roll one way can cover the room in a single piece while turning it the other way leaves a join. Layline tries both, and a seamless option beats a seamed one even at a little more waste, because a seam is the thing people regret.
- **How much to order.** For each way round it gives the number of lengths ("drops"), the length to cut each, the running metres to order, the square metres that buys and how much of that gets trimmed off. Enter a price per running metre or per square metre and it costs both ways.
- **Where the seam lands.** When a join can't be helped it names how many seams, how wide the last strip is, and where to keep the seam: out of the doorway and the walking line, and for carpet, running towards the window so the light falls along it. A pattern repeat makes each length round up to a whole repeat so the pattern lines up across the join, which is where patterned goods waste the most.
- **Share.** The whole input lives in the link, in the part of the URL a browser never sends to a server, so you can send a plan to whoever is buying without anything leaving your device.

## How it's built

Plain HTML, CSS and JavaScript, no framework and no build step. All the arithmetic is in one file, [`src/core.js`](src/core.js), with no reference to the page, so the same code runs in the browser and under the tests. [`src/app.js`](src/app.js) only reads the form, draws the two orientations and keeps the link in sync. Rollo, the roll mascot, lives in [`src/rollo.js`](src/rollo.js): it reacts to the result through a live region, so a screen reader hears its tips too, and it goes quiet under reduced-motion.

```
npm test
```

The engine covers the single-piece case, the orientation flip that removes a seam, the shorter-run choice when both ways seam, waste, pattern-repeat rounding, pricing and unit conversion.

## The numbers behind it

- **Roll widths.** Carpet commonly comes 4 m and 5 m wide (5 m on fewer ranges); sheet vinyl 2 m, 3 m and 4 m; US broadloom 12 ft and 15 ft. Availability varies by range, so the width is editable and the page says to confirm it with the shop.
- **Trim.** A common allowance is about 0.1 m (10 cm) added at each end for trimming to the wall and for rooms that aren't square; the default follows that and is adjustable.
- **Laying.** Carpet pile must run the same way on every length or a flipped piece catches the light and the seam shows; seams are best kept out of high-traffic routes and run towards the light. Sheet vinyl has no pile, so its seam advice rests on matching the pattern and keeping the join out of the walking line.

Planning figures only. Measure the widest points, add for alcoves and the doorway, and check the roll width and coverage with the shop before you order.
