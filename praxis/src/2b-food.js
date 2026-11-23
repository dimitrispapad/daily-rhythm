// ================= NUTRITION =================
// Plan: meta/nutrition (private). Diary: one doc per day in "nutri/<YYYY-MM-DD>" = { water, log: [entry] }.
// entry = { id, at "HH:MM", slot (planned meal index or -1), name, kcal, p, c, f, src "plan"|"log", items?[] }
const NUT = () => meta("nutrition");
const NLOG = () => meta("nutritionLog");
const dayKeyOf = (s) => KEYS[parseYmd(s).getDay()];
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_NAME = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
UI.tabs.food = UI.tabs.food || "today";
UI.foodDay = null; UI.logDay = null; UI.diary = {};
const nowHM = () => { const d = new Date(); return pad(d.getHours()) + ":" + pad(d.getMinutes()); };
const dname = () => (((NUT().dietitian || {}).name || "").split(" ")[0] || "Dietitian");
const kcalTarget = () => num(NUT().kcal) || 2300;
const glasses = () => num(NUT().waterGlasses) || 8;
const pMin = () => num(NUT().proteinMin) || 144, pMax = () => num(NUT().proteinMax) || 160;
const r5 = (n) => Math.round(num(n) / 5) * 5;
const g0 = (n) => Math.round(num(n));
// A day normally follows the weekday's plan; "plan" on the day's record overrides it (e.g. the rest day moved).
// Which plan a date follows: the choice made for that day, else my usual week (meta/nutrition.week), else the weekday itself.
const planKeyOf = (date) => { const o = S.nutri.get(date), wk = NUT().week || {}; return (o && o.plan) || wk[dayKeyOf(date)] || dayKeyOf(date); };
// Which programme day I train: the choice for that day, else the next in rotation on my usual training days, else none (-1).
function gymOf(date) { const o = S.nutri.get(date), P = meta("gymPlan"); if (o && o.gym != null) return +o.gym; if (!P.days || !(P.trainDays || []).includes(dayKeyOf(date))) return -1; return typeof nextProgDay === "function" ? nextProgDay(date) : 0; }
function burnOf(date) { const g = (meta("gymLog").days || {})[date]; return g && g.burn ? num(g.burn.kcal) : 0; }
function nutDay(date) { const n = NUT(); return n.days ? n.days[planKeyOf(date)] || null : null; }
function planEntry(m, i, at) { return { id: "plan-" + i, slot: i, name: m.slot, kcal: num(m.kcal), p: num(m.p), c: num(m.c), f: num(m.f), src: "plan", at: at || "" }; }
function nutState(date) {
  const doc = S.nutri.get(date), legacy = (NLOG().days || {})[date] || {};
  const src = doc || legacy;
  const log = Array.isArray(src.log) ? src.log.map((e) => Object.assign({}, e)) : [];
  if (!doc && Array.isArray(legacy.ate)) { const day = nutDay(date); for (const i of legacy.ate) { const m = day && day.meals[i]; if (m && !log.some((e) => e.src === "plan" && e.slot === i)) log.push(planEntry(m, i)); } }
  log.sort((a, b) => ((a.at || "99") < (b.at || "99") ? -1 : (a.at || "99") > (b.at || "99") ? 1 : 0));
  return { water: num(src.water), log, plan: (doc && doc.plan) || "", gym: doc && doc.gym != null ? +doc.gym : null, feel: doc && Array.isArray(doc.feel) ? doc.feel.slice() : [] };
}
function nutTotals(date) {
  const day = nutDay(date); if (!day && !S.nutri.get(date)) return null;
  const st = nutState(date), meals = day ? day.meals || [] : [];
  const sum = (k) => st.log.reduce((s, e) => s + num(e[k]), 0);
  const covered = new Set(st.log.filter((e) => e.slot >= 0).map((e) => +e.slot));
  return {
    day: day || { en: "Day", meals: [] }, st, meals, covered,
    kcal: sum("kcal"), eaten: sum("p"), carbs: sum("c"), fat: sum("f"),
    planKcal: meals.reduce((s, m) => s + num(m.kcal), 0), planned: meals.reduce((s, m) => s + num(m.p), 0),
    nextIdx: meals.findIndex((m, i) => m.kind !== "fast" && !covered.has(i))
  };
}
function kcalStatus(k) { if (!k) return ["", "Not logged"]; const r = k / kcalTarget(); return r < 0.85 ? ["soon", "Under"] : r > 1.1 ? ["late", "Over"] : ["good", "On target"]; }
function protStatus(p) { if (!p) return ["", "—"]; return p < pMin() ? ["soon", "Low"] : p > pMax() + 20 ? ["late", "High"] : ["good", "In range"]; }
const macroChips = (e) => `<span class="chip">${r5(e.kcal)} kcal</span><span class="chip good">${g0(e.p)} g P</span>${num(e.c) ? `<span class="chip">${g0(e.c)} g C</span>` : ""}${num(e.f) ? `<span class="chip">${g0(e.f)} g F</span>` : ""}`;

