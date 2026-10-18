(() => {
const P = window.PLAN;
const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, "0");
const toMin = (hm) => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
const KEYS = ["sun","mon","tue","wed","thu","fri","sat"];
const now = () => new Date();
const ymd = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const todayKey = () => KEYS[now().getDay()];
// date of weekday k within the current Mon–Sun week
function dateForKey(k){ const d = now(); const dow = (d.getDay() + 6) % 7; const idx = P.ORDER.indexOf(k); const x = new Date(d); x.setDate(d.getDate() - dow + idx); return ymd(x); }
const weekDates = () => P.ORDER.map(dateForKey);

// ---------- state ----------
let state = { done: {}, sprint: {}, oneoff: {} };
const LS = "rhythm-state-v1";
try { const s = JSON.parse(localStorage.getItem(LS) || "null"); if (s) state = Object.assign(state, s); } catch (e) {}
let storageOk = true;

function prune(){ const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 120); const c = ymd(cutoff);
  for (const m of ["done","oneoff"]) for (const k of Object.keys(state[m])) if (k < c) delete state[m][k]; }
function save(){
  prune();
  try { localStorage.setItem(LS, JSON.stringify(state)); storageOk = true; } catch (e) { storageOk = false; }
  setSync(storageOk ? "Progress saved on this device" : "This browser isn't saving progress (private mode?)");
}
const setSync = (t) => { $("#sync").textContent = t; };

// ---------- ui state ----------
const TABS = ["today","week","food","goals","setup"];
let tab = "today", dayView = todayKey();
try { const t = localStorage.getItem("rhythm-tab"); if (TABS.includes(t)) tab = t; } catch (e) {}
if (TABS.includes(location.hash.slice(1))) tab = location.hash.slice(1);

const isDone = (date, id) => (state.done[date] || []).includes(id);
function toggle(date, id){ const a = new Set(state.done[date] || []); a.has(id) ? a.delete(id) : a.add(id); state.done[date] = [...a]; save(); render(); }

const checkSvg = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 7.5l3 3 6-7" fill="none" stroke="var(--surface)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const catVar = (c) => `--cat:var(--c-${c})`;

// ---------- now card ----------
function currentBlock(){
  const k = todayKey(), d = now(), m = d.getHours() * 60 + d.getMinutes();
  const bl = P.days[k].blocks;
  const cur = bl.find(b => toMin(b.s) <= m && m < toMin(b.e));
  const next = bl.find(b => toMin(b.s) > m);
  return { k, m, cur, next, bl };
}
function renderNow(){
  const { k, m, cur, next } = currentBlock();
  const d = now();
  const clock = pad(d.getHours()) + ":" + pad(d.getMinutes());
  let html;
  if (cur) {
    const s = toMin(cur.s), e = toMin(cur.e), left = e - m, pct = Math.round(((m - s) / (e - s)) * 100);
    const leftTxt = left >= 60 ? Math.floor(left / 60) + " h " + (left % 60) + " min left" : left + " min left";
    html = `<div class="now-top"><span class="now-label"><span class="pulse"></span>Now · ${P.cats[cur.cat]}</span><span class="clock">${clock}</span></div>
      <h2 ${cur.tag==="stop"?'style="color:var(--now)"':''}>${cur.t}</h2><p>${cur.d}</p>
      <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
      <div class="now-meta"><span>${cur.s}–${cur.e === "24:00" ? "00:00" : cur.e} · <b>${leftTxt}</b></span>${next ? `<span>Next <b>${next.s} ${next.t}</b></span>` : `<span>Tomorrow: <b>${P.days[KEYS[(d.getDay()+1)%7]].blocks[0].s} ${P.days[KEYS[(d.getDay()+1)%7]].blocks[0].t}</b></span>`}</div>`;
  } else {
    const nxt = next || P.days[KEYS[(d.getDay()+1)%7]].blocks[0];
    html = `<div class="now-top"><span class="now-label"><span class="pulse"></span>Now · Rest</span><span class="clock">${clock}</span></div>
      <h2>Sleep. Recovery is part of the plan.</h2><p>Your day starts with <b>${nxt.t}</b> at ${nxt.s}.</p>`;
  }
  $("#nowCard").innerHTML = html;
  $("#hdDate").textContent = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) + " · " + P.days[k].theme;
}

