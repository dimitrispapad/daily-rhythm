// ================= NUTRITION actions =================
function saveNutDay(date, st) { const b = { water: st.water, log: st.log.map((e) => Object.assign({}, e)) }; if (st.plan) b.plan = st.plan; if (st.gym != null) b.gym = st.gym; if (st.feel && st.feel.length) b.feel = st.feel; upsert("nutri", date, b); }
// Calories burned in a session. A rough rule first (MET × kg × hours); the AI button refines it.
function burnFormula(g) { const ws = NLOG().weights || [], kg = ws.length ? num(ws[ws.length - 1].kg) : 80, base = { Weights: 4.5, Cardio: 7.5, "Mobility / yoga": 2.8, Sport: 7 }[g.type] || 4.5, met = base * (0.75 + 0.1 * (num(g.effort) || 3)); return Math.round((met * kg * num(g.mins)) / 60 / 5) * 5; }
async function burnAI(date) {
  const g = Object.assign({}, gymDays()[date]), P = meta("gymPlan"), ws = NLOG().weights || [], kg = ws.length ? ws[ws.length - 1].kg : null;
  const ex = P.days && g.pday != null && P.days[g.pday] ? P.days[g.pday].groups.flatMap((gr, gi) => gr.ex.map((e, i) => ((g.done || []).includes(`d${g.pday}-${gi}-${i}`) ? `${e.n} ${e.sets}x${e.reps}${g.kg && g.kg[`d${g.pday}-${gi}-${i}`] != null ? " @ " + g.kg[`d${g.pday}-${gi}-${i}`] + " kg" : ""}` : "")).filter(Boolean)) : [];
  UI.burnBusy = true; renderAll();
  try {
    const r = await CAP.sample.json(`Estimate the active calories burned in this workout (not including resting metabolism). Be realistic: resistance training burns less than people think. Reply with only JSON: {"kcal": number, "note": "one short sentence in Greek on what the estimate is based on"}.
Body weight: ${kg ? kg + " kg" : "unknown, assume 80 kg"}. Type: ${g.type}. Duration: ${num(g.mins)} minutes. Effort: ${num(g.effort) || "?"}/5 (rest between sets about 60 seconds). ${ex.length ? "Exercises done: " + ex.join("; ") + "." : ""} ${g.note ? "Notes: " + g.note : ""}`, { cache: false });
    const k = Math.round(num(r && r.kcal) / 5) * 5; if (!(k > 0 && k < 3000)) throw { code: "invalid_json" };
    g.burn = { kcal: k, src: "ai", note: r.note ? String(r.note).slice(0, 200) : "" }; setGym(date, g); toast(`≈${k} kcal`);
  } catch (e) { toast(sampleErr(e)); }
  UI.burnBusy = false; renderAll();
}
function diaryStateFor(date) { return (UI.diary[date] = UI.diary[date] || {}); }
async function estimateFood(date, text) {
  const D = diaryStateFor(date);
  D.loading = true; D.err = ""; D.items = null; D.manual = false; D.editId = null; renderAll();
  const done = (o) => { Object.assign(D, { loading: false }, o); renderAll(); };
  // 1. a food I already logged: same numbers, no AI needed
  const mem = memFind(text);
  if (mem) return done({ items: (mem.e.items && mem.e.items.length ? mem.e.items : [{ name: mem.e.name, amount: "", kcal: mem.e.kcal, protein: mem.e.p, carbs: mem.e.c, fat: mem.e.f }]).map((x) => Object.assign({}, x, { src: "mem" })), note: ["From my foods: the same numbers as last time."] });
  // 2. the AI reads the text: which foods, how many grams, its own estimate, and the name to look up in USDA
  let items = null, note = "", aiErr = "";
  if (CAP.sample) {
    try {
      const r = await CAP.sample.json(`Estimate the calories and macronutrients of what I ate. I live in Greece: when an amount is missing, assume a typical Greek/European portion; weights are cooked unless I say otherwise. Be realistic, not optimistic.
Reply with only JSON: {"items": [{"name": "food in the language I wrote", "amount": "the portion you assumed", "grams": edible weight in grams as a number, "en": "the closest generic food as USDA FoodData Central names it, in English, e.g. 'egg, whole, boiled' or 'bread, whole-wheat'; for a mixed dish the dish name", "kcal": number, "protein": grams, "carbs": grams, "fat": grams}], "note": "one short sentence on what is most uncertain, or null"}.
Round kcal to the nearest 5 and grams to whole numbers. One item per food.
What I ate: ${text}`, { cache: false });
      items = (r && Array.isArray(r.items) ? r.items : []).filter((x) => x && x.name).slice(0, 25).map((x) => ({
        name: String(x.name).slice(0, 120), amount: x.amount ? String(x.amount).slice(0, 60) : "", grams: Math.min(3000, Math.max(0, num(x.grams))), en: x.en ? String(x.en).slice(0, 80) : "",
        kcal: Math.min(5000, Math.max(0, num(x.kcal))), protein: Math.min(400, Math.max(0, num(x.protein))), carbs: Math.min(800, Math.max(0, num(x.carbs))), fat: Math.min(400, Math.max(0, num(x.fat))), src: "ai"
      }));
      if (!items.length) throw { code: "invalid_json" };
      note = r.note ? String(r.note).slice(0, 240) : "";
    } catch (e) { if (e && e.code === "cancelled") return done({}); items = null; aiErr = sampleErr(e); }
  }
  // 3. no AI: read the text with the built-in food list and typical portions
  const notes = note ? [note] : [];
  if (!items && USDA_ON()) { items = parseFoodText(text); notes.push("Worked out without AI, from typical portions and the USDA database. Check the amounts."); }
  const self = "You can also enter the numbers yourself.";
  if (!items || !items.length) return done({ err: [aiErr || "Could not work this out.", self] });
  // 4. USDA values per 100 g replace the guess wherever the database has the food
  let dbErr = "";
  if (USDA_ON()) { try { dbErr = await applyUSDA(items); } catch (_) { dbErr = "upstream_error"; } }
  if (dbErr) notes.push(dbErr === "rate_limited" ? "The USDA database reached its hourly limit: add your own free FDC_API_KEY in Netlify." : "The USDA database did not answer for some foods.");
  if (!items.some((x) => num(x.kcal) > 0)) return done({ err: [aiErr, dbErr ? "The USDA database did not answer." : "I could not recognise these foods without AI.", self].filter(Boolean) });
  if (aiErr) notes.unshift(aiErr);
  done({ items, note: notes });
}
function addEntry(date, entry) {
  const st = nutState(date);
  if (entry.slot >= 0) st.log = st.log.filter((e) => !(e.src === "plan" && +e.slot === +entry.slot)); // a swap replaces the planned meal
  st.log.push(entry); saveNutDay(date, st);
  const t = nutTotals(date);
  toast(`Saved. ${r5(t.kcal)} kcal and ${g0(t.eaten)} g protein so far.`);
}
function setGym(date, val) { const g = Object.assign({}, GLOG()), days = Object.assign({}, g.days || {}); if (val) days[date] = val; else delete days[date]; g.days = days; upsert("meta", "gymLog", g); }
Object.assign(ACT, {
  gymDay: (d) => { UI.gymDay = d.d; UI.gymP = null; },
  dayKind: (d) => { const st = nutState(d.d); st.plan = d.val; saveNutDay(d.d, st); },
  dayGym: (d) => { const st = nutState(d.d); st.gym = +d.val; saveNutDay(d.d, st); },
  feelSet: (d) => { UI.feel = Object.assign({}, UI.feel, { [d.k]: (UI.feel || {})[d.k] === +d.val ? 0 : +d.val, note: (document.getElementById("feel-note") || {}).value || (UI.feel || {}).note || "" }); },
  feelSave: (d) => { const F = Object.assign({}, UI.feel, { note: ((document.getElementById("feel-note") || {}).value || "").trim().slice(0, 500) }); if (!FEEL.some(([k]) => F[k]) && !F.note) { toast("Pick at least one number or write a line"); return; } const st = nutState(d.d); st.feel.push(Object.assign({ id: uid(), at: nowHM() }, F)); saveNutDay(d.d, st); UI.feel = {}; toast("Saved"); },
  feelDel: (d) => { const st = nutState(d.d); st.feel = st.feel.filter((f) => f.id !== d.id); const b = { water: st.water, log: st.log }; if (st.plan) b.plan = st.plan; if (st.gym != null) b.gym = st.gym; b.feel = st.feel; upsert("nutri", d.d, b); },
  quickAdd: (d) => { const x = favourites(500).find((y) => y.k === d.k); if (!x) return; const D = diaryStateFor(d.d), e = Object.assign({}, x.e, { id: uid(), at: d.d === today() ? nowHM() : "", slot: D.slot != null ? +D.slot : -1, src: "log" }); addEntry(d.d, e); },
  burnAI: (d) => { burnAI(d.d); },
  gymP: (d) => { UI.gymP = +d.i; },
  gymEx: (d) => { const cur = Object.assign({ type: "Weights" }, gymDays()[d.d] || {}), done = cur.done || []; cur.done = done.includes(d.k) ? done.filter((x) => x !== d.k) : done.concat([d.k]); cur.pday = +d.p; setGym(d.d, cur); },
  gymDel: (d) => { setGym(d.d, null); toast("Removed"); },
  sections: () => { lsSet("praxis-all", FOCUSED ? "1" : "0"); location.hash = ""; location.reload(); },
  nutMeal: (d) => {
    const st = nutState(d.d), i = +d.i, t = nutTotals(d.d), m = t && t.meals[i]; if (!m) return;
    const on = st.log.some((e) => e.src === "plan" && +e.slot === i);
    st.log = on ? st.log.filter((e) => !(e.src === "plan" && +e.slot === i)) : st.log.concat([planEntry(m, i, d.d === today() ? nowHM() : "")]);
    saveNutDay(d.d, st);
    if (!on) { const nt = nutTotals(d.d); toast(`Logged. ${r5(nt.kcal)} kcal and ${g0(nt.eaten)} g protein so far.`); }
  },
  water: (d) => { const st = nutState(d.d), n = +d.n; st.water = st.water === n ? n - 1 : n; saveNutDay(d.d, st); if (n === glasses() && st.water === n) toast("2.5 L done. Well hydrated."); },
  foodDay: (d) => { UI.foodDay = d.val; },
  logDay: (d) => { UI.logDay = UI.logDay === d.d ? null : d.d; },
  shopClear: () => { const log = Object.assign({}, NLOG()); log.shop = {}; upsert("meta", "nutritionLog", log); },
  diarySlot: (d) => { const D = diaryStateFor(d.d); D.slot = +d.i; setTimeout(() => { const el = document.getElementById("diary-text-" + d.d); if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); el.focus({ preventScroll: true }); } }, 30); },
  diaryCancel: (d) => { UI.diary[d.d] = { slot: diaryStateFor(d.d).slot }; },
  diarySave: (d) => {
    const D = diaryStateFor(d.d); if (!D.items) return;
    const sum = (k) => D.items.reduce((s, x) => s + num(x[k]), 0);
    const vals = { name: D.text, items: D.items, kcal: sum("kcal"), p: sum("protein"), c: sum("carbs"), f: sum("fat") };
    if (D.editId) { const st = nutState(d.d), i = st.log.findIndex((e) => e.id === D.editId); if (i >= 0) { st.log[i] = Object.assign({}, st.log[i], vals); saveNutDay(d.d, st); toast("Corrected"); } }
    else addEntry(d.d, Object.assign({ id: uid(), at: D.at || nowHM(), slot: D.slot != null ? +D.slot : -1, src: "log" }, vals));
    UI.diary[d.d] = {};
  },
  diarySaveManual: (d) => {
    const D = diaryStateFor(d.d), m = D.m || {};
    if (!num(m.kcal) && !num(m.p)) { D.err = "Type at least the calories or the protein."; return; }
    addEntry(d.d, { id: uid(), at: D.at || nowHM(), slot: D.slot != null ? +D.slot : -1, name: D.text, kcal: num(m.kcal), p: num(m.p), c: num(m.c), f: num(m.f), src: "log" });
    UI.diary[d.d] = {};
  },
  // correct an entry I saved wrong: the same table, filled with what was saved
  diaryEdit: (d) => { const e = nutState(d.d).log.find((x) => x.id === d.id); if (!e) return; UI.diary[d.d] = { slot: e.slot, at: e.at, text: e.name, editId: e.id, note: "", items: (e.items && e.items.length ? e.items : [{ name: e.name, amount: "", kcal: e.kcal, protein: e.p, carbs: e.c, fat: e.f }]).map((x) => Object.assign({}, x)) }; setTimeout(() => { const el = document.querySelector("#diary-" + d.d + " .review"); if (el) el.scrollIntoView({ block: "center", behavior: "smooth" }); }, 30); },
  // ★ keep a food at the front of "My foods"; × there forgets it (the diary itself is not touched)
  favPin: (d) => { const e = nutState(d.d).log.find((x) => x.id === d.id); if (!e) return; const k = fkey(e.name), M = FMEM(), pins = (M.pins || []).filter((p) => fkey(p.name) !== k), was = pins.length !== (M.pins || []).length; if (!was) pins.push({ name: e.name, kcal: e.kcal, p: e.p, c: e.c, f: e.f, items: e.items || [] }); saveMem(pins, (M.hide || []).filter((h) => h !== k)); toast(was ? "No longer pinned" : "Remembered in My foods"); },
  favDel: (d) => { const M = FMEM(); saveMem((M.pins || []).filter((p) => fkey(p.name) !== d.k), (M.hide || []).filter((h) => h !== d.k).concat([d.k])); toast("Forgotten"); },
  diaryDel: (d) => { const st = nutState(d.d); st.log = st.log.filter((e) => e.id !== d.id); saveNutDay(d.d, st); toast("Removed"); }
});
document.addEventListener("change", (e) => {
  const t = e.target, ds = t.dataset || {};
  if (ds.shop !== undefined) {
    const log = Object.assign({}, NLOG()); log.shop = Object.assign({}, log.shop || {});
    if (t.checked) log.shop[ds.shop] = true; else delete log.shop[ds.shop];
    upsert("meta", "nutritionLog", log); renderAll(); return;
  }
  if (ds.kg !== undefined) { // kilos for one exercise: saved on the day and remembered for next time
    const g = Object.assign({}, GLOG()), days = Object.assign({}, g.days || {}), cur = Object.assign({ type: "Weights" }, days[ds.d] || {}), v = t.value === "" ? null : Math.min(500, Math.max(0, num(t.value)));
    cur.kg = Object.assign({}, cur.kg || {}); g.last = Object.assign({}, g.last || {});
    if (v == null) delete cur.kg[ds.kg]; else { cur.kg[ds.kg] = v; g.last[ds.kg] = v; }
    cur.pday = +ds.p; days[ds.d] = cur; g.days = days; upsert("meta", "gymLog", g); return;
  }
  if (t.id && t.id.startsWith("diary-slot-")) diaryStateFor(t.id.slice(11)).slot = +t.value;
});
document.addEventListener("input", (e) => {
  const t = e.target, ds = t.dataset || {};
  if (ds.dz !== undefined) {
    const D = diaryStateFor(ds.date); if (!D.items || !D.items[+ds.dz]) return;
    D.items[+ds.dz][ds.dk] = num(t.value);
    const sum = (k) => D.items.reduce((s, x) => s + num(x[k]), 0);
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.innerHTML = v; };
    set(`dzt-kcal-${ds.date}`, `<b>${r5(sum("kcal"))}</b>`); set(`dzt-p-${ds.date}`, `<b>${g0(sum("protein"))}</b>`); set(`dzt-c-${ds.date}`, g0(sum("carbs"))); set(`dzt-f-${ds.date}`, g0(sum("fat")));
  }
  if (ds.dm !== undefined) { const D = diaryStateFor(ds.date); D.m = Object.assign({}, D.m, { [ds.dm]: t.value }); }
});
document.addEventListener("submit", (e) => {
  const f = e.target; if (!f.dataset) return;
  if (f.dataset.form === "diary") {
    e.preventDefault(); e.stopImmediatePropagation();
    const date = f.dataset.d, text = String(f.elements.t.value || "").trim(), D = diaryStateFor(date);
    D.slot = +f.elements.slot.value; D.at = f.elements.at.value || nowHM();
    if (!text) { D.err = "Write what you ate first."; renderAll(); return; }
    D.text = text.slice(0, 400); D.err = "";
    const how = e.submitter && e.submitter.value;
    if (how === "ai" && (CAP.sample || USDA_ON())) { f.reset(); estimateFood(date, D.text); }
    else { D.manual = true; D.items = null; D.m = {}; f.reset(); renderAll(); }
    return;
  }
  if (f.dataset.form === "gym") {
    e.preventDefault(); e.stopImmediatePropagation();
    const mins = Math.min(600, Math.max(0, num(f.elements.mins.value)));
    const g = Object.assign({}, gymDays()[f.dataset.d] || {}, { type: f.elements.type.value, mins, effort: num(f.elements.effort.value), time: f.elements.time.value || "", note: String(f.elements.note.value || "").trim().slice(0, 600) });
    if (g.pday == null && gymOf(f.dataset.d) >= 0) g.pday = gymOf(f.dataset.d);
    if (mins && !(g.burn && g.burn.src === "ai")) g.burn = { kcal: burnFormula(g), src: "formula" };
    setGym(f.dataset.d, g);
    toast("Session logged"); renderAll(); return;
  }
  if (f.dataset.form !== "weight") return;
  e.preventDefault(); e.stopImmediatePropagation();
  const kg = num(f.elements.kg.value), d = f.elements.d.value || today();
  if (!(kg >= 30 && kg <= 250)) { toast("Type your weight in kg, e.g. 75.5"); return; }
  const log = Object.assign({}, NLOG()); const ws = (log.weights || []).filter((w) => w.d !== d);
  ws.push({ d, kg: Math.round(kg * 10) / 10 }); log.weights = ws.sort((a, b) => (a.d < b.d ? -1 : 1)).slice(-200);
  upsert("meta", "nutritionLog", log); f.reset(); toast(`Logged ${kg} kg`); renderAll();
}, true);
renderAll();