// ---------- summary: so far vs targets vs plan ----------
function summaryHTML(date) {
  const t = nutTotals(date); if (!t) return "";
  const K = kcalTarget(), isToday = date === today();
  const ks = kcalStatus(t.kcal), ps = protStatus(t.eaten);
  const left = Math.max(0, K - t.kcal), pLeft = Math.max(0, pMin() - t.eaten);
  const judge = !isToday || new Date().getHours() >= 20; // mid-day "under" is normal, so only judge in the evening
  return `<div class="card" style="${ac("body")};border-top:3px solid var(--ac)">
    <div class="card-h"><h3>${isToday ? "So far today" : fmtDay(date)}</h3><span class="chip area" style="${ac("body")}">${esc(t.day.en)}</span></div>
    <div class="grid g2" style="gap:14px">
      <div class="kpi"><span class="v">${r5(t.kcal)}</span><span class="l">of ${K.toLocaleString(LOC)} kcal target${t.kcal && judge ? ` · <span class="chip ${ks[0]}">${ks[1]}</span>` : ""}</span>${bar((t.kcal / K) * 100, t.kcal > K * 1.1 ? "now" : t.kcal >= K * 0.85 ? "good" : "")}</div>
      <div class="kpi"><span class="v">${g0(t.eaten)} g</span><span class="l">protein of ${pMin()}–${pMax()} g${t.eaten && judge ? ` · <span class="chip ${ps[0]}">${ps[1]}</span>` : ""}</span>${bar((t.eaten / pMin()) * 100, t.eaten >= pMin() ? "good" : "")}</div>
    </div>
    <div class="row small" style="gap:14px"><span>Carbs <b>${g0(t.carbs)} g</b></span><span>Fat <b>${g0(t.fat)} g</b></span><span>Water <b>${t.st.water}/${glasses()}</b></span></div>
    ${burnOf(date) ? `<div class="row small" style="gap:14px"><span>Training burned <b>≈${r5(burnOf(date))} kcal</b></span><span>Net <b>${r5(t.kcal - burnOf(date))} kcal</b></span></div>` : ""}
    <p class="note">${isToday ? `Left for today: about <b>${r5(left)} kcal</b> and <b>${g0(pLeft)} g protein</b>. ` : ""}${esc(dname())}'s plan for this day is about ${r5(t.planKcal)} kcal and ${g0(t.planned)} g protein. Numbers are estimates.</p></div>`;
}

