(() => {
const P = window.PLAN;
const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, "0");
const toMin = (hm) => { const [h, m] = hm.split(":").map(Number); return h * 60 + m; };
const hm = (m) => m >= 1440 ? "00:00" : pad(Math.floor(m / 60)) + ":" + pad(m % 60);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const KEYS = ["sun","mon","tue","wed","thu","fri","sat"];
const now = () => new Date();
const ymd = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const todayKey = () => KEYS[now().getDay()];
const nowMin = () => { const d = now(); return d.getHours() * 60 + d.getMinutes(); };
// date of weekday k within the current Mon–Sun week
function dateForKey(k){ const d = now(); const dow = (d.getDay() + 6) % 7; const idx = P.ORDER.indexOf(k); const x = new Date(d); x.setDate(d.getDate() - dow + idx); return ymd(x); }
const weekDates = () => P.ORDER.map(dateForKey);
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
const lsSet = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (_) {} };

// ---------- progress state ----------
let state = { done: {}, sprint: {}, oneoff: {} };
const LS = "rhythm-state-v1";
try { const s = JSON.parse(lsGet(LS) || "null"); if (s) state = Object.assign(state, s); } catch (e) {}
let storageOk = true;

function prune(){ const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 120); const c = ymd(cutoff);
  for (const m of ["done","oneoff"]) for (const k of Object.keys(state[m])) if (k < c) delete state[m][k]; }
function save(){
  prune();
  try { localStorage.setItem(LS, JSON.stringify(state)); storageOk = true; } catch (e) { storageOk = false; }
  setSync(storageOk ? "Progress saved on this device" : "This browser isn't saving progress (private mode?)");
}
const setSync = (t) => { $("#sync").textContent = t; };

// ---------- iPhone calendar (encrypted events published by the GitHub Action) ----------
const CAL_PASS = "rhythm-cal-pass", CAL_CACHE = "rhythm-cal-cache";
// status: loading | none (not set up) | needpass | badpass | ok | offline
const cal = { status: "loading", events: [], updated: null, calendars: [], lastData: null };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function decryptFile(f, pass) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: unb64(f.salt), iterations: f.iter }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(f.iv) }, key, unb64(f.data));
  return JSON.parse(new TextDecoder().decode(plain));
}
function applyPlain(p){
  cal.events = (p.events || []).map((e) => e.allDay ? Object.assign({}, e) : Object.assign({}, e, { sMs: Date.parse(e.s), eMs: Date.parse(e.e) }));
  cal.updated = p.updated || null; cal.calendars = p.calendars || [];
}
function useCache(){
  try { const c = JSON.parse(lsGet(CAL_CACHE) || "null"); if (c) { applyPlain(c); return true; } } catch (_) {}
  return false;
}
let loading = false;
async function loadCalendar(){
  if (loading) return; loading = true;
  try {
    let file = null, missing = false;
    try {
      const r = await fetch("events.enc.json?t=" + Date.now(), { cache: "no-store" });
      if (r.ok) file = await r.json(); else if (r.status === 404) missing = true;
    } catch (_) {}
    if (missing) { cal.status = "none"; cal.events = []; lsSet(CAL_CACHE, null); return; }
    if (!file) { cal.status = useCache() ? "offline" : (cal.status === "loading" ? "none" : cal.status); return; }
    const pass = lsGet(CAL_PASS);
    if (!pass) { cal.status = "needpass"; cal.events = []; return; }
    if (cal.lastData === file.data && cal.status === "ok") return;
    try {
      const plain = await decryptFile(file, pass);
      applyPlain(plain); lsSet(CAL_CACHE, JSON.stringify(plain)); cal.lastData = file.data; cal.status = "ok";
    } catch (_) { cal.status = "badpass"; cal.events = []; }
  } finally { loading = false; render(); }
}

