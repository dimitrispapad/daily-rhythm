// ================= NUTRITION actions =================
function saveNutDay(date, st) { const b = { water: st.water, log: st.log.map((e) => Object.assign({}, e)) }; if (st.plan) b.plan = st.plan; upsert("nutri", date, b); }
function diaryStateFor(date) { return (UI.diary[date] = UI.diary[date] || {}); }
async function estimateFood(date, text) {
  const D = diaryStateFor(date);
  D.loading = true; D.err = ""; D.items = null; D.manual = false; renderAll();
  try {
    const r = await CAP.sample.json(`Estimate the calories and macronutrients of what I ate. I live in Greece: when an amount is missing, assume a typical Greek/European portion; weights are cooked unless I say otherwise. Be realistic, not optimistic.
Reply with only JSON: {"items": [{"name": "food in the language I wrote", "amount": "the portion you assumed", "kcal": number, "protein": grams, "carbs": grams, "fat": grams}], "note": "one short sentence on what is most uncertain, or null"}.
Round kcal to the nearest 5 and grams to whole numbers. One item per food.
What I ate: ${text}`, { cache: false });
    const items = (r && Array.isArray(r.items) ? r.items : []).filter((x) => x && x.name).slice(0, 25).map((x) => ({
      name: String(x.name).slice(0, 120), amount: x.amount ? String(x.amount).slice(0, 60) : "",
      kcal: Math.min(5000, Math.max(0, num(x.kcal))), protein: Math.min(400, Math.max(0, num(x.protein))), carbs: Math.min(800, Math.max(0, num(x.carbs))), fat: Math.min(400, Math.max(0, num(x.fat)))
    }));
    if (!items.length) throw { code: "invalid_json" };
    Object.assign(D, { loading: false, items, note: r.note ? String(r.note).slice(0, 240) : "" });
  } catch (e) { Object.assign(D, { loading: false, err: e && e.code === "cancelled" ? "" : sampleErr(e) + " You can also enter the numbers yourself." }); }
  renderAll();
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
    addEntry(d.d, { id: uid(), at: D.at || nowHM(), slot: D.slot != null ? +D.slot : -1, name: D.text, items: D.items, kcal: sum("kcal"), p: sum("protein"), c: sum("carbs"), f: sum("fat"), src: "log" });
    UI.diary[d.d] = {};
  },
  diarySaveManual: (d) => {
    const D = diaryStateFor(d.d), m = D.m || {};
    if (!num(m.kcal) && !num(m.p)) { D.err = "Type at least the calories or the protein."; return; }
    addEntry(d.d, { id: uid(), at: D.at || nowHM(), slot: D.slot != null ? +D.slot : -1, name: D.text, kcal: num(m.kcal), p: num(m.p), c: num(m.c), f: num(m.f), src: "log" });
    UI.diary[d.d] = {};
  },
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
  if (t.id && t.id.startsWith("daytype-")) { const date = t.id.slice(8), st = nutState(date); st.plan = t.value === dayKeyOf(date) ? "" : t.value; if (!st.plan && !S.nutri.get(date)) return renderAll(); saveNutDay(date, st); if (!st.plan) { const b = Object.assign({}, S.nutri.get(date)); delete b.plan; upsert("nutri", date, b); } renderAll(); }
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
    if (how === "ai" && CAP.sample) { f.reset(); estimateFood(date, D.text); }
    else { D.manual = true; D.items = null; D.m = {}; f.reset(); renderAll(); }
    return;
  }
  if (f.dataset.form === "gym") {
    e.preventDefault(); e.stopImmediatePropagation();
    const mins = Math.min(600, Math.max(0, num(f.elements.mins.value)));
    setGym(f.dataset.d, Object.assign({}, gymDays()[f.dataset.d] || {}, { type: f.elements.type.value, mins, effort: num(f.elements.effort.value), note: String(f.elements.note.value || "").trim().slice(0, 600) }));
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