// ---------- today / day view ----------
function renderDay(){
  const k = dayView, day = P.days[k], date = dateForKey(k), isToday = k === todayKey();
  const { m } = currentBlock();
  const chips = P.ORDER.map(x => `<button class="chip ${x===todayKey()?"today":""}" aria-pressed="${x===k}" data-day="${x}">${P.days[x].short}</button>`).join("");
  const doneCount = day.blocks.filter(b => isDone(date, b.id)).length;
  let one = "";
  const oo = P.oneOffs[date];
  if (oo) {
    const od = state.oneoff[date] || [];
    one = `<div class="card oneoff"><div class="section-head"><h3>This Sunday's list</h3><span>${od.length}/${oo.length} done · from your plan</span></div><ul>${
      oo.map(o => `<li class="${od.includes(o.id)?"done":""}"><button class="check" aria-pressed="${od.includes(o.id)}" aria-label="Mark ${o.t} done" data-oneoff="${o.id}">${checkSvg}</button><span>${o.t}</span></li>`).join("")}</ul></div>`;
  }
  const items = day.blocks.map(b => {
    const s = toMin(b.s), e = toMin(b.e);
    const st = isToday ? (m >= e ? "past" : (m >= s ? "current" : "")) : "";
    const dn = isDone(date, b.id);
    return `<li class="tl ${st} ${dn?"done":""} ${b.tag==="stop"?"stop":""}" style="${catVar(b.cat)}">
      <span class="t">${b.s}</span><span class="rail"><span class="dot"></span></span>
      <div class="body"><div class="ttl">${b.t}</div><div class="det">${b.d}</div><span class="tag">${P.cats[b.cat]} · until ${b.e==="24:00"?"00:00":b.e}</span></div>
      <button class="check" aria-pressed="${dn}" aria-label="Mark ${b.t} done" data-done="${b.id}">${checkSvg}</button></li>`;
  }).join("");
  return `<div class="chips" role="group" aria-label="Day">${chips}</div>
    ${one}
    <div class="section-head"><h2>${day.name}: ${day.theme}</h2><span>${doneCount}/${day.blocks.length} done</span></div>
    <ul class="timeline">${items}</ul>`;
}

// ---------- week ----------
function renderWeek(){
  const START = 7 * 60, END = 24 * 60, PX = 0.62; // px per minute
  const H = (END - START) * PX;
  let gut = `<div class="wk-gut" style="height:${H}px">`;
  for (let h = 8; h < 24; h += 2) gut += `<span style="top:${(h*60-START)*PX}px">${pad(h)}:00</span>`;
  gut += "</div>";
  const cols = P.ORDER.map(k => {
    let c = `<div class="wk-col" style="height:${H}px">`;
    for (let h = 8; h < 24; h += 2) c += `<div class="hr" style="top:${(h*60-START)*PX}px"></div>`;
    for (const b of P.days[k].blocks) {
      const s = Math.max(toMin(b.s), START), e = toMin(b.e); if (e <= START) continue;
      const hgt = (e - s) * PX - 2;
      c += `<div class="wk-b" style="${catVar(b.cat)};top:${(s-START)*PX+1}px;height:${hgt}px" title="${b.s}–${b.e} ${b.t}">${hgt > 18 ? `<b>${b.t}</b>` : ""}${hgt > 34 ? `<span>${b.s}</span>` : ""}</div>`;
    }
    return c + "</div>";
  }).join("");
  const heads = `<div class="wk-h"></div>` + P.ORDER.map(k => `<div class="wk-h ${k===todayKey()?"today":""}">${P.days[k].short}</div>`).join("");
  const legend = Object.entries(P.cats).map(([k, v]) => `<span style="${catVar(k)}"><i></i>${v}</span>`).join("");
  // hours per category
  const tot = {}; for (const k of P.ORDER) for (const b of P.days[k].blocks) { if (b.id.endsWith("sleep")) continue; tot[b.cat] = (tot[b.cat]||0) + toMin(b.e) - toMin(b.s); }
  const hrs = (c) => Math.round((tot[c]||0) / 60);
  return `<div class="section-head"><h2>Your week at a glance</h2><span>Scroll sideways on a phone</span></div>
    <div class="legend">${legend}</div>
    <div class="week-scroll"><div class="week">${heads}${gut}${cols}</div></div>
    <div class="card"><h3>Where the week's hours go</h3>
      <div class="split">
        <div><div class="big">${hrs("work")} h</div><div class="note">SimasiaAI, all inside 08:00–18:00, Mon–Fri</div></div>
        <div><div class="big">${hrs("deep")} h</div><div class="note">Mastery: applications, study, writing posts, talks, money</div></div>
        <div><div class="big">${hrs("people")} h</div><div class="note">Friends, family and one practitioner conversation</div></div>
        <div><div class="big">${hrs("body")} h</div><div class="note">3 gym sessions, outdoors Saturday, daily walks</div></div>
      </div>
      <p class="note" style="margin:0">Rules that hold the week together: work stops at 18:00, Saturday is work-free, Tuesday and Thursday mornings belong to your own future.</p>
    </div>`;
}