// Events touching one local date: timed (with minutes from midnight) and all-day
function dayEvents(dateStr){
  const [y, mo, d] = dateStr.split("-").map(Number);
  const d0 = new Date(y, mo - 1, d).getTime(), d1 = new Date(y, mo - 1, d + 1).getTime();
  const timed = [], allDay = [];
  for (const e of cal.events) {
    if (e.allDay) { if (e.s <= dateStr && dateStr < e.e) allDay.push(e); continue; }
    if (e.eMs <= d0 || e.sMs >= d1) continue;
    timed.push(Object.assign({}, e, { sMin: Math.max(0, Math.round((e.sMs - d0) / 60000)), eMin: Math.min(1440, Math.round((e.eMs - d0) / 60000)) }));
  }
  timed.sort((a, b) => a.sMin - b.sMin || a.eMin - b.eMin);
  return { timed, allDay };
}
const coveredMinutes = (evs, s, e) => {
  const iv = evs.map((x) => [Math.max(s, x.sMin), Math.min(e, x.eMin)]).filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
  let total = 0, cs = -1, ce = -1;
  for (const [a, b] of iv) { if (a > ce) { if (ce > cs) total += ce - cs; cs = a; ce = b; } else ce = Math.max(ce, b); }
  if (ce > cs) total += ce - cs;
  return total;
};
const IMPORTANT_TAGS = ["gym", "mastery", "write", "friends", "conversation", "review"];
// For each routine block: which calendar events clash with it, and where an important block could move
function analyseDay(dateStr, blocks, fromMin){
  const { timed, allDay } = dayEvents(dateStr);
  const busy = timed.filter((e) => e.busy !== false && e.eMin > e.sMin);
  const info = {};
  const used = [];
  // free time the routine itself offers (rest and untagged hobby blocks), minus calendar events
  const flex = blocks.filter((b) => (b.cat === "rest" || (b.cat === "create" && !b.tag)) && !/-(sleep|wind|b1)$/.test(b.id) && toMin(b.e) - toMin(b.s) >= 30);
  const freeSlots = () => {
    const slots = [];
    for (const f of flex) {
      let s = Math.max(toMin(f.s), fromMin), e = toMin(f.e);
      const cuts = busy.concat(used).filter((x) => x.sMin < e && x.eMin > s).sort((a, b) => a.sMin - b.sMin);
      for (const c of cuts) { if (c.sMin > s) slots.push({ s, e: c.sMin, from: f }); s = Math.max(s, c.eMin); }
      if (e > s) slots.push({ s, e, from: f });
    }
    return slots.sort((a, b) => a.s - b.s);
  };
  for (const b of blocks) {
    const s = toMin(b.s), e = toMin(b.e), len = e - s;
    const hits = busy.filter((x) => x.sMin < e && x.eMin > s);
    if (!hits.length) continue;
    const cov = coveredMinutes(hits, s, e);
    const bumped = cov >= len * 0.5 || cov >= 45;
    const it = { hits, bumped, cov };
    const important = IMPORTANT_TAGS.includes(b.tag) || (b.cat === "deep" && len >= 30) || (b.cat === "body" && len >= 45);
    if (bumped && important && b.cat !== "work") {
      const want = Math.min(len, 90), min = Math.min(len, 30);
      const slot = freeSlots().find((x) => x.e - x.s >= min && x.from.id !== b.id);
      if (slot) { const end = Math.min(slot.e, slot.s + want); it.move = { s: slot.s, e: end, instead: slot.from.t }; used.push({ sMin: slot.s, eMin: end }); }
      else it.noSlot = true;
    }
    info[b.id] = it;
  }
  return { timed, allDay, info };
}
const evTime = (e) => `${hm(e.sMin)}–${hm(e.eMin)}`;
const evWhere = (e) => e.loc ? " · " + esc(e.loc) : "";

// ---------- ui state ----------
const TABS = ["today","week","food","goals","setup"];
let tab = "today", dayView = todayKey();
{ const t = lsGet("rhythm-tab"); if (TABS.includes(t)) tab = t; }
if (TABS.includes(location.hash.slice(1))) tab = location.hash.slice(1);

const isDone = (date, id) => (state.done[date] || []).includes(id);
function toggle(date, id){ const a = new Set(state.done[date] || []); a.has(id) ? a.delete(id) : a.add(id); state.done[date] = [...a]; save(); render(); }

const checkSvg = '<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 7.5l3 3 6-7" fill="none" stroke="var(--surface)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const catVar = (c) => `--cat:var(--c-${c})`;

