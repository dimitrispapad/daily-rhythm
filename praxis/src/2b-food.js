// ================= NUTRITION (plan lives in the private store: meta/nutrition) =================
const NUT = () => meta("nutrition");
const NLOG = () => meta("nutritionLog");
const dayKeyOf = (s) => KEYS[parseYmd(s).getDay()];
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_NAME = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
UI.tabs.food = UI.tabs.food || "today";
UI.foodDay = null;
function nutDay(date) { const n = NUT(); return n.days ? n.days[dayKeyOf(date)] || null : null; }
function nutState(date) { const d = (NLOG().days || {})[date] || {}; return { water: num(d.water), ate: Array.isArray(d.ate) ? d.ate : [] }; }
function nutTotals(date) {
  const day = nutDay(date); if (!day) return null;
  const st = nutState(date), meals = day.meals || [];
  const planned = meals.reduce((s, m) => s + num(m.p), 0);
  const eaten = meals.reduce((s, m, i) => s + (st.ate.includes(i) ? num(m.p) : 0), 0);
  return { day, st, planned, eaten, nextIdx: meals.findIndex((m, i) => m.kind !== "fast" && !st.ate.includes(i)) };
}
const glasses = () => num(NUT().waterGlasses) || 8;
const pMin = () => num(NUT().proteinMin) || 144, pMax = () => num(NUT().proteinMax) || 160;
function mealRow(m, i, date, interactive) {
  const st = nutState(date), on = st.ate.includes(i);
  const list = (arr) => `<ul class="foodlist">${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  if (m.kind === "fast") return `<div class="it meal-fast"><span class="areadot" style="${ac("body")};margin-top:7px"></span><div style="min-width:0"><b>${esc(m.slot)}</b><div class="s">${esc((m.items || []).join(" "))}</div></div><span class="chip">fasting</span></div>`;
  return `<div class="it ${on ? "done" : ""}" style="${ac("body")}">
    ${interactive ? `<button class="tick" data-act="nutMeal" data-d="${date}" data-i="${i}" aria-pressed="${on}" aria-label="${on ? "Not eaten" : "Eaten"}: ${esc(m.slot)}">${ICON.check}</button>` : `<span class="areadot" style="margin-top:7px"></span>`}
    <div style="min-width:0"><div class="row" style="gap:6px"><b>${esc(m.slot)}</b>${m.cue ? `<span class="chip soon">${esc(m.cue)}</span>` : ""}</div>
      ${m.items && m.items.length ? list(m.items) : ""}
      ${m.options && m.options.length ? `<div class="s">Choose one:</div>${list(m.options)}` : ""}
      ${m.note ? `<div class="s">${esc(m.note)}</div>` : ""}</div>
    ${m.p ? `<span class="chip good">${esc(m.pLabel || m.p)} g protein</span>` : "<span></span>"}</div>`;
}
function waterHTML(date) {
  const n = glasses(), w = nutState(date).water, litres = num(NUT().waterL) || 2.5;
  const cup = (on) => `<svg viewBox="0 0 24 28" width="26" height="30" aria-hidden="true"><path d="M4 3h16l-2 22H6z" fill="${on ? "var(--a-mind)" : "none"}" fill-opacity="${on ? ".85" : "0"}" stroke="var(--a-mind)" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
  return `<div class="card"><div class="card-h"><h3>Water</h3><span class="note">${w} of ${n} glasses · ${litres} L a day</span></div>
    <div class="glasses">${[...Array(n)].map((_, i) => `<button class="glass" data-act="water" data-d="${date}" data-n="${i + 1}" aria-pressed="${i < w}" aria-label="${i + 1} glasses">${cup(i < w)}</button>`).join("")}</div>
    <p class="note">About ${Math.round((litres * 1000) / n / 10) * 10} ml each. Drink more on days you sweat a lot.</p></div>`;
}
function weightHTML() {
  const ws = (NLOG().weights || []).slice().sort((a, b) => (a.d < b.d ? -1 : 1));
  const last = ws[ws.length - 1], prev = ws[ws.length - 2];
  const delta = last && prev ? num(last.kg) - num(prev.kg) : null;
  let chart = "";
  if (ws.length >= 2) {
    const pts = ws.slice(-10), vals = pts.map((x) => num(x.kg)); const lo = Math.min(...vals) - 0.5, hi = Math.max(...vals) + 0.5;
    const W = 300, H = 80, x = (i) => 10 + (i * (W - 20)) / (pts.length - 1), y = (v) => 8 + (1 - (v - lo) / (hi - lo)) * (H - 24);
    chart = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight trend"><polyline fill="none" stroke="var(--brand)" stroke-width="2" points="${pts.map((p, i) => `${x(i)},${y(num(p.kg))}`).join(" ")}"/>${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(num(p.kg))}" r="${i === pts.length - 1 ? 4 : 2.5}" fill="${i === pts.length - 1 ? "var(--now)" : "var(--brand)"}"><title>${fmtShort(p.d)}: ${p.kg} kg</title></circle>`).join("")}<text x="10" y="${H - 2}">${fmtShort(pts[0].d)}</text><text x="${W - 10}" y="${H - 2}" text-anchor="end">${fmtShort(pts[pts.length - 1].d)}</text></svg>`;
  }
  return `<div class="card"><div class="card-h"><h3>Weight</h3>${last ? `<span class="note">last ${fmtShort(last.d)}</span>` : ""}</div>
    ${last ? `<div class="kpi"><span class="v">${esc(last.kg)} kg</span>${delta != null ? `<span class="l">${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg since ${fmtShort(prev.d)}</span>` : '<span class="l">Starting point</span>'}</div>` : '<p class="note">No weigh-ins yet.</p>'}
    ${chart}
    <form class="addrow" data-form="weight"><input class="input" name="kg" type="number" inputmode="decimal" step="0.1" min="30" max="250" placeholder="kg" aria-label="Weight in kg" style="flex:0 1 110px"><input class="input" name="d" type="date" value="${today()}" aria-label="Date" style="flex:0 1 160px"><button class="btn ghost" type="submit">Log weight</button></form>
    <p class="note">Weigh in the same way each time (morning, before breakfast). Body composition changes slowly; look at the trend, not one day.</p></div>`;
}
function visitHTML() {
  const n = NUT(), v = n.nextVisit, dt = n.dietitian || {};
  return `<div class="card" style="${ac("body")};border-top:3px solid var(--ac)"><span class="eyebrow">Dietitian</span>
    <b>${esc(dt.name || "Your dietitian")}</b>${dt.title ? `<span class="note">${esc(dt.title)}</span>` : ""}
    ${v && v.date ? `<div class="kpi"><span class="v">${daysUntil(v.date) >= 0 ? plural(daysUntil(v.date), "day") : "Past"}</span><span class="l">Next visit: ${fmtDay(v.date)}${v.time ? " · " + esc(v.time) : ""}${v.confirmed ? "" : " · to be confirmed"}</span></div>` : ""}
    ${dt.phone || dt.email ? `<p class="small" style="user-select:all">${esc(dt.phone || "")}${dt.phone && dt.email ? " · " : ""}${esc(dt.email || "")}</p>` : ""}</div>`;
}
function viewFood() {
  const n = NUT();
  if (!n.days) return `<div class="page">${head("Nutrition", "Your dietitian's plan, meal by meal.")}${emptyState("No nutrition plan yet", "Send your dietitian's plan to Claude in chat and it will appear here.")}</div>`;
  const t = today(), tk = dayKeyOf(t), tab = UI.tabs.food;
  const sub = `${esc((n.dietitian || {}).name || "Dietitian")}'s plan${n.date ? " from " + fmtShort(n.date) : ""} · ${esc(n.kcal || "")} kcal · ${pMin()}–${pMax()} g protein a day`;
  let body = "";
  if (tab === "today") {
    const tt = nutTotals(t), day = tt.day;
    body = `<div class="grid g2" style="align-items:start"><div class="stack" style="gap:14px">
        <div class="card"><div class="card-h"><h3>${esc(DAY_NAME[tk])} · ${esc(day.en)}</h3><span class="chip area" style="${ac("body")}">${esc(day.gr || "")}</span></div>
          ${day.hint ? `<p class="note">${esc(day.hint)}</p>` : ""}
          <div class="list">${day.meals.map((m, i) => mealRow(m, i, t, true)).join("")}</div>
          ${day.meals.some((m) => num(m.p)) ? `<div>${bar((tt.eaten / pMin()) * 100, tt.eaten >= pMin() ? "good" : "")}<p class="note" style="margin-top:6px">Protein so far: <b>${tt.eaten} g</b> of ${pMin()}–${pMax()} g (today's plan: about ${tt.planned} g)</p></div>` : ""}</div>
        ${n.crunchy ? `<details class="card"><summary><b>Craving something crunchy?</b></summary><p class="small" style="margin-top:8px">${esc(n.crunchy)}</p></details>` : ""}
      </div><div class="stack" style="gap:14px">${waterHTML(t)}${visitHTML()}${weightHTML()}</div></div>`;
  } else if (tab === "week") {
    const k = UI.foodDay || tk, day = n.days[k];
    const planned = day ? day.meals.reduce((s, m) => s + num(m.p), 0) : 0;
    body = `<div class="chips">${DAY_ORDER.map((d) => `<button class="pill" data-act="foodDay" data-val="${d}" aria-pressed="${d === k}">${DAY_NAME[d]}${d === tk ? " ·" : ""} <span class="muted">${esc((n.days[d] || {}).short || "")}</span></button>`).join("")}</div>
      ${day ? `<div class="card"><div class="card-h"><h3>${esc(DAY_NAME[k])} · ${esc(day.en)}</h3><span class="note">${planned ? `about ${planned} g protein` : ""}</span></div>${day.hint ? `<p class="note">${esc(day.hint)}</p>` : ""}<div class="list">${day.meals.map((m, i) => mealRow(m, i, t, false)).join("")}</div></div>` : ""}
      <div class="tbl-scroll"><table class="foodtbl"><thead><tr><th>Day</th><th>Type</th><th>Protein</th></tr></thead><tbody>${DAY_ORDER.map((d) => { const x = n.days[d]; if (!x) return ""; const p = x.meals.reduce((s, m) => s + num(m.p), 0); return `<tr class="${d === tk ? "today" : ""}"><td><b>${DAY_NAME[d]}</b></td><td>${esc(x.en)}</td><td>${p ? "≈" + p + " g" : "—"}</td></tr>`; }).join("")}</tbody></table></div>`;
  } else if (tab === "guide") {
    const ul = (arr) => `<ul class="foodlist">${(arr || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    body = `<div class="grid g2" style="align-items:start">
      <div class="card"><h3>Basics</h3>${ul(n.rules)}</div>
      <div class="card"><h3>Supplements</h3>${ul(n.supplements)}${n.tests ? `<div class="banner warn">${esc(n.tests)}</div>` : ""}</div>
      <div class="card"><h3>Swap carbs (each line is one portion)</h3>${ul(n.carbEq)}</div>
      <div class="card"><h3>Swap protein (each line is one portion)</h3>${ul(n.protEq)}</div>
      <div class="card"><h3>Training</h3><p>${esc(n.exercise || "")}</p></div>
      <div class="card"><h3>Dietitian's notes</h3>${ul(n.notes)}${n.crunchy ? `<p class="small">${esc(n.crunchy)}</p>` : ""}</div></div>`;
  } else {
    const shop = n.shopping || {}, ticks = NLOG().shop || {};
    const total = Object.values(shop).reduce((s, a) => s + a.length, 0), got = Object.keys(ticks).filter((k) => ticks[k]).length;
    body = `<div class="row between"><span class="note">${got} of ${total} in the basket · built from the meals in your plan</span><button class="btn quiet sm" data-act="shopClear">Untick all</button></div>
      <div class="grid g2" style="align-items:start">${Object.entries(shop).map(([cat, arr]) => `<div class="card"><h3>${esc(cat)}</h3><div class="stack" style="gap:4px">${arr.map((x) => { const key = cat + "|" + x; return `<label class="row" style="gap:10px;flex-wrap:nowrap;cursor:pointer"><input type="checkbox" class="cbx" data-shop="${esc(key)}" ${ticks[key] ? "checked" : ""}><span style="${ticks[key] ? "text-decoration:line-through;color:var(--muted)" : ""}">${esc(x)}</span></label>`; }).join("")}</div></div>`).join("")}</div>`;
  }
  return `<div class="page">${head("Nutrition", sub)}${tabs("food", [["today", "Today"], ["week", "Week"], ["guide", "Guide"], ["shop", "Shopping list"]])}${body}
    <p class="note">${esc(n.motto || "")}</p></div>`;
}
VIEWS.food = viewFood;
function nutContext() {
  const n = NUT(); if (!n.days) return "";
  const tt = nutTotals(today());
  return `\nNutrition (dietitian's plan): ${n.kcal} kcal, ${pMin()}–${pMax()} g protein a day. Today is a ${tt.day.en.toLowerCase()}; protein eaten so far ${tt.eaten} g; water ${tt.st.water}/${glasses()} glasses.`;
}
