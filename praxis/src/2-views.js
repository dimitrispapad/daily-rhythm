// ================= UI state =================
const VIEW_IDS = VIEWS_META.map((v) => v[0]);
const UI = {
  view: "focus", tabs: { tasks: "board", simasia: "pipeline", mind: "books", create: "writing" },
  area: "all", editId: null, confirmDel: false, sheet: null, calm: lsGet("praxis-calm") === "1", weekOff: 0, moneyMonth: null,
  board: null, thread: null, ai: {}, inbox: { state: "idle", threads: [], err: "", at: 0 }, sort: null, q: "", writer: null, showMore: false, showDone: false, compose: {}
};
{ const h = location.hash.slice(1); if (VIEW_IDS.includes(h)) UI.view = h; else { const v = lsGet("praxis-view"); if (VIEW_IDS.includes(v)) UI.view = v; } }

function tabs(key, list) {
  return `<div class="tabs" role="tablist">${list.map(([k, l, n]) => `<button role="tab" aria-selected="${UI.tabs[key] === k}" data-act="tab" data-key="${key}" data-val="${k}">${esc(l)}${n ? ` <span class="muted">${n}</span>` : ""}</button>`).join("")}</div>`;
}
function head(title, sub, right) {
  return `<div class="pagehead"><div><h1>${esc(title)}</h1>${sub ? `<p class="sub">${sub}</p>` : ""}</div>${right ? `<div class="row">${right}</div>` : ""}</div>`;
}
function aiBox(key) {
  const a = UI.ai[key];
  if (!a) return "";
  if (a.loading && !a.text) return `<div class="ai-out muted" aria-live="polite">Thinking…</div>`;
  if (a.err) return `<div class="banner warn">${esc(a.err)}</div>`;
  return a.text ? `<div class="ai-out" aria-live="polite">${esc(a.text)}</div>` : "";
}
async function askClaude(key, prompt, opts) {
  if (!CAP.sample) return;
  UI.ai[key] = { loading: true, text: "" }; renderAll();
  try {
    const r = await CAP.sample(prompt, Object.assign({ onText: ({ text }) => { UI.ai[key] = { loading: true, text }; const el = $(`[data-ai="${key}"]`); if (el) el.innerHTML = aiBox(key); } }, opts || {}));
    UI.ai[key] = { text: r.text + (r.truncated ? "\n\n(Cut short. Ask for less at a time.)" : "") };
  } catch (e) { UI.ai[key] = e.code === "cancelled" ? null : { err: sampleErr(e), text: e.text || "" }; }
  renderAll();
}

// ================= FOCUS =================
function greet() { const h = new Date().getHours(); return h < 5 ? "Still up, Dimitris" : h < 12 ? "Good morning, Dimitris" : h < 18 ? "Good afternoon, Dimitris" : "Good evening, Dimitris"; }
function viewFocus() {
  const r = routineNow();
  const f = focusItem();
  const tt = todayTasks().filter((t) => !f || t.id !== f.id);
  const shown = UI.showMore ? tt : tt.slice(0, 3);
  const doneToday = all("task").filter((t) => t.status === "done" && t.doneAt && ymd(new Date(t.doneAt)) === today());
  const fd = focusDays()[today()] || { min: 0, n: 0 };
  const habits = all("habit");
  const T = timerState();
  const rhythm = r ? `<div class="banner hide-calm"><span class="dot ok"></span><span><b>Rhythm:</b> ${r.cur ? `${esc(r.cur.t)} until ${r.cur.e === "24:00" ? "00:00" : r.cur.e}` : "Rest time"}${r.next ? ` · next ${r.next.s} ${esc(r.next.t)}` : ""}</span><a class="btn quiet sm" href="https://dimitrispapad.github.io/daily-rhythm/" target="_blank" rel="noopener">Open Rhythm ↗</a></div>` : "";

  let one;
  if (f) {
    const steps = Array.isArray(f.steps) ? f.steps : [];
    const nextStep = steps.find((s) => !s.d);
    one = `<div class="onething">
      <div class="row between"><span class="eyebrow">Your one thing</span><div class="chips">${areaChip(areaOf(f))}${dueChip(f.due)}</div></div>
      <button class="ttl" style="border:0;background:none;padding:0;text-align:left" data-act="open" data-id="${f.id}">${esc(f.title || "Untitled")}</button>
      <div class="step"><div style="flex:1;min-width:0"><b>Next tiny step</b>
        ${nextStep ? `<label class="row" style="gap:8px;margin-top:4px"><input type="checkbox" class="cbx" data-act="stepDone" data-id="${f.id}" data-i="${steps.indexOf(nextStep)}"><span>${esc(nextStep.t)}</span></label>`
          : `<input class="input" style="margin-top:6px" id="step-${f.id}" data-field="step" data-id="${f.id}" value="${esc(f.step || "")}" placeholder="What's the first 2-minute action?">`}</div></div>
      <div class="timer">${ringHTML(T, f.id)}
        <div class="stack" style="flex:1;min-width:180px">${timerButtons(T, f.id)}
          <div class="row">${aiBtn("breakdown", "Break it into small steps", `data-id="${f.id}"`)}<button class="btn quiet sm" data-act="switchFocus">Switch task</button></div>
        </div></div>
      <div data-ai="bd-${f.id}">${aiBox("bd-" + f.id)}</div>
      <form class="addrow" data-form="park"><input class="input" id="park" name="t" placeholder="Distracted? Park the thought here and keep going" autocomplete="off" aria-label="Park a thought"><button class="btn ghost" type="submit">Park</button></form>
    </div>`;
  } else {
    one = `<div class="onething"><span class="eyebrow">Your one thing</span>
      <div class="ttl">Choose one thing.</div>
      <p class="muted">Pick a task from today's list, or add the one thing that would make today count.</p>
      ${quickAdd("task", { today: "1" }, "The one thing for today…")}</div>`;
  }
  const list = `<div class="card hide-calm"><div class="card-h"><h3>Today</h3><span class="note">${tt.length ? plural(tt.length, "more task") : "Nothing else today"}</span></div>
    <div class="list">${shown.map((t) => itemRow(t, { right: `<button class="btn quiet sm" data-act="focusOn" data-id="${t.id}">Focus</button>` })).join("") || '<p class="note">Your list is clear. Protect the one thing.</p>'}</div>
    ${tt.length > 3 ? `<button class="btn quiet sm" data-act="toggleMore">${UI.showMore ? "Show only 3" : `+${tt.length - 3} more (hidden to protect your focus)`}</button>` : ""}
    ${quickAdd("task", { today: "1" }, "Add to today…")}</div>`;

  const gym = r && P ? P.days[r.k].blocks.find((b) => b.tag === "gym") : null;
  const meals = r && P ? P.meals[r.k] : null;
  const body = `<div class="card"><div class="card-h"><h3>Body today</h3><span class="chip area" style="${ac("body")}">${esc(r ? r.day.name : "")}</span></div>
    ${gym ? `<div><b>${esc(gym.s)} ${esc(gym.t)}</b><p class="note">${esc(gym.d)}</p></div>` : '<p class="note">No gym today. Walk outside.</p>'}
    ${meals ? `<div class="stack small"><div><span class="eyebrow">Breakfast</span> ${esc(meals.b)}</div><div><span class="eyebrow">Lunch</span> ${esc(meals.l)}</div><div><span class="eyebrow">Dinner</span> ${esc(meals.d)}</div></div>` : ""}</div>`;
  const hab = `<div class="card"><div class="card-h"><h3>Habits</h3><a class="btn quiet sm" href="#goals">Edit</a></div>
    ${habits.length ? habits.map((h) => { const on = !!(h.log || {})[today()]; return `<div class="habit"><button class="tick" data-act="habit" data-id="${h.id}" data-d="${today()}" aria-pressed="${on}" aria-label="${esc(h.title)} today">${ICON.check}</button><div style="min-width:0"><b>${esc(h.title)}</b>${h.cue ? `<div class="note">${esc(h.cue)}</div>` : ""}</div><span class="chip" style="margin-left:auto">${streak(h)} day streak</span></div>`; }).join("") : emptyState("No habits yet", "Add one tiny habit in Goals & habits.", '<a class="btn ghost sm" href="#goals">Add a habit</a>')}</div>`;
  const wins = `<div class="card"><div class="card-h"><h3>Wins today</h3><span class="num" style="font-size:26px">${doneToday.length}</span></div>
    <p class="note">${fd.min ? `${fd.min} focused minutes in ${plural(fd.n, "session")}.` : "Start one focus session. 25 minutes is enough."}</p>
    <div class="list small">${doneToday.slice(0, 5).map((t) => `<div class="row" style="padding:3px 0"><span class="chip good">✓</span><span>${esc(t.title)}</span></div>`).join("")}</div></div>`;
  return `<div class="page ${UI.calm ? "calm" : ""}">
    ${head(UI.calm ? "One thing." : greet(), UI.calm ? "Everything else is hidden. Breathe out, then do the next tiny step." : `${fmtDay(today())}${r ? " · " + esc(r.day.theme) : ""}`, `<button class="btn ghost" data-act="calm" aria-pressed="${UI.calm}">${UI.calm ? "Show everything" : "I'm overwhelmed"}</button>`)}
    ${rhythm}
    <div class="focus-hero">${one}${list}</div>
    <div class="grid g3 hide-calm">${body}${hab}${wins}</div>
  </div>`;
}
function streak(h) { let n = 0; let d = today(); const log = h.log || {}; if (!log[d]) d = addDays(d, -1); while (log[d]) { n++; d = addDays(d, -1); } return n; }