// ---------- now card ----------
function renderNow(){
  const d = now(), k = todayKey(), m = nowMin();
  const bl = P.days[k].blocks;
  const cur = bl.find(b => toMin(b.s) <= m && m < toMin(b.e));
  const { timed } = dayEvents(ymd(d));
  const evNow = timed.find(e => e.busy !== false && e.sMin <= m && m < e.eMin);
  const nextBlock = bl.find(b => toMin(b.s) > m);
  const nextEv = timed.find(e => e.sMin > m);
  const clock = pad(d.getHours()) + ":" + pad(d.getMinutes());
  const left = (e) => { const l = e - m; return l >= 60 ? Math.floor(l / 60) + " h " + (l % 60) + " min left" : l + " min left"; };
  const tomorrow = P.days[KEYS[(d.getDay() + 1) % 7]].blocks[0];
  const nextTxt = (after) => {
    const nb = bl.find(b => toMin(b.s) >= after), ne = timed.find(e => e.sMin >= after && e !== evNow);
    if (ne && (!nb || ne.sMin <= toMin(nb.s))) return `<span>Next <b>${hm(ne.sMin)} ${esc(ne.t)}</b></span>`;
    if (nb) return `<span>Next <b>${nb.s} ${nb.t}</b></span>`;
    return `<span>Tomorrow: <b>${tomorrow.s} ${tomorrow.t}</b></span>`;
  };
  let html;
  if (evNow) {
    const pct = Math.round(((m - evNow.sMin) / Math.max(1, evNow.eMin - evNow.sMin)) * 100);
    html = `<div class="now-top"><span class="now-label"><span class="pulse"></span>Now · Your calendar</span><span class="clock">${clock}</span></div>
      <h2>${esc(evNow.t)}</h2><p>${evTime(evNow)}${evWhere(evNow)}${cur ? ` · instead of <i>${cur.t}</i>` : ""}</p>
      <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
      <div class="now-meta"><span><b>${left(evNow.eMin)}</b></span>${nextTxt(evNow.eMin)}</div>`;
  } else if (cur) {
    const s = toMin(cur.s), e = toMin(cur.e), pct = Math.round(((m - s) / (e - s)) * 100);
    const soon = nextEv && nextEv.sMin - m <= 60 ? `<p class="soon">Coming up from your calendar: <b>${hm(nextEv.sMin)} ${esc(nextEv.t)}</b>${evWhere(nextEv)}</p>` : "";
    html = `<div class="now-top"><span class="now-label"><span class="pulse"></span>Now · ${P.cats[cur.cat]}</span><span class="clock">${clock}</span></div>
      <h2 ${cur.tag==="stop"?'style="color:var(--now)"':''}>${cur.t}</h2><p>${cur.d}</p>${soon}
      <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
      <div class="now-meta"><span>${cur.s}–${hm(e)} · <b>${left(e)}</b></span>${nextTxt(m + 1)}</div>`;
  } else {
    const nxt = nextBlock || tomorrow;
    html = `<div class="now-top"><span class="now-label"><span class="pulse"></span>Now · Rest</span><span class="clock">${clock}</span></div>
      <h2>Sleep. Recovery is part of the plan.</h2><p>Your day starts with <b>${nxt.t}</b> at ${nxt.s}.</p>`;
  }
  $("#nowCard").innerHTML = html;
  $("#hdDate").textContent = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) + " · " + P.days[k].theme;
}

