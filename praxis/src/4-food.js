// ================= NUTRITION actions =================
function setNutDay(date, patch) {
  const log = Object.assign({}, NLOG()); const days = Object.assign({}, log.days || {});
  days[date] = Object.assign({ water: 0, ate: [] }, days[date] || {}, patch);
  const cutoff = addDays(today(), -120); for (const k of Object.keys(days)) if (k < cutoff) delete days[k];
  log.days = days; upsert("meta", "nutritionLog", log);
}
Object.assign(ACT, {
  nutMeal: (d) => { const st = nutState(d.d), i = +d.i; const ate = st.ate.includes(i) ? st.ate.filter((x) => x !== i) : st.ate.concat([i]); setNutDay(d.d, { ate }); if (!st.ate.includes(i)) toast("Logged. Good fuel."); },
  water: (d) => { const st = nutState(d.d), n = +d.n; setNutDay(d.d, { water: st.water === n ? n - 1 : n }); if (n === glasses() && st.water !== n) toast("2.5 L done. Well hydrated."); },
  foodDay: (d) => { UI.foodDay = d.val; },
  shopClear: () => { const log = Object.assign({}, NLOG()); log.shop = {}; upsert("meta", "nutritionLog", log); }
});
document.addEventListener("change", (e) => {
  const key = e.target.dataset && e.target.dataset.shop; if (key === undefined) return;
  const log = Object.assign({}, NLOG()); log.shop = Object.assign({}, log.shop || {});
  if (e.target.checked) log.shop[key] = true; else delete log.shop[key];
  upsert("meta", "nutritionLog", log); renderAll();
});
document.addEventListener("submit", (e) => {
  const f = e.target; if (!f.dataset || f.dataset.form !== "weight") return;
  e.preventDefault(); e.stopImmediatePropagation();
  const kg = num(f.elements.kg.value), d = f.elements.d.value || today();
  if (!(kg >= 30 && kg <= 250)) { toast("Type your weight in kg, e.g. 75.5"); return; }
  const log = Object.assign({}, NLOG()); const ws = (log.weights || []).filter((w) => w.d !== d);
  ws.push({ d, kg: Math.round(kg * 10) / 10 }); log.weights = ws.sort((a, b) => (a.d < b.d ? -1 : 1)).slice(-200);
  upsert("meta", "nutritionLog", log); f.reset(); toast(`Logged ${kg} kg`); renderAll();
}, true);
renderAll();