// ---------- diary: what I actually ate ----------
const srcChip = (x) => (x.src === "usda" ? `<div class="note"><span class="chip good">USDA</span> ${esc(x.ref || "")}</div>` : x.src === "ai" ? `<div class="note"><span class="chip">AI estimate</span></div>` : x.src === "mem" ? `<div class="note"><span class="chip brand">My foods</span></div>` : x.src === "none" ? `<div class="note"><span class="chip soon">Not found</span> type the numbers</div>` : "");
function diaryHTML(date) {
  const st = nutState(date), t = nutTotals(date), D = UI.diary[date] || {};
  const meals = t ? t.meals : [];
  const slotName = (s) => (s >= 0 && meals[s] ? meals[s].slot : "Extra");
  const opts = [[-1, "Extra / snack"]].concat(meals.map((m, i) => [i, m.slot]).filter(([i]) => meals[i].kind !== "fast"));
  const slot = D.slot != null ? +D.slot : -1;
  const review = D.items ? (() => {
    const tot = D.items.reduce((s, x) => ({ kcal: s.kcal + num(x.kcal), p: s.p + num(x.protein), c: s.c + num(x.carbs), f: s.f + num(x.fat) }), { kcal: 0, p: 0, c: 0, f: 0 });
    return `<div class="review"><div class="card-h"><b>${D.editId ? "Correct this entry" : "Estimate · check and adjust"}</b></div><p class="small" style="margin:0">"${esc(D.text || "")}"</p>
      <div class="tbl-scroll"><table class="foodtbl dz"><thead><tr><th>Food</th><th>kcal</th><th>Protein g</th><th>Carbs g</th><th>Fat g</th></tr></thead><tbody>
      ${D.items.map((x, i) => `<tr><td>${esc(x.name)}${x.amount ? `<div class="note">${esc(x.amount)}</div>` : ""}${srcChip(x)}</td>${["kcal", "protein", "carbs", "fat"].map((k) => `<td><input class="input" type="number" inputmode="decimal" min="0" id="dz-${date}-${i}-${k}" data-dz="${i}" data-dk="${k}" data-date="${date}" value="${esc(g0(x[k]))}" aria-label="${esc(x.name)} ${k}"></td>`).join("")}</tr>`).join("")}
      <tr class="tot"><td><b>Total</b></td><td id="dzt-kcal-${date}"><b>${r5(tot.kcal)}</b></td><td id="dzt-p-${date}"><b>${g0(tot.p)}</b></td><td id="dzt-c-${date}">${g0(tot.c)}</td><td id="dzt-f-${date}">${g0(tot.f)}</td></tr></tbody></table></div>
      ${[].concat(D.note || []).map((n) => `<p class="note">${esc(n)}</p>`).join("")}
      <div class="row"><button class="btn" data-act="diarySave" data-d="${date}">${D.editId ? "Save the correction" : "Save to " + esc(slotName(slot))}</button><button class="btn quiet" data-act="diaryCancel" data-d="${date}">Cancel</button></div></div>`;
  })() : "";
  const manual = D.manual ? `<div class="review"><b>Enter the numbers yourself</b><p class="small" style="margin:0">"${esc(D.text || "")}"</p><div class="fgrid" style="grid-template-columns:repeat(auto-fit,minmax(100px,1fr))">${[["kcal", "kcal"], ["p", "Protein g"], ["c", "Carbs g"], ["f", "Fat g"]].map(([k, l]) => `<label class="f">${l}<input class="input" type="number" inputmode="decimal" min="0" id="dm-${date}-${k}" data-dm="${k}" data-date="${date}" value="${esc(D.m && D.m[k] != null ? D.m[k] : "")}"></label>`).join("")}</div>
      <div class="row"><button class="btn" data-act="diarySaveManual" data-d="${date}">Save</button><button class="btn quiet" data-act="diaryCancel" data-d="${date}">Cancel</button></div></div>` : "";
  const list = st.log.map((e) => `<div class="it" style="${ac("body")}"><span class="chip">${esc(e.at || "—")}</span>
      <div style="min-width:0"><div class="row" style="gap:6px"><b>${esc(e.src === "plan" ? slotName(+e.slot) + " · as planned" : e.name)}</b>${e.src !== "plan" && e.slot >= 0 ? `<span class="chip brand">${esc(slotName(+e.slot))}</span>` : ""}</div>
      ${e.items && e.items.length ? `<div class="s">${esc(e.items.map((x) => x.name + (x.amount ? " (" + x.amount + ")" : "")).join(" · "))}</div>` : ""}<div class="m">${macroChips(e)}</div></div>
      <div class="entry-acts">${e.src !== "plan" ? `<button class="btn quiet sm" data-act="favPin" data-d="${date}" data-id="${esc(e.id)}" aria-pressed="${isPinned(e.name)}" aria-label="Remember this food" title="Remember this food">${isPinned(e.name) ? "★" : "☆"}</button><button class="btn quiet sm" data-act="diaryEdit" data-d="${date}" data-id="${esc(e.id)}" aria-label="Correct the numbers" title="Correct the numbers">✎</button>` : ""}<button class="btn quiet sm" data-act="diaryDel" data-d="${date}" data-id="${esc(e.id)}" aria-label="Remove ${esc(e.name)}" title="Delete">×</button></div></div>`).join("");
  return `<div class="card" id="diary-${date}"><div class="card-h"><h3>What I ate</h3><span class="note">${st.log.length} ${st.log.length === 1 ? "entry" : "entries"}</span></div>
    <form class="stack" data-form="diary" data-d="${date}">
      <textarea class="input" id="diary-text-${date}" name="t" rows="2" placeholder="e.g. 2 αυγά, 1 φέτα ψωμί ολικής, καφές με γάλα" aria-label="What did you eat?"></textarea>
      <div class="addrow"><select class="input" name="slot" id="diary-slot-${date}" aria-label="Which meal">${opts.map(([i, l]) => `<option value="${i}" ${i === slot ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>
        <input class="input" type="time" name="at" id="diary-at-${date}" value="${date === today() ? nowHM() : "13:00"}" aria-label="Time" style="flex:0 1 120px">
        ${CAP.sample || USDA_ON() ? `<button class="btn ai" type="submit" value="ai" ${D.loading ? "disabled" : ""}>${D.loading ? "Estimating…" : CAP.sample ? "Estimate with Claude" : "Estimate from the USDA database"}</button>` : ""}
        <button class="btn ghost" type="submit" value="manual">Enter numbers</button></div>
    </form>
    ${quickHTML(date)}
    ${D.err && D.err.length ? `<div class="banner warn"><span>${[].concat(D.err).map((n) => `<span>${esc(n)}</span>`).join(" ")}</span></div>` : ""}${review}${manual}
    <div class="list">${list || '<p class="note">Nothing logged yet. Tick a planned meal below, or write what you ate above.</p>'}</div></div>`;
}

// ---------- the plan for the day ----------
function mealRow(m, i, date, interactive) {
  const st = interactive ? nutState(date) : { log: [] };
  const planOn = st.log.some((e) => e.src === "plan" && +e.slot === i);
  const swaps = st.log.filter((e) => e.src !== "plan" && +e.slot === i);
  const list = (arr) => `<ul class="foodlist">${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  const est = m.kcal ? `<span class="chip">${m.rough ? "rough " : ""}≈${r5(m.kcal)} kcal</span>` : "";
  if (m.kind === "fast") return `<div class="it meal-fast"><span class="areadot" style="${ac("body")};margin-top:7px"></span><div style="min-width:0"><b>${esc(m.slot)}</b><div class="s">${esc((m.items || []).join(" "))}</div></div><span class="chip">fasting</span></div>`;
  const left = !interactive ? `<span class="areadot" style="margin-top:7px"></span>`
    : swaps.length ? `<span class="chip brand" style="margin-top:2px">Logged</span>`
    : `<button class="tick" data-act="nutMeal" data-d="${date}" data-i="${i}" aria-pressed="${planOn}" aria-label="${planOn ? "Not eaten" : "Ate as planned"}: ${esc(m.slot)}">${ICON.check}</button>`;
  return `<div class="it ${planOn || swaps.length ? "done" : ""}" style="${ac("body")}">${left}
    <div style="min-width:0"><div class="row" style="gap:6px"><b>${esc(m.slot)}</b>${m.cue ? `<span class="chip soon">${esc(m.cue)}</span>` : ""}</div>
      ${m.items && m.items.length ? list(m.items) : ""}
      ${m.options && m.options.length ? `<div class="s">Choose one:</div>${list(m.options)}` : ""}
      ${m.note ? `<div class="s">${esc(m.note)}</div>` : ""}
      ${swaps.map((e) => `<div class="swap">Actually ate: <b>${esc(e.name)}</b> · ${r5(e.kcal)} kcal · ${g0(e.p)} g protein</div>`).join("")}
      ${interactive && !planOn && !swaps.length ? `<button class="btn quiet sm" style="padding-left:0" data-act="diarySlot" data-d="${date}" data-i="${i}">Ate something else</button>` : ""}</div>
    <div class="stack" style="align-items:flex-end;gap:4px">${m.p ? `<span class="chip good">${esc(m.pLabel || m.p)} g protein</span>` : ""}${est}</div></div>`;
}
function planHTML(date, interactive) {
  const t = nutTotals(date); if (!t || !t.meals.length) return "";
  return `<div class="card"><div class="card-h"><h3>${esc(dname())}'s plan · ${esc(DAY_NAME[dayKeyOf(date)])}</h3><span class="chip area" style="${ac("body")}">${esc(t.day.gr || "")}</span></div>
    ${t.day.hint ? `<p class="note">${esc(t.day.hint)}</p>` : ""}
    <div class="list">${t.meals.map((m, i) => mealRow(m, i, date, interactive)).join("")}</div>
    <p class="note">Tick a meal when you ate it as planned. Ate something different? Tap "Ate something else" and write it in the diary.</p></div>`;
}
// ---------- what kind of day is it ----------
function dayKinds() { const seen = new Set(), out = []; for (const k of DAY_ORDER) { const d = NUT().days[k]; if (d && !seen.has(d.en)) { seen.add(d.en); out.push([k, d.en]); } } return out; }
function daySetupHTML(date) {
  const P = meta("gymPlan"), cur = NUT().days[planKeyOf(date)] || {}, g = gymOf(date), done = (meta("gymLog").days || {})[date];
  return `<div class="card"><div class="card-h"><h3>${date === today() ? "Today is" : "This day was"}</h3><span class="note">${fmtDay(date)}</span></div>
    <div class="chips">${dayKinds().map(([k, en]) => `<button class="pill" data-act="dayKind" data-d="${date}" data-val="${k}" aria-pressed="${cur.en === en}">${esc(en)}</button>`).join("")}</div>
    ${P.days ? `<div><span class="eyebrow">Training</span><div class="chips" style="margin-top:6px"><button class="pill" data-act="dayGym" data-d="${date}" data-val="-1" aria-pressed="${g < 0}">No training</button>${P.days.map((d, i) => `<button class="pill" data-act="dayGym" data-d="${date}" data-val="${i}" aria-pressed="${g === i}">${esc(d.name)}</button>`).join("")}</div>
      ${g >= 0 ? `<p class="note">${esc(P.days[g].groups.map((x) => x.name).join(" · "))}${done ? " · logged" : ""} · <a href="#gym">Open the session</a></p>` : ""}</div>` : ""}
    <p class="note">It starts from your usual week. Change it any day: the meals and the gym page follow.</p></div>`;
}
// ---------- how I feel ----------
const FEEL = [["mood", "Mood"], ["energy", "Energy"], ["hunger", "Hunger"], ["stress", "Stress"]];
function feelHTML(date) {
  const st = nutState(date), F = UI.feel || {};
  return `<div class="card"><div class="card-h"><h3>How I feel</h3><span class="note">${st.feel.length ? plural(st.feel.length, "note") : "1 = low, 5 = high"}</span></div>
    ${FEEL.map(([k, l]) => `<div class="feelrow"><span class="small">${l}</span><div class="scale5">${[1, 2, 3, 4, 5].map((i) => `<button data-act="feelSet" data-k="${k}" data-val="${i}" aria-pressed="${F[k] === i}" aria-label="${l} ${i}">${i}</button>`).join("")}</div></div>`).join("")}
    <textarea class="input" id="feel-note" rows="2" placeholder="What is behind it? e.g. slept badly, stressful meeting, proud of the session" aria-label="Feelings note">${esc(F.note || "")}</textarea>
    <div class="row"><button class="btn ghost" data-act="feelSave" data-d="${date}">Save how I feel</button></div>
    <div class="list">${st.feel.map((f) => `<div class="it"><span class="chip">${esc(f.at || "—")}</span><div style="min-width:0"><div class="m">${FEEL.filter(([k]) => f[k]).map(([k, l]) => `<span class="chip">${l} ${f[k]}/5</span>`).join("")}</div>${f.note ? `<div class="s">${esc(f.note)}</div>` : ""}</div><button class="btn quiet sm" data-act="feelDel" data-d="${date}" data-id="${esc(f.id)}" aria-label="Remove">×</button></div>`).join("")}</div></div>`;
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
    <p class="note">Weigh in the same way each time (morning, before breakfast). Look at the trend, not one day.</p></div>`;
}
function visitHTML() {
  const n = NUT(), v = n.nextVisit, dt = n.dietitian || {};
  return `<div class="card" style="${ac("body")};border-top:3px solid var(--ac)"><span class="eyebrow">Dietitian</span>
    <b>${esc(dt.name || "Your dietitian")}</b>${dt.title ? `<span class="note">${esc(dt.title)}</span>` : ""}
    ${v && v.date ? `<div class="kpi"><span class="v">${daysUntil(v.date) >= 0 ? plural(daysUntil(v.date), "day") : "Past"}</span><span class="l">Next visit: ${fmtDay(v.date)}${v.time ? " · " + esc(v.time) : ""}${v.confirmed ? "" : " · to be confirmed"}</span></div>` : ""}
    ${dt.phone || dt.email ? `<p class="small" style="user-select:all">${esc(dt.phone || "")}${dt.phone && dt.email ? " · " : ""}${esc(dt.email || "")}</p>` : ""}</div>`;
}
function historyHTML() {
  const days = [...Array(7)].map((_, i) => addDays(today(), -i));
  const sel = UI.logDay;
  const rows = days.map((d) => {
    const t = nutTotals(d), k = t ? t.kcal : 0, p = t ? t.eaten : 0, ks = kcalStatus(k), ps = protStatus(p);
    return `<tr class="${d === today() ? "today" : ""} ${d === sel ? "sel" : ""}"><td><button class="t linkbtn" data-act="logDay" data-d="${d}">${d === today() ? "Today" : fmtDay(d)}</button></td><td>${esc(t ? t.day.en : "")}</td>
      <td>${k ? `${r5(k)} <span class="note">/ ${kcalTarget()}</span>` : "—"}</td><td>${p ? `${g0(p)} g` : "—"}</td>
      <td>${k ? `<span class="chip ${ks[0]}">${ks[1]}</span> <span class="chip ${ps[0]}">P ${ps[1]}</span>` : '<span class="chip">Not logged</span>'}</td></tr>`;
  }).join("");
  return `<div class="card"><div class="card-h"><h3>What I actually ate · last 7 days</h3><span class="note">Tap a day to see or add to it</span></div>
    <div class="tbl-scroll"><table class="foodtbl"><thead><tr><th>Day</th><th>Plan</th><th>kcal</th><th>Protein</th><th>vs targets</th></tr></thead><tbody>${rows}</tbody></table></div></div>
    ${sel ? `${sel !== today() ? daySetupHTML(sel) : ""}${summaryHTML(sel)}${diaryHTML(sel)}${sel !== today() ? planHTML(sel, false) : ""}` : ""}`;
}
function viewFood() {
  const n = NUT();
  if (!n.days) return `<div class="page">${head("Nutrition", "Your dietitian's plan, meal by meal.")}${emptyState("No nutrition plan yet", "Send your dietitian's plan to Claude in chat and it will appear here.")}</div>`;
  const t = today(), tk = dayKeyOf(t), tab = UI.tabs.food;
  const sub = `${esc((n.dietitian || {}).name || "Dietitian")}'s plan${n.date ? " from " + fmtShort(n.date) : ""} · ${esc(n.kcal || "")} kcal · ${pMin()}–${pMax()} g protein a day`;
  let body = "";
  if (tab === "today") {
    body = `<div class="grid food2" style="align-items:start"><div class="stack" style="gap:14px">${daySetupHTML(t)}${summaryHTML(t)}${diaryHTML(t)}${planHTML(t, true)}
        ${n.crunchy ? `<details class="card"><summary><b>Craving something crunchy?</b></summary><p class="small" style="margin-top:8px">${esc(n.crunchy)}</p></details>` : ""}</div>
      <div class="stack" style="gap:14px">${feelHTML(t)}${waterHTML(t)}${visitHTML()}${weightHTML()}</div></div>`;
  } else if (tab === "week") {
    const k = UI.foodDay || tk, day = n.days[k];
    const planned = day ? day.meals.reduce((s, m) => s + num(m.p), 0) : 0, pk = day ? day.meals.reduce((s, m) => s + num(m.kcal), 0) : 0;
    body = `${historyHTML()}
      <h2>The plan, day by day</h2>
      <div class="chips">${DAY_ORDER.map((d) => `<button class="pill" data-act="foodDay" data-val="${d}" aria-pressed="${d === k}">${DAY_NAME[d]}${d === tk ? " ·" : ""} <span class="muted">${esc((n.days[d] || {}).short || "")}</span></button>`).join("")}</div>
      ${day ? `<div class="card"><div class="card-h"><h3>${esc(DAY_NAME[k])} · ${esc(day.en)}</h3><span class="note">${pk ? `≈${r5(pk)} kcal · ` : ""}${planned ? `about ${planned} g protein` : ""}</span></div>${day.hint ? `<p class="note">${esc(day.hint)}</p>` : ""}<div class="list">${day.meals.map((m, i) => mealRow(m, i, t, false)).join("")}</div></div>` : ""}`;
  } else if (tab === "guide") {
    const ul = (arr) => `<ul class="foodlist">${(arr || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
    body = `<div class="grid g2" style="align-items:start">
      <div class="card"><h3>Basics</h3>${ul(n.rules)}</div>
      <div class="card"><h3>Supplements</h3>${ul(n.supplements)}${n.tests ? `<div class="banner warn">${esc(n.tests)}</div>` : ""}</div>
      <div class="card"><h3>Swap carbs (each line is one portion)</h3>${ul(n.carbEq)}</div>
      <div class="card"><h3>Swap protein (each line is one portion)</h3>${ul(n.protEq)}</div>
      <div class="card"><h3>Training</h3><p>${esc(n.exercise || "")}</p></div>
      <div class="card"><h3>Dietitian's notes</h3>${ul(n.notes)}${n.crunchy ? `<p class="small">${esc(n.crunchy)}</p>` : ""}</div></div>
      <p class="note">Calorie and carb/fat numbers next to meals are Claude's estimates from typical portions; protein numbers are your dietitian's.</p>`;
  } else {
    const shop = n.shopping || {}, ticks = NLOG().shop || {};
    const total = Object.values(shop).reduce((s, a) => s + a.length, 0), got = Object.keys(ticks).filter((k) => ticks[k]).length;
    body = `<div class="row between"><span class="note">${got} of ${total} in the basket · built from the meals in your plan</span><button class="btn quiet sm" data-act="shopClear">Untick all</button></div>
      <div class="grid g2" style="align-items:start">${Object.entries(shop).map(([cat, arr]) => `<div class="card"><h3>${esc(cat)}</h3><div class="stack" style="gap:4px">${arr.map((x) => { const key = cat + "|" + x; return `<label class="row" style="gap:10px;flex-wrap:nowrap;cursor:pointer"><input type="checkbox" class="cbx" data-shop="${esc(key)}" ${ticks[key] ? "checked" : ""}><span style="${ticks[key] ? "text-decoration:line-through;color:var(--muted)" : ""}">${esc(x)}</span></label>`; }).join("")}</div></div>`).join("")}</div>`;
  }
  return `<div class="page">${head("Nutrition", sub)}${tabs("food", [["today", "Today"], ["week", "Week & log"], ["guide", "Guide"], ["shop", "Shopping list"]])}${body}
    <p class="note">${esc(n.motto || "")}</p></div>`;
}
VIEWS.food = viewFood;
function nutContext() {
  const n = NUT(); if (!n.days) return "";
  const tt = nutTotals(today()); if (!tt) return "";
  return `\nNutrition (dietitian's plan): ${n.kcal} kcal, ${pMin()}–${pMax()} g protein a day. Today is a ${tt.day.en.toLowerCase()}; so far ${r5(tt.kcal)} kcal and ${g0(tt.eaten)} g protein logged; water ${tt.st.water}/${glasses()} glasses.`;
}