// ---------- focus timer (per device) ----------
const TKEY = "praxis-timer";
function timerState() { try { return JSON.parse(lsGet(TKEY) || "null"); } catch (_) { return null; } }
function setTimer(t) { lsSet(TKEY, t ? JSON.stringify(t) : null); }
const focusLen = () => num(meta("settings").focusLen) || 25;
const breakLen = () => num(meta("settings").breakLen) || 5;
function timeLeft(T) { if (!T) return 0; return T.pausedLeft != null ? T.pausedLeft : Math.max(0, T.end - Date.now()); }
function ringHTML(T, id) {
  const active = T && (T.id === id || T.phase === "break");
  const total = active ? T.len * 60000 : focusLen() * 60000;
  const left = active ? timeLeft(T) : total;
  const pct = 1 - left / total, C = 2 * Math.PI * 52;
  const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
  const label = !active ? "ready" : T.phase === "break" ? "break" : T.pausedLeft != null ? "paused" : "focus";
  return `<div class="ring" id="ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" fill="none" stroke="var(--line)" stroke-width="9"/>
    <circle id="ring-arc" cx="60" cy="60" r="52" fill="none" stroke="${T && T.phase === "break" ? "var(--good)" : "var(--now)"}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - pct)).toFixed(1)}"/></svg>
    <div class="rt"><div><b id="ring-time">${pad(mm)}:${pad(ss)}</b><span id="ring-label">${label}</span></div></div></div>`;
}
function timerButtons(T, id) {
  const active = T && T.id === id && T.phase === "focus";
  if (T && T.phase === "break") return `<div class="row"><button class="btn ghost" data-act="timerStop">End break</button></div><p class="note">Stand up, drink water, look far away.</p>`;
  if (!active) return `<div class="row"><button class="btn big" data-act="timerStart" data-id="${id}">Start ${focusLen()} min focus</button><button class="btn ghost" data-act="complete" data-id="${id}">Done ✓</button></div>`;
  return `<div class="row">${T.pausedLeft != null ? `<button class="btn" data-act="timerResume">Resume</button>` : `<button class="btn ghost" data-act="timerPause">Pause</button>`}<button class="btn quiet" data-act="timerStop">Stop</button><button class="btn ghost" data-act="complete" data-id="${id}">Done ✓</button></div>`;
}
let audioCtx = null;
function chime() { try { if (!audioCtx) return; const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.frequency.value = 660; o.connect(g); g.connect(audioCtx.destination); g.gain.setValueAtTime(0.0001, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2); o.start(); o.stop(audioCtx.currentTime + 1.3); } catch (_) {} }
let wakeLock = null;
function tickTimer() {
  const T = timerState(); if (!T) return;
  const left = timeLeft(T);
  const el = $("#ring-time");
  if (el) {
    const total = T.len * 60000, C = 2 * Math.PI * 52;
    el.textContent = `${pad(Math.floor(left / 60000))}:${pad(Math.floor((left % 60000) / 1000))}`;
    const arc = $("#ring-arc"); if (arc) arc.setAttribute("stroke-dashoffset", (C * (left / total)).toFixed(1));
  }
  document.title = T.pausedLeft == null ? `${pad(Math.floor(left / 60000))}:${pad(Math.floor((left % 60000) / 1000))} · PraxisAI` : "PraxisAI";
  if (left <= 0 && T.pausedLeft == null) {
    if (T.phase === "focus") {
      logFocus(T.len);
      chime();
      setTimer({ phase: "break", id: T.id, len: breakLen(), end: Date.now() + breakLen() * 60000, pausedLeft: null });
      toast(`${T.len} minutes done. Take a ${breakLen()}-minute break.`);
    } else { setTimer(null); chime(); toast("Break over. Next tiny step?"); document.title = "PraxisAI"; releaseWake(); }
    renderAll();
  }
}
function logFocus(min) {
  const days = Object.assign({}, focusDays()); const d = today();
  const cur = days[d] || { min: 0, n: 0 }; days[d] = { min: cur.min + min, n: cur.n + 1 };
  const cutoff = addDays(d, -120); for (const k of Object.keys(days)) if (k < cutoff) delete days[k];
  setMeta("focusLog", { days });
}
async function requestWake() { try { wakeLock = await navigator.wakeLock.request("screen"); } catch (_) { wakeLock = null; } }
function releaseWake() { try { wakeLock && wakeLock.release(); } catch (_) {} wakeLock = null; }