// ---------- today / day view ----------
function renderDay(){
  const k = dayView, day = P.days[k], date = dateForKey(k), isToday = k === todayKey();
  const m = nowMin();
  const chips = P.ORDER.map(x => `<button class="chip ${x===todayKey()?"today":""}" aria-pressed="${x===k}" data-day="${x}">${P.days[x].short}</button>`).join("");
  const doneCount = day.blocks.filter(b => isDone(date, b.id)).length;
  let one = "";
  const oo = P.oneOffs[date];
  if (oo) {
    const od = state.oneoff[date] || [];
    one = `<div class="card oneoff"><div class="section-head"><h3>Today's list</h3><span>${od.length}/${oo.length} done · from your plan</span></div><ul>${
      oo.map(o => `<li class="${od.includes(o.id)?"done":""}"><button class="check" aria-pressed="${od.includes(o.id)}" aria-label="Mark ${o.t} done" data-oneoff="${o.id}">${checkSvg}</button><span>${o.t}</span></li>`).join("")}</ul></div>`;
  }
  const an = analyseDay(date, day.blocks, isToday ? m : 0);
  const items = [];
  for (const b of day.blocks) {
    const s = toMin(b.s), e = toMin(b.e), it = an.info[b.id];
    const st = isToday ? (m >= e ? "past" : (m >= s ? "current" : "")) : "";
    const dn = isDone(date, b.id);
    let note = "";
    if (it) {
      const names = it.hits.map(h => `<b>${esc(h.t)}</b> (${evTime(h)})`).join(", ");
      if (b.cat === "work" && it.bumped) note = `<div class="clash">Taken by ${names}.</div>`;
      else if (it.bumped) note = `<div class="clash">Your calendar has ${names} here.</div>`;
      else note = `<div class="clash">Overlaps ${names}. Shorten it.</div>`;
      if (it.move) note += `<div class="move">Move it to ${hm(it.move.s)}–${hm(it.move.e)} (instead of ${it.move.instead}).</div>`;
      else if (it.noSlot) note += `<div class="move">No free time left today. Do a short version, or swap it into tomorrow's free time.</div>`;
    }
    items.push({ s, order: 1, html: `<li class="tl ${st} ${dn?"done":""} ${b.tag==="stop"?"stop":""} ${it && it.bumped ? "bumped" : ""}" style="${catVar(b.cat)}">
      <span class="t">${b.s}</span><span class="rail"><span class="dot"></span></span>
      <div class="body"><div class="ttl">${b.t}</div><div class="det">${b.d}</div>${note}<span class="tag">${P.cats[b.cat]} · until ${hm(e)}</span></div>
      <button class="check" aria-pressed="${dn}" aria-label="Mark ${b.t} done" data-done="${b.id}">${checkSvg}</button></li>` });
  }
  for (const ev of an.timed) {
    const st = isToday ? (m >= ev.eMin ? "past" : (m >= ev.sMin ? "current" : "")) : "";
    items.push({ s: ev.sMin, order: 0, html: `<li class="tl event ${st}" style="${catVar("event")}">
      <span class="t">${hm(ev.sMin)}</span><span class="rail"><span class="dot"></span></span>
      <div class="body"><div class="ttl">${esc(ev.t)}</div><div class="det">${evTime(ev)}${evWhere(ev)}</div><span class="tag">Your calendar${ev.cal ? " · " + esc(ev.cal) : ""}${ev.busy === false ? " · free" : ""}</span></div><span></span></li>` });
  }
  items.sort((a, b) => a.s - b.s || a.order - b.order);
  const allDay = an.allDay.length ? `<div class="allday">${an.allDay.map(e => `<div><span class="eyebrow">All day</span> <b>${esc(e.t)}</b>${evWhere(e)}</div>`).join("")}</div>` : "";
  const clashes = Object.values(an.info).filter(x => x.bumped).length;
  const calLine = cal.status === "ok" || cal.status === "offline"
    ? `${an.timed.length} calendar event${an.timed.length === 1 ? "" : "s"}${clashes ? ` · ${clashes} block${clashes === 1 ? "" : "s"} moved aside` : ""}`
    : `<button class="linkbtn" data-tab="setup">Connect your calendar</button>`;
  return `<div class="chips" role="group" aria-label="Day">${chips}</div>
    ${one}
    <div class="section-head"><h2>${day.name}: ${day.theme}</h2><span>${doneCount}/${day.blocks.length} done · ${calLine}</span></div>
    ${allDay}
    <ul class="timeline">${items.map(i => i.html).join("")}</ul>`;
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
    for (const ev of dayEvents(dateForKey(k)).timed) {
      if (ev.busy === false) continue;
      const s = Math.max(ev.sMin, START), e = ev.eMin; if (e <= START) continue;
      const hgt = Math.max(12, (e - s) * PX - 2);
      c += `<div class="wk-ev" style="top:${(s-START)*PX+1}px;height:${hgt}px" title="${evTime(ev)} ${esc(ev.t)}">${esc(ev.t)}</div>`;
    }
    return c + "</div>";
  }).join("");
  const heads = `<div class="wk-h"></div>` + P.ORDER.map(k => `<div class="wk-h ${k===todayKey()?"today":""}">${P.days[k].short}</div>`).join("");
  const legend = Object.entries(P.cats).map(([k, v]) => `<span style="${catVar(k)}"><i></i>${v}</span>`).join("") + `<span style="${catVar("event")}"><i></i>Your calendar</span>`;
  const tot = {}; for (const k of P.ORDER) for (const b of P.days[k].blocks) { if (b.id.endsWith("sleep")) continue; tot[b.cat] = (tot[b.cat]||0) + toMin(b.e) - toMin(b.s); }
  const hrs = (c) => Math.round((tot[c]||0) / 60);
  return `<div class="section-head"><h2>Your week at a glance</h2><span>Scroll sideways on a phone</span></div>
    <div class="legend">${legend}</div>
    <div class="week-scroll"><div class="week">${heads}${gut}${cols}</div></div>
    <div class="card"><h3>Where the week's hours go</h3>
      <div class="split">
        <div><div class="big">${hrs("work")} h</div><div class="note">SimasiaAI, 09:30–18:00, Monday to Friday</div></div>
        <div><div class="big">${hrs("deep")} h</div><div class="note">Mastery evenings (Mon, Wed, Thu) and the Sunday review</div></div>
        <div><div class="big">${hrs("people")} h</div><div class="note">Friends, family and one practitioner lunch</div></div>
        <div><div class="big">${hrs("body")} h</div><div class="note">Gym every weekday at 08:00, outdoors Saturday</div></div>
      </div>
      <p class="note" style="margin:0">Rules that hold the week together: train before work, SimasiaAI from 09:30, stop at 18:00, Saturday is work-free. When your calendar adds something, the app shows what it pushes aside and where to move it.</p>
    </div>`;
}