// ---------- food ----------
function renderFood(){
  const k = todayKey(), ml = P.meals[k];
  const times = {}; for (const b of P.days[k].blocks) { if (b.cat === "food") { if (!times.b) times.b = b.s; else if (b.t.toLowerCase().includes("lunch")) times.l = b.s; else if (b.t.toLowerCase().includes("snack")) times.s = b.s; else if (b.t.toLowerCase().includes("dinner")) times.d = b.s; } }
  if (!times.d) { const f = P.days[k].blocks.find(b => /friends|night/i.test(b.t) && toMin(b.s) >= 19*60); if (f) times.d = f.s; }
  const card = (key, label) => `<div class="meal"><span class="when">${label}${times[key] ? " · " + times[key] : ""}</span><span class="what">${ml[key]}</span></div>`;
  const rows = P.ORDER.map(x => `<tr class="${x===k?"today":""}"><td><b>${P.days[x].short}</b></td><td>${P.meals[x].b}</td><td>${P.meals[x].l}</td><td>${P.meals[x].s}</td><td>${P.meals[x].d}</td></tr>`).join("");
  return `<div class="section-head"><h2>Today's plates</h2><span>${P.days[k].name}</span></div>
    <div class="meals">${card("b","Breakfast")}${card("l","Lunch")}${card("s","Snack")}${card("d","Dinner")}</div>
    <div class="card"><h3>How you eat</h3><ul class="rules">${P.foodRules.map(r => `<li>${r}</li>`).join("")}</ul>
    <p class="note" style="margin:0">A simple Mediterranean pattern, not a diet. If you want targets for training or weight, ask a dietitian to tune it.</p></div>
    <div class="section-head"><h2>The week's menu</h2><span>Sunday's meal prep covers Mon–Wed lunches</span></div>
    <div class="tbl-scroll"><table><thead><tr><th>Day</th><th>Breakfast</th><th>Lunch</th><th>Snack</th><th>Dinner</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

// ---------- goals ----------
function renderGoals(){
  const G = P.goals, sp = G.sprint;
  const daysLeft = Math.max(0, Math.ceil((new Date(sp.end + "T23:59:59") - now()) / 86400000));
  const counters = sp.items.map(it => { const v = state.sprint[it.k] || 0, pct = Math.min(100, Math.round(v / it.target * 100));
    return `<div class="counter ${v>=it.target?"met":""}"><span class="lbl">${it.t}</span>
      <span class="ctl"><button aria-label="Decrease ${it.t}" data-sp="${it.k}" data-d="-1">−</button><span class="num">${v} / ${it.target}</span><button aria-label="Increase ${it.t}" data-sp="${it.k}" data-d="1">+</button></span>
      <div class="bar"><i style="width:${pct}%"></i></div></div>`; }).join("");
  // weekly scoreboard from ticks
  const wd = weekDates(); const tagCount = {};
  P.ORDER.forEach((k, i) => { for (const b of P.days[k].blocks) if (b.tag && isDone(wd[i], b.id)) tagCount[b.tag] = (tagCount[b.tag]||0) + 1; });
  const scores = G.weekly.map(w => { const v = tagCount[w.tag]||0, pct = Math.min(100, Math.round(v / w.target * 100));
    return `<div class="score ${v>=w.target?"met":""}"><span>${w.t}</span><span class="v">${v} / ${w.target}</span><div class="bar"><i style="width:${pct}%"></i></div></div>`; }).join("");
  const allTicks = wd.reduce((a, d) => a + (state.done[d]||[]).length, 0);
  const decLeft = Math.ceil((new Date(G.decision.date + "T00:00:00") - now()) / 86400000);
  const stages = G.stages.map((s, i) => `<div class="stage ${i===0?"on":""}"><span class="sd"></span><div><h3>${s.name}</h3><div class="when">${s.when} · age ${s.age}${i===0?" · you are here":""}</div><p>${s.moves}</p><div class="gate">Gate: ${s.gate}</div></div></div>`).join("");
  return `<div class="card"><div class="section-head"><h3>30-day sprint</h3><span>${daysLeft} days left · ends 17 Nov</span></div>${counters}</div>
    <div class="card"><div class="section-head"><h3>This week's scoreboard</h3><span>${allTicks} blocks ticked</span></div>
      <p class="note" style="margin:0">Fills in as you tick blocks in Today. Review it every Sunday at 17:00.</p>${scores}</div>
    <div class="split">
      <div class="card"><span class="eyebrow">Next big decision</span><div class="big">${decLeft} days</div><h3>${G.decision.t} · 31 Aug 2027</h3><p class="note" style="margin:0">${G.decision.d}</p></div>
      <div class="card"><span class="eyebrow">The question</span><p style="margin:0;font-family:var(--display);font-size:18px;line-height:1.35">${G.lifeQuestionGr}</p><p class="note" style="margin:0">Every block in this app serves one stage of the answer.</p></div>
    </div>
    <div class="card"><h3>The path, 2026–2036</h3><div class="stages">${stages}</div></div>`;
}

// ---------- setup: calendar, install, backup ----------
const ICS_FILE = "Daily-Rhythm.ics";
const icsHttps = () => new URL(ICS_FILE, location.href).href;
const icsWebcal = () => icsHttps().replace(/^https?:/, "webcal:");
const isHosted = () => /^https?:$/.test(location.protocol) && !/^(localhost|127\.)/.test(location.hostname);
function renderSetup(){
  const sub = isHosted()
    ? `<a class="btn" href="${icsWebcal()}">Subscribe in Apple Calendar</a>
       <p class="note" style="margin:0">Subscribing keeps the calendar in sync: when the plan changes on GitHub, your calendar updates by itself within a few hours. Calendar address:</p>
       <div class="copyrow"><code id="feedUrl">${icsHttps()}</code><button class="btn ghost" id="copyFeed">Copy</button></div>`
    : `<p class="note" style="margin:0">Once the app is online (GitHub Pages), a one-tap <b>Subscribe</b> button appears here. Until then, use the file below.</p>`;
  return `<div class="card"><h3>Apple Calendar</h3>
    ${sub}
    <ol class="steps">
      <li><b>Subscribe (recommended):</b> on iPhone, tap the button and confirm <b>Subscribe</b>. On a Mac: Calendar → File → New Calendar Subscription, paste the address, and set Auto-refresh to <b>Every hour</b>.</li>
      <li><b>Or import once:</b> <a href="${ICS_FILE}" download>download Daily-Rhythm.ics</a> and open it. iPhone: <b>Add All</b>. Mac: choose <b>New Calendar</b>.</li>
      <li>Every block repeats weekly in Athens time, with reminders before the gym, the 18:00 STOP WORK, wind-down and the Sunday review. It also adds the sprint review on 17 Nov and the Track A/B decision on 31 Aug 2027.</li>
    </ol>
    <p class="note" style="margin:0">Short items (snacks, breaks, wake-up) stay in the app only, so your calendar isn't crowded. Use only one of the two methods, or you'll see every event twice.</p></div>
    <div class="card"><h3>Install on your iPhone</h3>
    <ol class="steps">
      <li>Open this page in <b>Safari</b>.</li>
      <li>Tap <b>Share</b>, then <b>Add to Home Screen</b>, then <b>Add</b>.</li>
      <li>Open <b>Rhythm</b> from your home screen. It runs full screen and works offline.</li>
    </ol></div>
    <div class="card"><h3>Back up your progress</h3>
      <p class="note" style="margin:0">Ticks and sprint counters live on this device only. Save a backup before changing phones or clearing Safari data, then restore it on the new device.</p>
      <div class="btnrow"><button class="btn ghost" id="exportBtn">Save backup</button>
      <label class="btn ghost" for="importFile">Restore backup</label>
      <input type="file" id="importFile" accept="application/json,.json" hidden></div></div>
    <p class="note">Want to change the routine? Edit <b>plan.js</b> on GitHub (or ask Claude). The app and the calendar feed rebuild themselves after every change.</p>`;
}

// ---------- render ----------
function render(){
  renderNow();
  document.querySelectorAll("nav.tabs button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
  const p = $("#panel");
  p.innerHTML = tab === "today" ? renderDay() : tab === "week" ? renderWeek() : tab === "food" ? renderFood() : tab === "goals" ? renderGoals() : renderSetup();
}
function toast(t){ const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => el.hidden = true, 1800); }

document.addEventListener("click", async (e) => {
  const t = e.target.closest("button"); if (!t) return;
  if (t.dataset.tab) { tab = t.dataset.tab; try { localStorage.setItem("rhythm-tab", tab); } catch (_) {} history.replaceState(null, "", "#" + tab); render(); return; }
  if (t.dataset.day) { dayView = t.dataset.day; render(); return; }
  if (t.dataset.done) { toggle(dateForKey(dayView), t.dataset.done); return; }
  if (t.dataset.oneoff) { const d = dateForKey(dayView); const a = new Set(state.oneoff[d] || []); a.has(t.dataset.oneoff) ? a.delete(t.dataset.oneoff) : a.add(t.dataset.oneoff); state.oneoff[d] = [...a]; save(); render(); return; }
  if (t.dataset.sp) { const k = t.dataset.sp; state.sprint[k] = Math.max(0, (state.sprint[k] || 0) + Number(t.dataset.d)); save(); render(); return; }
  if (t.id === "copyFeed") {
    try { await navigator.clipboard.writeText(icsHttps()); toast("Copied"); }
    catch (_) { const r = document.createRange(); r.selectNodeContents($("#feedUrl")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast("Selected. Press Copy"); }
    return;
  }
  if (t.id === "exportBtn") {
    const blob = new Blob([JSON.stringify({ app: "daily-rhythm", saved: new Date().toISOString(), state }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "daily-rhythm-backup-" + ymd(now()) + ".json";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("Backup saved"); return;
  }
});

document.addEventListener("change", async (e) => {
  if (e.target.id !== "importFile" || !e.target.files[0]) return;
  try {
    const data = JSON.parse(await e.target.files[0].text());
    const s = data && data.state;
    if (!s || typeof s !== "object" || !s.done) throw new Error("bad");
    state = { done: Object.assign({}, s.done), sprint: Object.assign({}, s.sprint), oneoff: Object.assign({}, s.oneoff) };
    save(); render(); toast("Backup restored");
  } catch (_) { toast("That file isn't a Daily Rhythm backup"); }
  e.target.value = "";
});

$("#question").textContent = P.goals.lifeQuestion;
render();
save();
if ("serviceWorker" in navigator && isHosted()) navigator.serviceWorker.register("sw.js").catch(() => {});
setInterval(() => { renderNow(); if (tab === "today" && dayView === todayKey()) render(); }, 60000);
})();