// ================= OVERVIEW =================
function viewOverview() {
  const items = [...S.items.values()];
  const t = today(), wkEnd = addDays(t, 7);
  const open = all("task").filter((x) => x.status !== "done");
  const overdue = deadlines(0).filter(({ d }) => d < t).length;
  const week = deadlines(7).filter(({ d }) => d >= t && d <= wkEnd).length;
  const fdays = focusDays(); let wkMin = 0; for (let i = 0; i < 7; i++) wkMin += (fdays[addDays(t, -i)] || {}).min || 0;
  const leads = items.filter((i) => i.type === "lead" && isOpen(i)).length;
  const m = moneySnapshot();
  const kpis = [
    [todayTasks().length, "Tasks for today", false], [overdue, "Overdue", overdue > 0], [week, "Due in 7 days", false], [`${(wkMin / 60).toFixed(1)} h`, "Focused this week", false],
    [leads, "Open leads", false], [eur(m.unpaid), "Unpaid invoices", m.overdue > 0], [eur(m.net), "Net this month", m.net < 0], [m.runway == null ? "—" : m.runway.toFixed(1) + " mo", "Savings runway", m.runway != null && m.runway < 3]
  ].map(([v, l, a]) => `<div class="card kpi ${a ? "alert" : ""}"><span class="v">${esc(v)}</span><span class="l">${esc(l)}</span></div>`).join("");
  const dls = deadlines(30);
  const dlHtml = dls.length ? dls.slice(0, 12).map(({ it, d }) => `<div class="dl" style="${ac(areaOf(it))}"><span class="d ${d < t ? "late" : ""}">${d === t ? "Today" : fmtShort(d)}</span><button class="t ev" data-act="open" data-id="${it.id}">${esc(it.title || "Untitled")} <span class="muted">· ${esc(TYPES[it.type].label)}</span></button>${dueChip(d)}</div>`).join("") : emptyState("No deadlines in the next 30 days", "Dated tasks, meetings, invoices and applications appear here.");
  const areaCards = Object.keys(AREAS).map((a) => {
    const mine = all().filter((x) => areaOf(x) === a && isOpen(x) && ["task", "lead", "invoice", "meeting", "opp", "project", "goal", "event"].includes(x.type));
    const top = mine.sort(byUrgency).slice(0, 3);
    return `<div class="card" style="${ac(a)};border-top:3px solid var(--ac)"><div class="card-h"><h3>${esc(AREAS[a])}</h3><span class="chip">${mine.length} open</span></div>
      <div class="list small">${top.map((x) => `<div class="row" style="padding:3px 0;flex-wrap:nowrap"><span class="areadot"></span><button class="t" style="border:0;background:none;padding:0;text-align:left;font-weight:500;overflow-wrap:anywhere" data-act="open" data-id="${x.id}">${esc(x.title || "Untitled")}</button>${dateOf(x) ? dueChip(dateOf(x)) : ""}</div>`).join("") || '<span class="note">Nothing open.</span>'}</div></div>`;
  }).join("");
  return `<div class="page">${head("Overview", "Everything in one view. Pick one thing, then go back to Focus.")}
    <div class="grid g4">${kpis}</div>
    <div class="grid g2"><div class="card"><div class="card-h"><h3>Deadlines, next 30 days</h3><a class="btn quiet sm" href="#plan">Calendar</a></div><div>${dlHtml}</div></div>
      <div class="card"><div class="card-h"><h3>Focus, last 14 days</h3><span class="note">minutes per day</span></div>${focusChart()}<div class="card-h"><h3>Money, last 6 months</h3><a class="btn quiet sm" href="#money">Money</a></div>${moneyChart(6)}</div></div>
    <div class="grid g3">${areaCards}</div></div>`;
}
function focusChart() {
  const t = today(), days = [], fd = focusDays();
  for (let i = 13; i >= 0; i--) { const d = addDays(t, -i); days.push({ d, v: (fd[d] || {}).min || 0 }); }
  const max = Math.max(60, ...days.map((x) => x.v)), W = 420, H = 120, pb = 18, bw = (W - 30) / 14;
  const yTop = Math.ceil(max / 30) * 30;
  const bars = days.map((x, i) => { const h = (x.v / yTop) * (H - pb - 8); const isT = x.d === t; return `<rect x="${30 + i * bw + 3}" y="${H - pb - h}" width="${bw - 6}" height="${Math.max(h, x.v ? 2 : 0)}" rx="3" fill="${isT ? "var(--now)" : "var(--brand)"}" opacity="${isT ? 1 : 0.75}"><title>${fmtShort(x.d)}: ${x.v} min</title></rect>${i % 2 === 1 ? `<text x="${30 + i * bw + bw / 2}" y="${H - 4}" text-anchor="middle">${parseYmd(x.d).getDate()}</text>` : ""}`; }).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Focus minutes per day, last 14 days"><g class="grid"><line x1="30" x2="${W}" y1="${H - pb}" y2="${H - pb}"/><line x1="30" x2="${W}" y1="${(H - pb) / 2 + 4}" y2="${(H - pb) / 2 + 4}" stroke-dasharray="3 3"/></g><text x="0" y="12">${yTop}</text><text x="0" y="${(H - pb) / 2 + 8}">${yTop / 2}</text>${bars}</svg>`;
}
function moneyChart(n) {
  const ms = monthsBack(n).map((k) => { const s = moneySnapshot(k); return { k, inc: s.inc, exp: s.exp }; });
  const max = Math.max(100, ...ms.map((x) => Math.max(x.inc, x.exp)));
  const step = niceStep(max), top = Math.ceil(max / step) * step;
  const W = 420, H = 150, pb = 18, pl = 44, gw = (W - pl) / n;
  const y = (v) => H - pb - (v / top) * (H - pb - 10);
  const grid = [0, top / 2, top].map((v) => `<line x1="${pl}" x2="${W}" y1="${y(v)}" y2="${y(v)}" ${v ? 'stroke-dasharray="3 3"' : ""}/>`).join("");
  const labels = [0, top / 2, top].map((v) => `<text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">${v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + "k" : v}</text>`).join("");
  const bars = ms.map((x, i) => { const bx = pl + i * gw + gw * 0.15, bw = gw * 0.33;
    return `<rect x="${bx}" y="${y(x.inc)}" width="${bw}" height="${H - pb - y(x.inc)}" rx="2" fill="var(--good)"><title>${monthName(x.k)} income ${eur(x.inc)}</title></rect><rect x="${bx + bw + 2}" y="${y(x.exp)}" width="${bw}" height="${H - pb - y(x.exp)}" rx="2" fill="var(--now)" opacity=".8"><title>${monthName(x.k)} spent ${eur(x.exp)}</title></rect><text x="${pl + i * gw + gw / 2}" y="${H - 4}" text-anchor="middle">${monthName(x.k)}</text>`; }).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Income and spending per month"><g class="grid">${grid}</g>${labels}${bars}</svg><div class="legend"><span><i style="background:var(--good)"></i>Income</span><span><i style="background:var(--now)"></i>Spent</span></div>`;
}
function niceStep(max) { const raw = max / 2, p = Math.pow(10, Math.floor(Math.log10(raw))); const f = raw / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }

// ================= TASKS =================
function areaPills() {
  return `<div class="chips">${[["all", "All"], ...Object.entries(AREAS)].map(([k, l]) => `<button class="pill" data-act="area" data-val="${k}" aria-pressed="${UI.area === k}">${esc(l)}</button>`).join("")}</div>`;
}
function viewTasks() {
  const list = all("task").filter((t) => UI.area === "all" || areaOf(t) === UI.area);
  const extra = UI.area === "all" ? {} : { area: UI.area };
  let body;
  if (UI.tabs.tasks === "board") {
    body = `<div class="board">${TASK_STATUS.map(([k, l]) => {
      let col = list.filter((t) => (t.status || "next") === k).sort(byUrgency);
      if (k === "done") col = col.sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0)).slice(0, 12);
      return `<div class="col" data-drop="${k}"><div class="col-h"><span>${esc(l)}</span><span>${list.filter((t) => (t.status || "next") === k).length}</span></div>
        ${col.map((t) => `<div class="kc" draggable="true" data-drag="${t.id}" style="${ac(areaOf(t))}"><button class="t" data-act="open" data-id="${t.id}">${esc(t.title || "Untitled")}</button>
          <div class="chips">${dueChip(t.due)}${t.prio === "1" ? '<span class="chip late">High</span>' : ""}${t.est ? `<span class="chip">${esc(t.est)} min</span>` : ""}</div>
          <div class="row">${k !== "done" ? `<button class="btn quiet sm" data-act="advance" data-id="${t.id}">${k === "doing" ? "Done ✓" : k === "inbox" ? "→ Next" : "→ Doing"}</button>` : ""}<button class="btn quiet sm" data-act="focusOn" data-id="${t.id}">Focus</button></div></div>`).join("")}
        ${k === "inbox" || k === "next" ? quickAdd("task", Object.assign({ status: k }, extra), "Add…") : ""}</div>`;
    }).join("")}</div><p class="note">Drag cards between columns on a computer, or use the buttons on a phone.</p>`;
  } else {
    const groups = Object.keys(AREAS).filter((a) => UI.area === "all" || a === UI.area).map((a) => {
      const its = list.filter((t) => areaOf(t) === a && t.status !== "done").sort(byUrgency);
      if (!its.length) return "";
      return `<div class="card"><div class="card-h"><h3>${areaChip(a)}</h3><span class="note">${its.length}</span></div><div class="list">${its.map((t) => itemRow(t, { area: false, right: `<button class="btn quiet sm" data-act="focusOn" data-id="${t.id}">Focus</button>` })).join("")}</div></div>`;
    }).join("");
    const done = list.filter((t) => t.status === "done").sort((a, b) => (b.doneAt || 0) - (a.doneAt || 0));
    body = `${quickAdd("task", extra)}${groups || emptyState("No open tasks", "Add one above, or empty your head in the Capture inbox.")}
      ${done.length ? `<button class="btn quiet sm" data-act="toggleDoneList">${UI.showDone ? "Hide" : "Show"} ${done.length} done</button>${UI.showDone ? `<div class="card"><div class="list">${done.slice(0, 40).map((t) => itemRow(t)).join("")}</div></div>` : ""}` : ""}`;
  }
  return `<div class="page">${head("Tasks", "Move one card at a time. If a task feels heavy, open it and write the next tiny step.")}
    <div class="row between">${tabs("tasks", [["board", "Board"], ["list", "By area"]])}</div>${areaPills()}${body}</div>`;
}