// ---------- food ----------
function renderFood(){
  const k = todayKey(), ml = P.meals[k], bl = P.days[k].blocks;
  const find = (re) => { const b = bl.find(x => re.test(x.t)); return b ? b.s : ""; };
  const times = { b: (bl.find(x => x.cat === "food") || {}).s || "", l: find(/lunch/i), s: find(/snack/i), d: find(/dinner/i) || (bl.find(b => /friends|night/i.test(b.t) && toMin(b.s) >= 19*60) || {}).s || "" };
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

// ---------- setup: calendar both ways, install, backup ----------
const ICS_FILE = "Daily-Rhythm.ics";
const icsHttps = () => new URL(ICS_FILE, location.href).href;
const icsWebcal = () => icsHttps().replace(/^https?:/, "webcal:");
const isHosted = () => /^https?:$/.test(location.protocol) && !/^(localhost|127\.)/.test(location.hostname);
function calCard(){
  const passBox = (label) => `<div class="copyrow"><input type="password" id="calPass" placeholder="Calendar passphrase" autocomplete="current-password" aria-label="Calendar passphrase"><button class="btn" id="calUnlock">${label}</button></div>`;
  const upd = cal.updated ? new Date(cal.updated).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "";
  let status, body = "";
  if (cal.status === "ok") {
    status = `<span class="st ok"></span>Connected: ${cal.calendars.map(esc).join(", ") || "your calendar"} · ${cal.events.length} events in the next 5 weeks`;
    body = `<p class="note" style="margin:0">Last change synced ${upd}. New events appear within about 15 minutes.</p>
      <div class="btnrow"><button class="btn ghost" id="calRefresh">Refresh now</button><button class="btn ghost" id="calForget">Disconnect this device</button></div>`;
  } else if (cal.status === "offline") {
    status = `<span class="st warn"></span>Offline: showing events from the last sync (${upd})`;
  } else if (cal.status === "needpass") {
    status = `<span class="st warn"></span>Your calendar is ready. Type your passphrase to unlock it on this device.`;
    body = passBox("Unlock");
  } else if (cal.status === "badpass") {
    status = `<span class="st bad"></span>That passphrase doesn't open your calendar. Check it and try again.`;
    body = passBox("Unlock");
  } else if (cal.status === "loading") {
    status = `<span class="st"></span>Checking for your calendar…`;
  } else {
    status = `<span class="st"></span>Not connected yet`;
    body = `<ol class="steps">
      <li>On your iPhone, open <b>Calendar</b> → <b>Calendars</b> → tap <b>ⓘ</b> next to your calendar → turn on <b>Public Calendar</b> → <b>Share Link…</b> → <b>Copy</b>. Do it for each calendar you use (Home, Work…).</li>
      <li>Send the link(s) to Claude, or add them on GitHub yourself: repository <b>Settings → Secrets and variables → Actions</b>, secret <b>ICLOUD_CALENDAR_URLS</b> (one link per line) and secret <b>CAL_PASSPHRASE</b> (a passphrase you choose).</li>
      <li>Type the same passphrase here on each device.</li>
    </ol>${passBox("Save passphrase")}`;
  }
  return `<div class="card"><h3>Read your iPhone calendar</h3>
    <p class="calstatus">${status}</p>
    <p class="note" style="margin:0">Your appointments, meetings and parties appear in Today and Week. When one clashes with your routine, the app shows what it pushes aside and where to move the gym or a Mastery evening. Events are encrypted before they're published; only a device with your passphrase can read them.</p>
    ${body}</div>`;
}
function renderSetup(){
  const sub = isHosted()
    ? `<a class="btn" href="${icsWebcal()}">Subscribe in Apple Calendar</a>
       <div class="copyrow"><code id="feedUrl">${icsHttps()}</code><button class="btn ghost" id="copyFeed">Copy</button></div>`
    : `<p class="note" style="margin:0">Once the app is online (GitHub Pages), a one-tap <b>Subscribe</b> button appears here.</p>`;
  return `${calCard()}
    <div class="card"><h3>Put your routine in Apple Calendar</h3>
    ${sub}
    <ol class="steps">
      <li><b>iPhone:</b> tap the button and confirm <b>Subscribe</b>. <b>Mac:</b> Calendar → File → New Calendar Subscription, paste the address, set Auto-refresh to <b>Every hour</b>.</li>
      <li>When the plan changes on GitHub, your calendar updates by itself. Reminders come before the gym, the 09:30 start, the 18:00 STOP WORK, Mastery evenings, wind-down and the Sunday review.</li>
    </ol>
    <p class="note" style="margin:0">Short items (snacks, breaks, wake-up) stay in the app only, so your calendar isn't crowded.</p></div>
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
  const typing = document.activeElement && document.activeElement.id === "calPass" ? document.activeElement.value : null;
  p.innerHTML = tab === "today" ? renderDay() : tab === "week" ? renderWeek() : tab === "food" ? renderFood() : tab === "goals" ? renderGoals() : renderSetup();
  if (typing !== null && $("#calPass")) { $("#calPass").value = typing; $("#calPass").focus(); }
}
function toast(t){ const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => el.hidden = true, 2200); }

async function unlock(){
  const v = ($("#calPass") || {}).value || "";
  if (!v.trim()) { toast("Type your passphrase first"); return; }
  lsSet(CAL_PASS, v); cal.lastData = null;
  await loadCalendar();
  if (cal.status === "ok") toast("Calendar connected");
  else if (cal.status === "none") toast("Passphrase saved. Your calendar appears once it's set up on GitHub");
  else if (cal.status === "badpass") toast("Wrong passphrase");
}

document.addEventListener("click", async (e) => {
  const t = e.target.closest("button"); if (!t) return;
  if (t.dataset.tab) { tab = t.dataset.tab; lsSet("rhythm-tab", tab); history.replaceState(null, "", "#" + tab); render(); return; }
  if (t.dataset.day) { dayView = t.dataset.day; render(); return; }
  if (t.dataset.done) { toggle(dateForKey(dayView), t.dataset.done); return; }
  if (t.dataset.oneoff) { const d = dateForKey(dayView); const a = new Set(state.oneoff[d] || []); a.has(t.dataset.oneoff) ? a.delete(t.dataset.oneoff) : a.add(t.dataset.oneoff); state.oneoff[d] = [...a]; save(); render(); return; }
  if (t.dataset.sp) { const k = t.dataset.sp; state.sprint[k] = Math.max(0, (state.sprint[k] || 0) + Number(t.dataset.d)); save(); render(); return; }
  if (t.id === "calUnlock") { unlock(); return; }
  if (t.id === "calRefresh") { cal.lastData = null; await loadCalendar(); toast("Calendar refreshed"); return; }
  if (t.id === "calForget") { lsSet(CAL_PASS, null); lsSet(CAL_CACHE, null); cal.events = []; cal.lastData = null; cal.status = "needpass"; render(); toast("Calendar removed from this device"); return; }
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
document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "calPass") unlock(); });

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
if (lsGet(CAL_PASS)) useCache();
render();
save();
loadCalendar();
if ("serviceWorker" in navigator && isHosted()) navigator.serviceWorker.register("sw.js").catch(() => {});
setInterval(() => { if (document.activeElement && document.activeElement.id === "calPass") return; renderNow(); if (tab === "today" && dayView === todayKey()) render(); }, 60000);
setInterval(loadCalendar, 10 * 60000);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") loadCalendar(); });
})();
