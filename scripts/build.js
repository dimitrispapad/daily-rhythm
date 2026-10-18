// Checks plan.js and writes Daily-Rhythm.ics. Run: node scripts/build.js
const fs = require("fs");
const path = require("path");
const P = require("../plan.js");

const toMin = (hm) => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
const errors = [];
const ids = new Set();
for (const k of P.ORDER) {
  const blocks = P.days[k].blocks;
  blocks.forEach((b, i) => {
    if (ids.has(b.id)) errors.push(`${k}: duplicate id "${b.id}"`);
    ids.add(b.id);
    if (!/^\d\d:\d\d$/.test(b.s) || !/^\d\d:\d\d$/.test(b.e)) errors.push(`${b.id}: times must look like 09:30`);
    if (toMin(b.s) >= toMin(b.e)) errors.push(`${b.id}: ends (${b.e}) before it starts (${b.s})`);
    if (!P.cats[b.cat]) errors.push(`${b.id}: unknown category "${b.cat}"`);
    if (i && toMin(blocks[i - 1].e) > toMin(b.s)) errors.push(`${k}: "${blocks[i - 1].t}" overlaps "${b.t}"`);
  });
  if (!P.meals[k]) errors.push(`${k}: no meals`);
}
if (errors.length) { console.error("Plan has problems:\n- " + errors.join("\n- ")); process.exit(1); }

const ics = P.makeICS();
fs.writeFileSync(path.join(__dirname, "..", "Daily-Rhythm.ics"), ics);
console.log(`Plan OK. Wrote Daily-Rhythm.ics with ${(ics.match(/BEGIN:VEVENT/g) || []).length} events.`);