// ================= SIMASIAAI =================
function viewSimasia() {
  const t = UI.tabs.simasia;
  const leads = all("lead"), inv = all("invoice"), mtg = all("meeting"), off = all("offering");
  const openLeads = leads.filter(isOpen);
  let body = "";
  if (t === "pipeline") {
    const due = openLeads.filter((l) => l.stage === "todo" || (l.followUp && l.followUp <= today())).sort((a, b) => (a.followUp || "0") < (b.followUp || "0") ? -1 : 1).slice(0, 3);
    const counts = LEAD_STAGES.map(([k, l]) => `<div class="kpi"><span class="v">${leads.filter((x) => x.stage === k).length}</span><span class="l">${esc(l)}</span></div>`).join("");
    body = `<div class="card"><div class="card-h"><h3>Today's 3</h3><span class="note">Only three. Cold emails get easier in small batches.</span></div>
      <div class="list">${due.map((l) => itemRow(l, { area: false, sub: [l.contact, l.email].filter(Boolean).join(" · "), extra: `<span class="chip brand">${esc(labelOf(LEAD_STAGES, l.stage))}</span>`, right: `<button class="btn sm" data-act="open" data-id="${l.id}">${l.stage === "todo" ? "Write email" : "Follow up"}</button>` })).join("") || '<p class="note">No one to contact today. Add a lead below or enjoy the quiet.</p>'}</div></div>
      <div class="card"><div class="grid g4" style="grid-template-columns:repeat(auto-fit,minmax(90px,1fr))">${counts}</div></div>
      ${quickAdd("lead", {}, "New lead: organisation name…")}
      <div class="card"><div class="list">${openLeads.sort((a, b) => LEAD_STAGES.findIndex((s) => s[0] === a.stage) - LEAD_STAGES.findIndex((s) => s[0] === b.stage)).map((l) => itemRow(l, { area: false, sub: [l.contact, l.email].filter(Boolean).join(" · "), extra: `<span class="chip brand">${esc(labelOf(LEAD_STAGES, l.stage))}</span>` })).join("") || emptyState("No leads yet", "Add the organisations you want to reach: patient associations, disability groups, clinics.")}</div></div>
      ${leads.length - openLeads.length ? `<p class="note">${leads.filter((l) => l.stage === "won").length} won · ${leads.filter((l) => l.stage === "lost").length} lost</p>` : ""}`;
  } else if (t === "inbox") body = gmailPanel();
  else if (t === "invoices") {
    const m = moneySnapshot();
    const paidMonth = inv.filter((i) => i.status === "paid" && monthKey(i.paidOn || "") === monthKey(today())).reduce((s, i) => s + num(i.amount), 0);
    body = `<div class="grid g3"><div class="card kpi"><span class="v">${eur(m.unpaid)}</span><span class="l">Waiting to be paid</span></div><div class="card kpi ${m.overdue ? "alert" : ""}"><span class="v">${eur(m.overdue)}</span><span class="l">Overdue</span></div><div class="card kpi"><span class="v">${eur(paidMonth)}</span><span class="l">Paid this month</span></div></div>
      ${quickAdd("invoice", {}, "New invoice: client name…")}
      <div class="card"><div class="list">${inv.sort((a, b) => (a.status === "paid") - (b.status === "paid") || ((a.due || "9") < (b.due || "9") ? -1 : 1)).map((i) => {
        const late = i.status === "sent" && i.due && i.due < today();
        return itemRow(i, { area: false, sub: [i.number && "No. " + i.number, i.issued && "issued " + fmtShort(i.issued)].filter(Boolean).join(" · "), extra: `<span class="chip ${i.status === "paid" ? "good" : late ? "late" : "brand"}">${late ? "Overdue" : esc(labelOf(INV_STATUS, i.status))}</span><span class="chip">${eur(num(i.amount), 1)}</span>`,
          right: i.status === "draft" ? `<button class="btn ghost sm" data-act="invSent" data-id="${i.id}">Mark sent</button>` : i.status === "sent" ? `<button class="btn sm" data-act="invPaid" data-id="${i.id}">Mark paid</button>` : "" });
      }).join("") || emptyState("No invoices yet", "Add one when you bill a client. Marking it paid adds the income to Money.")}</div></div>`;
  } else if (t === "meetings") {
    const up = mtg.filter((x) => !x.date || x.date >= today()).sort((a, b) => ((a.date || "9") + (a.time || "")) < ((b.date || "9") + (b.time || "")) ? -1 : 1);
    const past = mtg.filter((x) => x.date && x.date < today()).sort((a, b) => (a.date < b.date ? 1 : -1));
    body = `${quickAdd("meeting", {}, "New meeting: with whom / about what…")}
      <div class="card"><div class="card-h"><h3>Coming up</h3></div><div class="list">${up.map((x) => itemRow(x, { sub: [x.time, x.with].filter(Boolean).join(" · "), extra: x.goal ? '<span class="chip good">Prepared</span>' : '<span class="chip soon">Needs prep</span>' })).join("") || '<p class="note">No meetings coming up.</p>'}</div></div>
      ${past.length ? `<div class="card"><div class="card-h"><h3>Past</h3></div><div class="list">${past.slice(0, 10).map((x) => itemRow(x, { sub: x.notes ? "Notes saved" : "Add what happened" })).join("")}</div></div>` : ""}`;
  } else {
    body = `${quickAdd("offering", {}, "New offering idea…")}<div class="card"><div class="list">${off.map((o) => itemRow(o, { area: false, sub: [labelOf(TYPES.offering.fields[0].o, o.product), o.who, o.price].filter(Boolean).join(" · "), extra: `<span class="chip brand">${esc(labelOf(OFFER_STATUS, o.status))}</span>` })).join("") || emptyState("No offering ideas yet", "Capture service and pricing ideas for fλow, DialogosAI, PraxisAI and MetronAI here.")}</div></div>`;
  }
  return `<div class="page">${head("SimasiaAI", "Leads, inbox, invoices, meetings and offerings. 09:30–18:00 is SimasiaAI time.")}
    ${tabs("simasia", [["pipeline", "Leads & cold emails", openLeads.length || ""], ["inbox", "Gmail"], ["invoices", "Invoices", inv.filter((i) => i.status !== "paid").length || ""], ["meetings", "Meetings"], ["offerings", "Offerings"]])}${body}</div>`;
}
function gmailPanel() {
  const I = UI.inbox, q = meta("settings").gmailQuery || "in:inbox newer_than:7d -category:promotions -category:social";
  if (!CAP.mcp) return `<div class="banner warn">Gmail works when PraxisAI is open on claude.ai with your Gmail connector.</div>`;
  const rows = I.threads.map((th) => {
    const m = (th.messages || [])[0] || {};
    const from = ((m.addressDisplayNames || [])[0] || {}).displayName || m.sender || "";
    return `<div class="it"><span class="areadot" style="${ac("simasia")};margin-top:7px"></span><div style="min-width:0"><b>${esc(decode(m.subject) || "(no subject)")}</b>
      <div class="s">${esc(from)} · ${m.date ? esc(new Date(m.date).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })) : ""}</div>
      <div class="s">${esc(decode(m.snippet))}</div></div>
      <div class="stack"><button class="btn sm" data-act="mailTask" data-tid="${esc(th.id)}">Make task</button>${th.viewUrl ? `<a class="btn quiet sm" href="${esc(th.viewUrl)}" target="_blank" rel="noopener">Open ↗</a>` : ""}</div></div>`;
  }).join("");
  return `<form class="addrow" data-form="gmailq"><input class="input" id="gmailq" name="q" value="${esc(q)}" aria-label="Gmail search"><button class="btn" type="submit">${I.state === "ok" ? "Refresh" : "Load inbox"}</button></form>
    ${I.state === "loading" ? '<p class="note">Loading your inbox…</p>' : ""}
    ${I.state === "error" ? `<div class="banner bad">${esc(I.err)}</div>` : ""}
    ${I.state === "ok" ? `<div class="card"><div class="card-h"><h3>${plural(I.threads.length, "thread")}</h3><span class="note">Loaded ${new Date(I.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span></div><div class="list">${rows || '<p class="note">Nothing matches. Inbox zero!</p>'}</div></div>` : ""}
    ${I.state === "idle" ? emptyState("Your SimasiaAI inbox", "Load it to turn emails into tasks. Drafts you write in Leads are saved to Gmail, never sent automatically.") : ""}`;
}
async function loadInbox(manual) {
  const q = meta("settings").gmailQuery || "in:inbox newer_than:7d -category:promotions -category:social";
  UI.inbox = Object.assign({}, UI.inbox, { state: "loading" }); if (manual) renderAll();
  try {
    const p = await gmail("search_threads", { query: q, pageSize: 20, view: "THREAD_VIEW_SUMMARY" });
    UI.inbox = { state: "ok", threads: (p && p.threads) || [], err: "", at: Date.now() };
  } catch (e) { UI.inbox = { state: "error", threads: UI.inbox.threads, err: gmailErr(e), at: UI.inbox.at }; }
  renderAll();
}

// ================= CALENDAR =================
function viewPlan() {
  const ws = addDays(weekStart(today()), UI.weekOff * 7);
  const t = today();
  const days = [...Array(7)].map((_, i) => addDays(ws, i));
  const byDay = {}; for (const [id, it] of S.items) { const d = dateOf(it) || (["meeting", "event"].includes(it.type) ? it.date : null); if (d && d >= ws && d <= days[6]) (byDay[d] = byDay[d] || []).push(Object.assign({ id }, it)); }
  const cells = days.map((d) => {
    const k = KEYS[parseYmd(d).getDay()];
    const pd = P ? P.days[k] : null;
    const gym = pd && pd.blocks.find((b) => b.tag === "gym");
    const mastery = pd && pd.blocks.find((b) => b.tag === "mastery" || b.tag === "friends" || b.tag === "write");
    const rt = pd ? [gym && `${gym.s} ${gym.t.replace("Gym: ", "Gym · ")}`, pd.blocks.some((b) => b.cat === "work") && "09:30–18:00 SimasiaAI", mastery && `${mastery.s} ${mastery.t}`].filter(Boolean) : [];
    const evs = (byDay[d] || []).sort((a, b) => ((a.time || "") < (b.time || "") ? -1 : 1));
    return `<div class="day ${d === t ? "today" : ""}"><h4><span>${fmtDay(d)}</span>${d === t ? '<span class="chip late">Today</span>' : ""}</h4>
      <div class="rt">${rt.map(esc).join("<br>")}</div>
      ${evs.map((e) => `<button class="ev" style="${ac(areaOf(e))}" data-act="open" data-id="${e.id}">${e.time ? esc(e.time) + " " : ""}${esc(e.title || "Untitled")} <span class="muted">· ${esc(TYPES[e.type].label)}</span></button>`).join("")}</div>`;
  }).join("");
  return `<div class="page">${head("Calendar", "Your routine from Rhythm plus every date in PraxisAI. Your iPhone calendar stays in Rhythm.", `<a class="btn ghost" href="https://dimitrispapad.github.io/daily-rhythm/" target="_blank" rel="noopener">Rhythm + iPhone calendar ↗</a>`)}
    <div class="row between"><div class="row"><button class="btn ghost sm" data-act="week" data-d="-1" aria-label="Previous week">←</button><button class="btn ghost sm" data-act="week" data-d="0">This week</button><button class="btn ghost sm" data-act="week" data-d="1" aria-label="Next week">→</button></div><b>${fmtShort(ws)} – ${fmtShort(days[6])}</b></div>
    <div class="week">${cells}</div>
    <div class="card"><h3>Add an event</h3>${quickAdd("event", {}, "Event: conference, talk, dinner…")}</div></div>`;
}

// ================= MONEY =================
function viewMoney() {
  const mk = UI.moneyMonth || monthKey(today());
  const m = moneySnapshot(mk), s = meta("settings").money || {};
  const runPct = m.runway == null ? 0 : (m.runway / m.goalMonths) * 100;
  const txns = all("txn").filter((x) => monthKey(x.date || "") === mk).sort((a, b) => (a.date < b.date ? 1 : -1));
  const cats = {}; for (const x of txns) if (x.kind !== "income") cats[x.cat || "Other"] = (cats[x.cat || "Other"] || 0) + num(x.amount);
  const catRows = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const catMax = Math.max(1, ...catRows.map((c) => c[1]));
  const months = monthsBack(12).reverse();
  return `<div class="page">${head("Money", "Money calms down when it's visible. Log it, see it, decide.", aiBtn("moneyAsk", "Ask Claude about my month"))}
    <div class="card"><div class="card-h"><h3>Your numbers</h3><span class="note">Change them any time</span></div>
      <div class="fgrid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
        <label class="f">Monthly floor (must cover) €<input class="input" type="number" inputmode="decimal" id="m-floor" data-money="floor" value="${esc(s.floor || "")}" placeholder="e.g. 1200"></label>
        <label class="f">Freedom target / month €<input class="input" type="number" inputmode="decimal" id="m-target" data-money="target" value="${esc(s.target || 3000)}"></label>
        <label class="f">Savings now €<input class="input" type="number" inputmode="decimal" id="m-savings" data-money="savings" value="${esc(s.savings || "")}" placeholder="0"></label>
        <label class="f">Safety goal (months)<input class="input" type="number" id="m-goal" data-money="goalMonths" value="${esc(s.goalMonths || 6)}"></label>
      </div></div>
    <div class="grid g4">
      <div class="card kpi"><span class="v">${eur(m.inc)}</span><span class="l">Income · ${monthName(mk)}</span>${bar((m.inc / (m.target || 1)) * 100, "good")}<span class="l">${Math.round((m.inc / (m.target || 1)) * 100)}% of your ${eur(m.target)} freedom target</span></div>
      <div class="card kpi"><span class="v">${eur(m.exp)}</span><span class="l">Spent · ${monthName(mk)}</span>${m.floor ? bar((m.exp / m.floor) * 100, m.exp > m.floor ? "now" : "") + `<span class="l">${m.exp > m.floor ? "Above" : "Within"} your ${eur(m.floor)} floor</span>` : '<span class="l">Set a floor to compare</span>'}</div>
      <div class="card kpi ${m.net < 0 ? "alert" : ""}"><span class="v">${eur(m.net)}</span><span class="l">Net this month</span></div>
      <div class="card kpi ${m.runway != null && m.runway < 3 ? "alert" : ""}"><span class="v">${m.runway == null ? "—" : m.runway.toFixed(1) + " months"}</span><span class="l">Runway (savings ÷ floor)</span>${bar(runPct, runPct >= 100 ? "good" : "")}<span class="l">Goal: ${m.goalMonths} months · ${eur(m.floor * m.goalMonths)}</span></div>
    </div>
    <div data-ai="moneyAsk">${aiBox("moneyAsk")}</div>
    <div class="grid g2"><div class="card"><div class="card-h"><h3>Last 6 months</h3></div>${moneyChart(6)}</div>
      <div class="card"><div class="card-h"><h3>Where it went · ${monthName(mk)}</h3></div>${catRows.length ? catRows.map(([c, v]) => `<div class="hbar"><span>${esc(c)}</span>${bar((v / catMax) * 100, "now")}<b>${eur(v)}</b></div>`).join("") : '<p class="note">No spending logged this month.</p>'}
        ${m.unpaid ? `<p class="note">Expected: ${eur(m.unpaid)} in unpaid invoices${m.overdue ? `, ${eur(m.overdue)} overdue` : ""}. <a href="#simasia" data-act="tab" data-key="simasia" data-val="invoices">See invoices</a></p>` : ""}</div></div>
    <div class="card"><div class="card-h"><h3>Log money</h3><select class="input" style="max-width:160px" data-act="moneyMonth" aria-label="Month">${months.map((k) => `<option value="${k}" ${k === mk ? "selected" : ""}>${parseYmd(k + "-01").toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</option>`).join("")}</select></div>
      <form class="addrow" data-form="txn">
        <select class="input" name="kind" aria-label="Type"><option value="expense">Spent</option><option value="income">Earned</option></select>
        <input class="input" name="title" placeholder="What for" required aria-label="Description">
        <input class="input" name="amount" type="number" inputmode="decimal" step="0.01" min="0" placeholder="€" required aria-label="Amount" style="flex:0 1 110px">
        <select class="input" name="cat" aria-label="Category">${TXN_CATS.map((c) => `<option ${c === "Other" ? "selected" : ""}>${esc(c)}</option>`).join("")}</select>
        <input class="input" name="date" type="date" value="${today()}" aria-label="Date"><button class="btn" type="submit">Log</button></form>
      <div class="list">${txns.map((x) => `<div class="it"><span class="areadot" style="${ac("money")};margin-top:7px"></span><div style="min-width:0"><button class="t" data-act="open" data-id="${x.id}">${esc(x.title || "Untitled")}</button><div class="m"><span class="chip">${esc(x.cat || "Other")}</span><span class="chip">${fmtShort(x.date)}</span></div></div><b style="color:${x.kind === "income" ? "var(--good)" : "var(--ink)"}">${x.kind === "income" ? "+" : "−"}${eur(num(x.amount), 1)}</b></div>`).join("") || emptyState("Nothing logged for this month", "Log every euro in and out. Ten seconds each, and the anxiety gets smaller.")}</div></div>
    <p class="note">PraxisAI shows your numbers; it isn't financial advice.</p></div>`;
}

// ================= CAREER & PHD =================
function viewCareer() {
  const opps = all("opp"), open = opps.filter(isOpen).sort((a, b) => (a.deadline || "9999") < (b.deadline || "9999") ? -1 : 1);
  const closed = opps.filter((o) => !isOpen(o));
  const paths = all("path");
  const dec = P ? P.goals.decision : { date: "2027-08-31", t: "Track A or Track B", d: "" };
  const decLeft = daysUntil(dec.date);
  const rows = open.map((o) => itemRow(o, { area: false, sub: [labelOf(OPP_KIND, o.kind), o.org, o.next && "Next: " + o.next].filter(Boolean).join(" · "), extra: `<span class="chip brand">${esc(labelOf(OPP_STATUS, o.status))}</span>${o.fit ? `<span class="chip">fit ${esc(o.fit)}/5</span>` : ""}`, right: o.link ? `<a class="btn quiet sm" href="${esc(o.link)}" target="_blank" rel="noopener">Link ↗</a>` : "" })).join("");
  return `<div class="page">${head("Career & PhD", "Every opportunity with its deadline. Apply to few, on purpose.", aiBtn("careerAsk", "Ask Claude: what should I do next?"))}
    <div class="grid g2"><div class="card" style="${ac("career")};border-top:3px solid var(--ac)"><span class="eyebrow">The decision</span><div class="kpi"><span class="v">${decLeft} days</span><span class="l">${esc(dec.t)} · ${fmtDay(dec.date)}</span></div><p class="note">${esc(dec.d)}</p></div>
      <div class="card"><span class="eyebrow">This month</span>${open.filter((o) => o.deadline && daysUntil(o.deadline) <= 31).slice(0, 4).map((o) => `<div class="dl"><span class="d ${daysUntil(o.deadline) < 0 ? "late" : ""}">${fmtShort(o.deadline)}</span><button class="t ev" style="${ac("career")}" data-act="open" data-id="${o.id}">${esc(o.title)}</button>${dueChip(o.deadline)}</div>`).join("") || '<p class="note">No deadlines in the next 31 days.</p>'}</div></div>
    <div data-ai="careerAsk">${aiBox("careerAsk")}</div>
    ${quickAdd("opp", {}, "New opportunity: programme, job, call…")}
    <div class="card"><div class="card-h"><h3>Open opportunities</h3><span class="note">${open.length}</span></div><div class="list">${rows || emptyState("No opportunities yet", "Add PhDs, jobs and calls with their deadlines.")}</div></div>
    <div class="card"><div class="card-h"><h3>Career paths I'm testing</h3></div><div class="list">${paths.map((p) => itemRow(p, { area: false, sub: p.next ? "Next test: " + p.next : "" })).join("") || '<p class="note">Write down each path and the smallest test that would teach you something.</p>'}</div>${quickAdd("path", {}, "A path, e.g. behavioural strategist…")}</div>
    ${closed.length ? `<details class="card"><summary><b>Closed (${closed.length})</b></summary><div class="list">${closed.map((o) => itemRow(o, { area: false, extra: `<span class="chip">${esc(labelOf(OPP_STATUS, o.status))}</span>` })).join("")}</div></details>` : ""}</div>`;
}

// ================= MIND =================
function viewMind() {
  const t = UI.tabs.mind;
  let body = "";
  if (t === "books") {
    const books = all("book");
    const card = (b) => { const pct = b.pages ? (num(b.page) / num(b.pages)) * 100 : 0; const n = all("booknote").filter((x) => x.book === b.id).length;
      return `<div class="card" style="${ac("mind")}"><div class="card-h"><button class="t" style="border:0;background:none;padding:0;text-align:left;font-weight:650;font-size:16px" data-act="open" data-id="${b.id}">${esc(b.title)}</button>${b.rating ? `<span class="chip">${"★".repeat(num(b.rating))}</span>` : ""}</div><span class="note">${esc(b.author || "")}</span>
        ${b.status === "reading" ? `${bar(pct)}<span class="note">${b.page ? `Page ${esc(b.page)}${b.pages ? " of " + esc(b.pages) : ""}` : "Not started"}</span>` : ""}<span class="note">${plural(n, "note")}</span></div>`; };
    const grp = (st, l) => { const g = books.filter((b) => b.status === st); return g.length ? `<h2>${l}</h2><div class="grid g3">${g.map(card).join("")}</div>` : ""; };
    body = `${quickAdd("book", {}, "Add a book…")}${grp("reading", "Reading now")}${grp("toread", "To read")}${grp("done", "Finished")}${books.length ? "" : emptyState("No books yet", "Add what you're reading. Open a book to keep notes in your own words.")}`;
  } else if (t === "therapy") {
    const th = all("therapy").sort((a, b) => ((a.date || "") < (b.date || "") ? 1 : -1));
    body = `<div class="banner"><span>Private: only you can open PraxisAI, and nothing here is shared.</span></div>${quickAdd("therapy", { date: today() }, "Today's main lesson…")}
      <div class="card"><div class="list">${th.map((x) => itemRow(x, { area: false, sub: x.practice ? "Practise: " + x.practice : "", extra: x.date ? `<span class="chip">${fmtShort(x.date)}</span>` : "" })).join("") || emptyState("No sessions yet", "After each session, write the one lesson and what you'll practise this week.")}</div></div>`;
  } else if (t === "lessons") {
    const ls = all("lesson").sort((a, b) => (b.created || 0) - (a.created || 0));
    body = `${quickAdd("lesson", { date: today() }, "A lesson I learned…")}<div class="card"><div class="list">${ls.map((x) => itemRow(x, { area: false, sub: [x.source, x.notes].filter(Boolean).join(" · ") })).join("") || emptyState("No lessons yet", "Courses, conversations, mistakes. One line each.")}</div></div>`;
  } else {
    const ns = all("note").sort((a, b) => (b.updated || 0) - (a.updated || 0));
    body = `${quickAdd("note", {}, "New note title…")}<div class="card"><div class="list">${ns.map((x) => itemRow(x, { sub: (x.notes || "").slice(0, 140) })).join("") || emptyState("No notes yet", "Anything worth keeping.")}</div></div>`;
  }
  return `<div class="page">${head("Mind", "Books, therapy lessons, learning and notes.")}${tabs("mind", [["books", "Books"], ["therapy", "Therapy"], ["lessons", "Lessons"], ["notes", "Notes"]])}${body}</div>`;
}

// ================= CREATE =================
function viewCreate() {
  const t = UI.tabs.create;
  let body = "";
  if (t === "writing") {
    const ws = all("writing").sort((a, b) => (b.updated || 0) - (a.updated || 0));
    body = `<div class="row"><button class="btn" data-act="newWriting" data-kind="poem">New poem</button><button class="btn ghost" data-act="newWriting" data-kind="prose">New prose</button><button class="btn ghost" data-act="newWriting" data-kind="essay">New post</button><button class="btn quiet" data-act="prompt">Give me a prompt</button></div>
      ${UI.prompt ? `<div class="ai-out">${esc(UI.prompt)}</div>` : ""}
      <div class="card"><div class="list">${ws.map((w) => `<div class="it"><span class="areadot" style="${ac("create")};margin-top:7px"></span><div style="min-width:0"><button class="t" data-act="write" data-id="${w.id}">${esc(w.title || "Untitled")}</button><div class="s">${esc((w.body || "").split("\n").filter(Boolean)[0] || "Empty page")}</div><div class="m"><span class="chip">${esc(labelOf(WRITE_KIND, w.kind))}</span><span class="chip">${esc(labelOf(WRITE_STATUS, w.status))}</span><span class="chip">${words(w.body)} words</span></div></div><button class="btn quiet sm" data-act="open" data-id="${w.id}">Details</button></div>`).join("") || emptyState("The playground is empty", "Start a poem. Nobody reads it unless you say so.")}</div></div>`;
  } else if (t === "projects") {
    const ps = all("project");
    body = `${quickAdd("project", {}, "A new project idea…")}<div class="board" style="grid-template-columns:repeat(5,minmax(200px,1fr))">${PROJ_STAGE.map(([k, l]) => `<div class="col"><div class="col-h"><span>${esc(l)}</span><span>${ps.filter((p) => p.stage === k).length}</span></div>${ps.filter((p) => p.stage === k).map((p) => `<div class="kc" style="${ac(areaOf(p))};cursor:default"><button class="t" data-act="open" data-id="${p.id}">${esc(p.title)}</button>${p.next ? `<span class="note">Next: ${esc(p.next)}</span>` : ""}</div>`).join("")}</div>`).join("")}</div>
      <p class="note">An active project needs a next step. Park the rest: parking is a decision, not a failure.</p>`;
  } else {
    const hs = all("hobby");
    body = `${quickAdd("hobby", {}, "A hobby…")}<div class="card"><div class="list">${hs.map((h) => itemRow(h, { area: false, sub: h.lastDone ? `Last time: ${relDay(h.lastDone)}` : "Not logged yet", right: `<button class="btn ghost sm" data-act="hobbyToday" data-id="${h.id}">Did it today</button>` })).join("") || emptyState("No hobbies listed", "Writing, theatre, the sea… list what feeds you.")}</div></div>`;
  }
  return `<div class="page">${head("Create", "Writing, projects and hobbies. Play counts.")}${tabs("create", [["writing", "Writing playground"], ["projects", "New projects"], ["hobbies", "Hobbies"]])}${body}</div>`;
}

// ================= GOALS & HABITS =================
function viewGoals() {
  const goals = all("goal"), habits = all("habit");
  const days = [...Array(7)].map((_, i) => addDays(today(), i - 6));
  const G = P ? P.goals : null;
  return `<div class="page">${head("Goals & habits", "Big direction, small daily votes.")}
    ${G ? `<div class="card" style="${ac("career")};border-top:3px solid var(--ac)"><span class="eyebrow">Life question</span><p style="font-family:var(--display);font-size:20px;line-height:1.35">${esc(G.lifeQuestion)}</p>
      <div class="grid g3">${G.stages.map((s, i) => `<div class="stack"><b>${esc(s.name)}${i === 0 ? ' <span class="chip late">You are here</span>' : ""}</b><span class="note">${esc(s.when)} · age ${esc(s.age)}</span><span class="small">${esc(s.moves)}</span><span class="note">Gate: ${esc(s.gate)}</span></div>`).join("")}</div></div>` : ""}
    <div class="card"><div class="card-h"><h3>Goals</h3></div>
      <div class="list">${goals.map((g) => { const pct = num(g.target) ? (num(g.current) / num(g.target)) * 100 : 0; return `<div class="it" style="${ac(areaOf(g))}"><span class="areadot" style="margin-top:7px"></span><div style="min-width:0"><button class="t" data-act="open" data-id="${g.id}">${esc(g.title)}</button><div class="m">${areaChip(areaOf(g))}${g.deadline ? dueChip(g.deadline, "by") : ""}</div><div style="margin-top:6px">${bar(pct, pct >= 100 ? "good" : "")}</div></div>
        <div class="row"><button class="btn ghost sm" data-act="goalStep" data-id="${g.id}" data-d="-1" aria-label="Decrease">−</button><b>${esc(g.current || 0)} / ${esc(g.target || 0)}</b><button class="btn ghost sm" data-act="goalStep" data-id="${g.id}" data-d="1" aria-label="Increase">+</button></div></div>`; }).join("") || '<p class="note">No goals yet.</p>'}</div>${quickAdd("goal", {}, "A goal with a number, e.g. Send 10 applications…")}</div>
    <div class="card"><div class="card-h"><h3>Habits · last 7 days</h3><span class="note">Tap a day to tick it</span></div>
      <div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;min-width:520px"><thead><tr><th style="text-align:left;padding:6px"></th>${days.map((d) => `<th class="small muted" style="padding:6px;font-weight:600">${parseYmd(d).toLocaleDateString("en-GB", { weekday: "short" })}<br>${parseYmd(d).getDate()}</th>`).join("")}<th class="small muted">Streak</th></tr></thead>
      <tbody>${habits.map((h) => `<tr><td style="padding:6px"><button class="t" style="border:0;background:none;padding:0;font-weight:600;text-align:left" data-act="open" data-id="${h.id}">${esc(h.title)}</button>${h.cue ? `<div class="note">${esc(h.cue)}</div>` : ""}</td>${days.map((d) => `<td style="text-align:center;padding:4px"><button class="tick" style="margin:auto" data-act="habit" data-id="${h.id}" data-d="${d}" aria-pressed="${!!(h.log || {})[d]}" aria-label="${esc(h.title)} on ${fmtShort(d)}">${ICON.check}</button></td>`).join("")}<td style="text-align:center"><b>${streak(h)}</b></td></tr>`).join("")}</tbody></table></div>
      ${habits.length ? "" : '<p class="note">Atomic Habits: make it obvious, attractive, easy, satisfying. Start with something that takes two minutes.</p>'}
      ${quickAdd("habit", {}, "A tiny habit, e.g. Read 2 pages…")}</div></div>`;
}

// ================= WHITEBOARD =================
const STICKY = ["#FFE58F", "#BAE6FD", "#FBCFE8", "#BBF7D0", "#E9D5FF"];
function viewBoard() {
  const boards = [...S.boards.entries()].map(([id, b]) => Object.assign({ id }, b)).sort((a, b) => (b.updated || 0) - (a.updated || 0));
  if (!UI.board || !S.boards.has(UI.board)) UI.board = boards[0] ? boards[0].id : null;
  const b = UI.board ? S.boards.get(UI.board) : null;
  const notes = b ? b.notes || [] : [];
  return `<div class="page">${head("Whiteboard", "Throw thoughts on the wall, move them around, turn the good ones into tasks.")}
    <div class="row">${boards.length ? `<select class="input" style="max-width:240px" data-act="pickBoard" aria-label="Board">${boards.map((x) => `<option value="${x.id}" ${x.id === UI.board ? "selected" : ""}>${esc(x.title || "Untitled board")}</option>`).join("")}</select>` : ""}
      <button class="btn ghost" data-act="newBoard">New board</button>
      ${b ? `<input class="input" style="max-width:240px" id="bt-${UI.board}" data-board-title="${UI.board}" value="${esc(b.title || "")}" aria-label="Board name"><span class="note">Add:</span>${STICKY.map((c) => `<button class="swatch" style="--sc:${c}" data-act="addSticky" data-c="${c}" aria-label="Add sticky note"></button>`).join("")}` : ""}</div>
    ${b ? `<div class="wb-wrap" id="wbwrap"><div class="wb" id="wb">${notes.map((n) => `<div class="sticky" data-note="${n.id}" style="--sc:${esc(n.c)};left:${num(n.x)}px;top:${num(n.y)}px"><div class="sh" data-handle="${n.id}"><button data-act="noteTask" data-n="${n.id}" title="Make it a task" aria-label="Make it a task">✓</button><button data-act="delSticky" data-n="${n.id}" aria-label="Delete note">×</button></div><textarea data-sticky="${n.id}" id="st-${n.id}" aria-label="Sticky note">${esc(n.t || "")}</textarea></div>`).join("")}</div></div>`
      : emptyState("No boards yet", "Create a board for a decision, a project, or a messy week.", '<button class="btn" data-act="newBoard">Create a board</button>')}</div>`;
}

// ================= THINK WITH CLAUDE =================
const THINK_PROMPTS = [
  ["Plan my day", "Look at my tasks and deadlines and give me a realistic plan for today: max 3 priorities, in order, with the first tiny step for each."],
  ["I'm stuck", "I'm stuck and can't start. Ask me one question at a time to find the smallest next step."],
  ["Help me decide", "Help me decide between options. First ask me what the options are, then help me compare them on what matters to me."],
  ["Career next step", "Based on my goals and opportunities, what is the single most useful career action for this week, and why?"],
  ["Weekly review", "Run a short weekly review with me: what went well, what slipped, and the 3 outcomes for next week. One question at a time."],
  ["Write a post idea", "Give me 3 LinkedIn post ideas from my work this week, in my voice: start from a person and a need, then the technology."]
];
function viewThink() {
  const threads = [...S.threads.entries()].map(([id, t]) => Object.assign({ id }, t)).sort((a, b) => (b.updated || 0) - (a.updated || 0));
  if (UI.thread && !S.threads.has(UI.thread) && UI.thread !== "new") UI.thread = null;
  const th = UI.thread && UI.thread !== "new" ? S.threads.get(UI.thread) : null;
  const msgs = th ? th.msgs || [] : [];
  const live = UI.ai.chat;
  if (!CAP.sample) return `<div class="page">${head("Think with Claude", "A place to think out loud.")}<div class="banner warn">Claude answers here when PraxisAI is open on claude.ai. Your past conversations are still below.</div>${threads.map((t) => `<p>${esc(t.title)}</p>`).join("")}</div>`;
  return `<div class="page">${head("Think with Claude", "A place to think out loud. Claude sees a short summary of your tasks, deadlines, goals and money, nothing else.", `<button class="btn ghost" data-act="newThread">New conversation</button>`)}
    ${threads.length ? `<div class="chips">${threads.slice(0, 8).map((t) => `<button class="pill" data-act="pickThread" data-id="${t.id}" aria-pressed="${t.id === UI.thread}">${esc((t.title || "Conversation").slice(0, 40))}</button>`).join("")}</div>` : ""}
    <div class="card"><div class="chat" id="chat">${msgs.map((m) => `<div class="msg ${m.role}">${esc(m.content)}</div>`).join("")}
      ${live && live.pendingUser ? `<div class="msg user">${esc(live.pendingUser)}</div>` : ""}
      ${live && (live.loading || live.text) ? `<div class="msg assistant" id="live">${esc(live.text || "Thinking…")}</div>` : ""}
      ${live && live.err ? `<div class="banner warn">${esc(live.err)}</div>` : ""}
      ${!msgs.length && !live ? `<p class="muted">Start with one of these, or write your own.</p><div class="prompts">${THINK_PROMPTS.map(([l], i) => `<button class="pill" data-act="thinkPrompt" data-i="${i}">${esc(l)}</button>`).join("")}</div>` : ""}</div>
      <form class="addrow" data-form="chat"><textarea class="input" id="chatbox" name="m" rows="2" placeholder="Think out loud… (tap the microphone on your keyboard to dictate)" aria-label="Message to Claude"></textarea>
        ${live && live.loading ? `<button class="btn ghost" type="button" data-act="stopChat">Stop</button>` : `<button class="btn" type="submit">Send</button>`}</form></div></div>`;
}

// ================= CAPTURE INBOX =================
function viewInbox() {
  const caps = all("capture").sort((a, b) => (b.created || 0) - (a.created || 0));
  const so = UI.sort;
  return `<div class="page">${head("Capture inbox", "Empty your head here. Sort it later, or let Claude sort it.", caps.length ? aiBtn("sortInbox", `Sort ${plural(caps.length, "thought")} with Claude`) : "")}
    <form class="card" data-form="capture"><textarea class="input" id="dump" name="t" rows="4" placeholder="Everything on your mind, one thought per line. On iPhone, tap the keyboard's microphone to speak instead of typing." aria-label="Brain dump"></textarea>
      <div class="row between"><span class="note">One line = one thought.</span><button class="btn" type="submit">Save to inbox</button></div></form>
    ${so && so.loading ? '<div class="ai-out muted">Claude is sorting your thoughts…</div>' : ""}
    ${so && so.err ? `<div class="banner warn">${esc(so.err)}</div>` : ""}
    ${so && so.items ? `<div class="card"><div class="card-h"><h3>Claude's suggestion</h3><span class="note">Untick anything you don't want</span></div>
      <div class="list">${so.items.map((s, i) => `<label class="it" style="cursor:pointer"><input type="checkbox" class="cbx" data-sorti="${i}" ${s.keep !== false ? "checked" : ""}><div style="min-width:0"><b>${esc(s.title)}</b><div class="m"><span class="chip">${esc((TYPES[s.type] || TYPES.task).label)}</span>${areaChip(AREAS[s.area] ? s.area : "life")}${s.due ? dueChip(s.due) : ""}</div></div><span></span></label>`).join("")}</div>
      <div class="row"><button class="btn" data-act="applySort">Create selected</button><button class="btn quiet" data-act="cancelSort">Cancel</button></div></div>` : ""}
    <div class="card"><div class="card-h"><h3>Unsorted</h3><span class="note">${caps.length}</span></div><div class="list">${caps.map((c) => `<div class="it"><span class="areadot" style="${ac("life")};margin-top:7px"></span><div style="min-width:0"><div style="overflow-wrap:anywhere">${esc(c.title)}</div><div class="m"><span class="chip">${new Date(c.created || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span></div></div>
      <div class="row"><select class="input" style="width:auto;padding:5px 8px;font-size:13px" data-act="convert" data-id="${c.id}" aria-label="Turn into"><option value="">Turn into…</option><option value="task">Task</option><option value="note">Note</option><option value="project">Project idea</option><option value="lead">Lead</option><option value="event">Event</option><option value="writing">Writing</option><option value="lesson">Lesson</option></select><button class="btn quiet sm" data-act="delCapture" data-id="${c.id}" aria-label="Delete">×</button></div></div>`).join("") || emptyState("Inbox zero", "Your head is clear. Use the red + button any time a thought arrives.")}</div></div></div>`;
}

// ================= SETTINGS =================
function viewSettings() {
  const s = meta("settings");
  const counts = {}; for (const it of S.items.values()) counts[it.type] = (counts[it.type] || 0) + 1;
  const sync = S.mode === "cloud" ? (S.err ? `<span class="dot bad"></span>Sync stopped (${esc(S.err)}). Reload the page.` : S.cached ? '<span class="dot warn"></span>Connecting…' : '<span class="dot ok"></span>Synced with claude.ai on all your devices')
    : '<span class="dot warn"></span>Saved on this device only (open PraxisAI on claude.ai to sync)';
  return `<div class="page">${head("Settings", "How PraxisAI works for you.")}
    <div class="card"><h3>Sync</h3><p>${sync}</p><p class="note">${S.items.size} items · ${S.boards.size} boards · ${S.threads.size} conversations</p></div>
    <div class="card"><h3>About me (what Claude knows)</h3><textarea class="input" id="s-about" data-setting="aboutMe" rows="6" placeholder="Who you are, what you're working towards, how you like answers. Claude reads this before every answer in PraxisAI.">${esc(s.aboutMe || "")}</textarea><p class="note">Private to you. Claude also sees a short summary of your open tasks, deadlines, goals and this month's money.</p></div>
    <div class="card"><h3>Focus timer</h3><div class="fgrid"><label class="f">Focus minutes<input class="input" type="number" id="s-focus" data-setting="focusLen" value="${esc(s.focusLen || 25)}"></label><label class="f">Break minutes<input class="input" type="number" id="s-break" data-setting="breakLen" value="${esc(s.breakLen || 5)}"></label></div></div>
    <div class="card"><h3>Gmail</h3><label class="f">Inbox search used in SimasiaAI → Gmail<input class="input" id="s-gq" data-setting="gmailQuery" value="${esc(s.gmailQuery || "in:inbox newer_than:7d -category:promotions -category:social")}"></label><p class="note">PraxisAI only reads threads and saves drafts. It never sends email.</p></div>
    <div class="card"><h3>Backup</h3><p class="note">Download everything as one file. Keep it somewhere safe once a month.</p><div class="row">${CAP.downloads ? '<button class="btn ghost" data-act="backup">Download backup</button>' : '<span class="note">Backup download works on claude.ai.</span>'}<label class="btn ghost" for="restore">Restore from file</label><input type="file" id="restore" accept="application/json,.json" hidden></div></div>
    <div class="card"><h3>What's inside</h3><p class="note">${Object.entries(counts).map(([k, v]) => `${v} ${TYPES[k] ? TYPES[k].label.toLowerCase() : k}`).join(" · ") || "Nothing yet"}</p></div></div>`;
}
const VIEWS = { focus: viewFocus, overview: viewOverview, tasks: viewTasks, simasia: viewSimasia, plan: viewPlan, money: viewMoney, career: viewCareer, mind: viewMind, create: viewCreate, goals: viewGoals, board: viewBoard, think: viewThink, inbox: viewInbox, settings: viewSettings };
