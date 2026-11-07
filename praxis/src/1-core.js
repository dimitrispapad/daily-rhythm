"use strict";
// ================= utilities =================
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const ymd = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const today = () => ymd(new Date());
const parseYmd = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const daysUntil = (s) => Math.round((parseYmd(s) - parseYmd(today())) / 86400000);
const monthKey = (s) => String(s).slice(0, 7);
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const toMin = (hm) => { const [h, m] = String(hm).split(":").map(Number); return h * 60 + (m || 0); };
const weekStart = (s) => { const d = parseYmd(s); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return ymd(d); };
const fmtDay = (s) => parseYmd(s).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const fmtShort = (s) => parseYmd(s).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const monthName = (k) => parseYmd(k + "-01").toLocaleDateString("en-GB", { month: "short" });
const relDay = (s) => { const n = daysUntil(s); if (n === 0) return "today"; if (n === 1) return "tomorrow"; if (n === -1) return "yesterday"; if (n < 0) return `${-n} days late`; if (n < 7) return `in ${n} days`; return fmtShort(s); };
const num = (v) => { const n = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isFinite(n) ? n : 0; };
const eur = (n, dec) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", minimumFractionDigits: dec ? 2 : 0, maximumFractionDigits: dec ? 2 : 0 }).format(n || 0);
const clone = (o) => JSON.parse(JSON.stringify(o));
const decode = (s) => { const t = document.createElement("textarea"); t.innerHTML = String(s || ""); return t.value; };
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
const lsSet = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (_) {} };
const words = (s) => (String(s || "").trim().match(/\S+/g) || []).length;
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const P = window.PLAN || null;

// ================= life areas & record types =================
const AREAS = {
  simasia: "SimasiaAI", career: "Career & PhD", money: "Money", mind: "Mind", create: "Create", body: "Body", life: "Life"
};
const ac = (a) => `--ac:var(--a-${AREAS[a] ? a : "life"})`;
const opt = (pairs) => pairs.map((p) => (Array.isArray(p) ? p : [p, p[0].toUpperCase() + p.slice(1)]));
const TASK_STATUS = opt([["inbox", "Inbox"], ["next", "Next"], ["doing", "Doing"], ["waiting", "Waiting"], ["done", "Done"]]);
const PRIO = opt([["1", "High"], ["2", "Normal"], ["3", "Low"]]);
const LEAD_STAGES = opt([["todo", "To contact"], ["emailed", "Emailed"], ["followup", "Follow-up"], ["replied", "Replied"], ["meeting", "Meeting"], ["proposal", "Proposal"], ["won", "Won"], ["lost", "Lost"]]);
const INV_STATUS = opt([["draft", "Draft"], ["sent", "Sent"], ["paid", "Paid"]]);
const OPP_STATUS = opt([["idea", "Idea"], ["research", "Researching"], ["contact", "Contacted"], ["applying", "Applying"], ["submitted", "Submitted"], ["interview", "Interview"], ["offer", "Offer"], ["rejected", "Rejected"], ["closed", "Closed"]]);
const OPP_KIND = opt([["phd", "PhD"], ["job", "Job"], ["program", "Programme"], ["fellowship", "Fellowship"], ["talk", "Talk / paper"]]);
const PROJ_STAGE = opt([["idea", "Idea"], ["exploring", "Exploring"], ["active", "Active"], ["parked", "Parked"], ["done", "Done"]]);
const BOOK_STATUS = opt([["toread", "To read"], ["reading", "Reading"], ["done", "Finished"]]);
const TXN_KIND = opt([["expense", "Expense"], ["income", "Income"]]);
const TXN_CATS = ["SimasiaAI", "Salary", "Freelance", "Rent & home", "Food", "Transport", "Gym & health", "Books & learning", "Going out", "Travel", "Subscriptions", "Family", "Savings", "Taxes", "Other"];
const OFFER_STATUS = opt([["idea", "Idea"], ["shaping", "Shaping"], ["offered", "Offered"], ["live", "Live"]]);
const WRITE_KIND = opt([["poem", "Poem"], ["prose", "Prose"], ["essay", "Essay / post"], ["idea", "Idea"]]);
const WRITE_STATUS = opt([["draft", "Draft"], ["revising", "Revising"], ["done", "Finished"]]);

// field: [key, label, kind, options/extra]
const F = (k, l, t, o) => ({ k, l, t, o });
const TYPES = {
  task: { label: "Task", area: "life", fields: [F("area", "Area", "area"), F("status", "Status", "select", TASK_STATUS), F("due", "Due", "date"), F("prio", "Priority", "select", PRIO), F("est", "Minutes it takes", "number"), F("today", "On today's list", "check"), F("step", "Next tiny step", "text", { wide: 1, ph: "The first 2-minute action" }), F("steps", "Steps", "checklist"), F("notes", "Notes", "textarea"), F("link", "Link", "url")] },
  lead: { label: "Lead", area: "simasia", titleLabel: "Organisation", fields: [F("contact", "Contact person", "text"), F("email", "Email", "email"), F("stage", "Stage", "select", LEAD_STAGES), F("followUp", "Follow up on", "date"), F("lang", "Email language", "select", [["el", "Greek"], ["en", "English"]]), F("source", "Where it came from", "text"), F("notes", "What they need / notes", "textarea")] },
  invoice: { label: "Invoice", area: "simasia", titleLabel: "Client", fields: [F("number", "Invoice no.", "text"), F("amount", "Amount (€)", "number"), F("status", "Status", "select", INV_STATUS), F("issued", "Issued", "date"), F("due", "Due", "date"), F("email", "Client email", "email"), F("paidOn", "Paid on", "date"), F("notes", "Notes", "textarea")] },
  meeting: { label: "Meeting", area: "simasia", titleLabel: "Meeting", fields: [F("area", "Area", "area"), F("date", "Date", "date"), F("time", "Time", "time"), F("with", "With", "text"), F("goal", "What I want from it", "textarea", { wide: 1 }), F("questions", "Questions to ask", "textarea", { wide: 1 }), F("materials", "Bring / send before", "textarea", { wide: 1 }), F("prep", "Prep notes", "textarea", { wide: 1 }), F("notes", "What happened / follow-ups", "textarea", { wide: 1 })] },
  offering: { label: "Offering idea", area: "simasia", fields: [F("product", "Product", "select", opt([["", "—"], ["flow", "fλow"], ["dialogos", "DialogosAI"], ["praxis", "PraxisAI"], ["metron", "MetronAI"], ["new", "New"]])), F("status", "Status", "select", OFFER_STATUS), F("who", "For whom", "text"), F("price", "Price idea", "text"), F("notes", "Thinking", "textarea")] },
  event: { label: "Event", area: "life", fields: [F("area", "Area", "area"), F("date", "Date", "date"), F("time", "Time", "time"), F("place", "Place", "text"), F("notes", "Notes", "textarea")] },
  txn: { label: "Transaction", area: "money", titleLabel: "Description", fields: [F("kind", "Type", "select", TXN_KIND), F("amount", "Amount (€)", "number"), F("date", "Date", "date"), F("cat", "Category", "select", TXN_CATS.map((c) => [c, c])), F("notes", "Notes", "textarea")] },
  opp: { label: "Opportunity", area: "career", fields: [F("kind", "Kind", "select", OPP_KIND), F("org", "Where", "text"), F("deadline", "Deadline", "date"), F("status", "Status", "select", OPP_STATUS), F("fit", "Fit (1–5)", "select", opt([["", "—"], ["5", "5 · perfect"], ["4", "4"], ["3", "3"], ["2", "2"], ["1", "1 · weak"]])), F("next", "Next step", "text", { wide: 1 }), F("link", "Link", "url"), F("notes", "Notes", "textarea")] },
  path: { label: "Career path", area: "career", fields: [F("why", "Why it pulls me", "textarea", { wide: 1 }), F("against", "What worries me", "textarea", { wide: 1 }), F("next", "Smallest next test", "text", { wide: 1 })] },
  book: { label: "Book", area: "mind", fields: [F("author", "Author", "text"), F("status", "Status", "select", BOOK_STATUS), F("pages", "Pages", "number"), F("page", "I'm on page", "number"), F("rating", "Rating (1–5)", "select", opt([["", "—"], ["5", "5"], ["4", "4"], ["3", "3"], ["2", "2"], ["1", "1"]])), F("notes", "Why I'm reading it", "textarea")] },
  booknote: { label: "Book note", area: "mind", titleLabel: "Insight or quote", titleArea: 1, fields: [F("book", "Book", "book"), F("page", "Page", "number"), F("notes", "My own words", "textarea")] },
  therapy: { label: "Therapy session", area: "mind", titleLabel: "Main lesson", titleArea: 1, fields: [F("date", "Date", "date"), F("practice", "What I practise this week", "textarea", { wide: 1 }), F("feeling", "How I felt", "text"), F("notes", "Notes", "textarea")] },
  lesson: { label: "Lesson", area: "mind", fields: [F("source", "From (course, person, life)", "text"), F("date", "Date", "date"), F("notes", "Takeaway", "textarea")] },
  note: { label: "Note", area: "mind", fields: [F("area", "Area", "area"), F("notes", "Note", "textarea")] },
  writing: { label: "Writing", area: "create", fields: [F("kind", "Kind", "select", WRITE_KIND), F("status", "Status", "select", WRITE_STATUS), F("body", "Text", "textarea", { rows: 10 })] },
  project: { label: "Project", area: "create", fields: [F("area", "Area", "area"), F("stage", "Stage", "select", PROJ_STAGE), F("why", "Why it matters", "textarea", { wide: 1 }), F("next", "Next step", "text", { wide: 1 }), F("notes", "Notes", "textarea")] },
  hobby: { label: "Hobby", area: "create", fields: [F("lastDone", "Last time I did it", "date"), F("notes", "Notes", "textarea")] },
  goal: { label: "Goal", area: "life", fields: [F("area", "Area", "area"), F("current", "Now", "number"), F("target", "Target", "number"), F("unit", "Unit", "text", { ph: "applications, €, books…" }), F("deadline", "By", "date"), F("notes", "Why", "textarea")] },
  habit: { label: "Habit", area: "body", fields: [F("area", "Area", "area"), F("cue", "After I… (cue)", "text", { wide: 1, ph: "After I pour my coffee" }), F("perWeek", "Times per week", "number"), F("notes", "Why / reward", "textarea")] },
  capture: { label: "Captured thought", area: "life", titleLabel: "Thought", titleArea: 1, fields: [] }
};
const DEFAULTS = {
  task: { status: "next", prio: "2" }, lead: { stage: "todo", lang: "el" }, invoice: { status: "draft" }, offering: { status: "idea" },
  txn: { kind: "expense", cat: "Other" }, opp: { kind: "phd", status: "idea" }, book: { status: "toread" }, writing: { kind: "poem", status: "draft", body: "" },
  project: { stage: "idea" }, goal: { current: 0, target: 1 }, habit: { perWeek: 7, log: {} }
};
function isOpen(it) {
  switch (it.type) {
    case "task": return it.status !== "done";
    case "lead": return it.stage !== "won" && it.stage !== "lost";
    case "invoice": return it.status !== "paid";
    case "opp": return !["rejected", "closed"].includes(it.status);
    case "project": return it.stage !== "done";
    case "book": return it.status !== "done";
    case "capture": return true;
    default: return true;
  }
}
// The date that puts an item on the calendar / deadline list
function dateOf(it) {
  if (!isOpen(it) && !["meeting", "event"].includes(it.type)) return null;
  switch (it.type) {
    case "task": return it.due || null;
    case "lead": return ["emailed", "followup", "replied", "proposal", "todo"].includes(it.stage) ? it.followUp || null : null;
    case "invoice": return it.status === "sent" ? it.due || null : null;
    case "meeting": case "event": return it.date || null;
    case "opp": return it.deadline || null;
    case "goal": return it.deadline || null;
    default: return null;
  }
}
const areaOf = (it) => it.area || (TYPES[it.type] || {}).area || "life";

// ================= store: claude.ai sync, with on-device fallback =================
const S = { items: new Map(), boards: new Map(), threads: new Map(), meta: new Map(), mode: "loading", loaded: false, cached: true, err: null };
const COLS = ["items", "boards", "threads", "meta"];
const LOCAL = "praxis-local-v1";
let DB = null;
const dirty = new Set(), inflight = new Set(), again = new Set(), timers = new Map();

function loadLocal() {
  try {
    const o = JSON.parse(lsGet(LOCAL) || "null");
    if (o) for (const c of COLS) S[c] = new Map(Object.entries(o[c] || {}));
  } catch (_) {}
}
let localTimer = null;
function saveLocal() {
  clearTimeout(localTimer);
  localTimer = setTimeout(() => {
    const o = {}; for (const c of COLS) o[c] = Object.fromEntries(S[c]);
    lsSet(LOCAL, JSON.stringify(o));
  }, 250);
}
function commit(col, id, debounce) {
  const path = col + "/" + id;
  dirty.add(path);
  clearTimeout(timers.get(path)); timers.delete(path);
  if (debounce) timers.set(path, setTimeout(() => flush(col, id), 700));
  else flush(col, id);
}
async function flush(col, id) {
  const path = col + "/" + id;
  timers.delete(path);
  if (S.mode !== "cloud") { saveLocal(); dirty.delete(path); return; }
  if (inflight.has(path)) { again.add(path); return; }
  inflight.add(path);
  try {
    do {
      again.delete(path);
      const body = S[col].get(id);
      await writeOnce(path, body);
    } while (again.has(path));
  } catch (e) {
    writeFailed(e);
  } finally {
    inflight.delete(path);
    if (!timers.has(path)) dirty.delete(path);
  }
}
async function writeOnce(path, body) {
  const ref = DB.doc(path);
  try { body ? await ref.set(clone(body)) : await ref.delete(); }
  catch (e) {
    if (e && e.code === "unavailable") { await new Promise((r) => setTimeout(r, 600 + Math.random() * 900)); body ? await ref.set(clone(body)) : await ref.delete(); }
    else throw e;
  }
}
function writeFailed(e) {
  const c = e && e.code;
  if (c === "quota_exceeded") toast("Storage is full. Delete old items (done tasks, old captures) to save more.");
  else if (c === "invalid_argument") toast("That change couldn't be saved (too large or not allowed).");
  else if (c === "revoked") { S.err = "revoked"; renderAll(); }
  else toast("Couldn't save just now. Your change is kept on screen; try again in a moment.");
}
// public write API
function upsert(col, id, body, debounce) { body.updated = Date.now(); S[col].set(id, body); commit(col, id, debounce); }
function del(col, id) { S[col].delete(id); commit(col, id, false); }
const item = (id) => S.items.get(id);
function setField(id, k, v, debounce) { const it = item(id); if (!it) return; it[k] = v; upsert("items", id, it, debounce); }
function createItem(type, fields) {
  const id = uid();
  const body = Object.assign({ type, title: "", area: (TYPES[type] || {}).area || "life", created: Date.now() }, clone(DEFAULTS[type] || {}), fields || {});
  upsert("items", id, body);
  return id;
}
const meta = (id) => S.meta.get(id) || {};
function setMeta(id, patch, debounce) { const m = Object.assign({}, meta(id), patch); upsert("meta", id, m, debounce); }

async function initStore() {
  let db = null;
  try { db = window.claude && window.claude.use ? await window.claude.use("db") : null; } catch (_) { db = null; }
  if (!db) { S.mode = "local"; loadLocal(); S.loaded = true; S.cached = false; renderAll(); return; }
  DB = db; S.mode = "cloud";
  const got = new Set();
  for (const col of COLS) {
    try {
      DB.collection(col).onSnapshot((snap) => {
        const m = new Map();
        for (const d of snap.docs) {
          const p = col + "/" + d.id;
          if (dirty.has(p)) { if (S[col].has(d.id)) m.set(d.id, S[col].get(d.id)); }
          else { const v = d.data(); if (v) m.set(d.id, clone(v)); }
        }
        for (const [id, v] of S[col]) if (!m.has(id) && dirty.has(col + "/" + id)) m.set(id, v);
        S[col] = m;
        got.add(col);
        if (got.size === COLS.length) S.loaded = true;
        S.cached = !!snap.metadata.fromCache;
        scheduleRender();
      }, (e) => { S.err = (e && e.code) || "unavailable"; S.loaded = true; scheduleRender(); });
    } catch (e) { S.err = "unavailable"; S.loaded = true; }
  }
  setTimeout(() => { if (!S.loaded) { S.loaded = true; scheduleRender(); } }, 8000);
}

// ================= Claude, Gmail, downloads =================
const CAP = { sample: null, mcp: null, downloads: null, perms: null, owner: true };
async function initCaps() {
  if (!window.claude || !window.claude.use) return;
  const tryUse = (n) => window.claude.use(n).catch(() => null);
  const [sample, mcp, downloads, perms, user] = await Promise.all(["sample", "mcp", "downloads", "permissions", "user"].map(tryUse));
  Object.assign(CAP, { sample, mcp, downloads, perms });
  if (user) { try { CAP.owner = await user.canEdit(); } catch (_) {} }
  renderAll();
  if (mcp && perms) {
    try { const st = await perms.state("mcp:Gmail"); if (st === "granted") loadInbox(false); } catch (_) {}
  }
}
const SAMPLE_COPY = {
  not_granted: "Claude isn't allowed for PraxisAI yet. Allow it when claude.ai asks, or in the artifact's permissions.",
  sampling_disabled: "Claude isn't available on this account.", not_declared: "Claude isn't available here.",
  capability_disabled: "Claude isn't available in this view.", capability_removed: "Claude isn't available in this view.",
  rate_limited: "Too many requests right now. Wait a minute and try again.", session_expired: "Sign in to claude.ai again, then retry.",
  refused: "Claude declined that request. Try rewording it.", empty_completion: "Claude returned nothing. Try asking for less.",
  invalid_json: "Claude's answer couldn't be read. Try again.", prompt_too_large: "That's too much text at once. Try a smaller piece.",
  upstream_error: "Connection hiccup. Try again."
};
const sampleErr = (e) => SAMPLE_COPY[e && e.code] || SAMPLE_COPY.upstream_error;
function gmailErr(e) {
  const c = e && e.code;
  return ({
    needs_reauth: "Gmail needs reconnecting: claude.ai → Settings → Connectors → Gmail.",
    server_not_connected: "Gmail isn't connected. Add it in claude.ai → Settings → Connectors.",
    selection_required: "Choose which Gmail account to use when claude.ai asks.",
    not_in_manifest: "Gmail is turned off for PraxisAI. Allow it from this page's permissions.",
    approval_required: "Gmail needs your approval. Tap the button again and choose Allow.",
    blocked_by_policy: "Your organisation blocks this Gmail action.",
    server_unavailable: "Gmail didn't answer. Try again in a minute.",
    tool_error: "Gmail reported a problem: " + ((e && e.message) || "unknown"),
    capability_disabled: "Gmail isn't available in this view. Open PraxisAI on claude.ai.",
    not_granted: "Gmail isn't available in this view. Open PraxisAI on claude.ai."
  })[c] || "Gmail had a problem. Try again.";
}
async function gmail(tool, input) {
  if (!CAP.mcp) throw { code: "capability_disabled" };
  const r = await CAP.mcp.callTool("Gmail", tool, input);
  return r && r.payload;
}

// Short context about Dimitris for Claude prompts (kept small)
function lifeContext() {
  const open = [...S.items.values()].filter(isOpen);
  const top = open.filter((i) => i.type === "task").sort(byUrgency).slice(0, 8).map((t) => `- ${t.title}${t.due ? " (due " + t.due + ")" : ""} [${AREAS[areaOf(t)]}]`).join("\n");
  const dl = deadlines(30).slice(0, 8).map(({ it, d }) => `- ${d}: ${it.title} (${TYPES[it.type].label})`).join("\n");
  const m = moneySnapshot();
  const goals = [...S.items.values()].filter((i) => i.type === "goal").map((g) => `- ${g.title}: ${g.current || 0}/${g.target || 0} ${g.unit || ""}`).join("\n");
  const about = meta("settings").aboutMe || "About me: (no profile yet; add one in Settings).";
  return `${about}
Today is ${fmtDay(today())}.
Top open tasks:
${top || "- none"}
Upcoming deadlines:
${dl || "- none"}
Goals:
${goals || "- none"}
Money this month: income ${eur(m.inc)}, spent ${eur(m.exp)}, unpaid invoices ${eur(m.unpaid)}.`;
}

// ================= derived data =================
function byUrgency(a, b) {
  const da = a.due || dateOf(a) || "9999", db_ = b.due || dateOf(b) || "9999";
  const sa = (a.status === "doing" ? 0 : 1), sb = (b.status === "doing" ? 0 : 1);
  return sa - sb || (da < db_ ? -1 : da > db_ ? 1 : 0) || (num(a.prio || 2) - num(b.prio || 2)) || (a.created || 0) - (b.created || 0);
}
const all = (type) => [...S.items.entries()].filter(([, v]) => !type || v.type === type).map(([id, v]) => Object.assign({ id }, v));
function deadlines(days) {
  const lim = addDays(today(), days), out = [];
  for (const [id, it] of S.items) { const d = dateOf(it); if (d && d <= lim) out.push({ it: Object.assign({ id }, it), d }); }
  return out.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
}
function todayTasks() {
  const t = today();
  return all("task").filter((x) => x.status !== "done" && (x.today === true || (x.due && x.due <= t) || x.status === "doing")).sort(byUrgency);
}
function focusItem() {
  const f = meta("focus").current;
  if (f && item(f) && isOpen(item(f))) return Object.assign({ id: f }, item(f));
  return todayTasks()[0] || all("task").filter((x) => x.status === "next").sort(byUrgency)[0] || null;
}
function moneySnapshot(mk) {
  const k = mk || monthKey(today());
  const s = meta("settings").money || {};
  let inc = 0, exp = 0;
  for (const it of S.items.values()) if (it.type === "txn" && monthKey(it.date || "") === k) { if (it.kind === "income") inc += num(it.amount); else exp += num(it.amount); }
  let unpaid = 0, overdue = 0;
  for (const it of S.items.values()) if (it.type === "invoice" && it.status !== "paid") { unpaid += num(it.amount); if (it.status === "sent" && it.due && it.due < today()) overdue += num(it.amount); }
  const floor = num(s.floor), savings = num(s.savings);
  return { inc, exp, net: inc - exp, unpaid, overdue, floor, target: num(s.target) || 3000, savings, runway: floor > 0 ? savings / floor : null, goalMonths: num(s.goalMonths) || 6 };
}
function monthsBack(n) { const out = []; const d = parseYmd(today()); d.setDate(1); for (let i = n - 1; i >= 0; i--) { const x = new Date(d); x.setMonth(d.getMonth() - i); out.push(ymd(x).slice(0, 7)); } return out; }
function focusDays() { return meta("focusLog").days || {}; }
function routineNow() {
  if (!P) return null;
  const d = new Date(), k = KEYS[d.getDay()], m = nowMin();
  const bl = P.days[k].blocks;
  return { day: P.days[k], cur: bl.find((b) => toMin(b.s) <= m && m < toMin(b.e)), next: bl.find((b) => toMin(b.s) > m), k };
}

// ================= small components =================
const ICON = {
  check: '<svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true"><path d="M2.5 7.5l3 3 6-7" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" fill="none"/></svg>',
  search: '<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" fill="none"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
};
const NAV_ICON = (d) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONS = {
  focus: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  overview: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  tasks: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  plan: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  simasia: '<path d="M18 4H6l6 8-6 8h12"/>',
  money: '<path d="M4 7h16v10H4z"/><circle cx="12" cy="12" r="2.5"/><path d="M7 7v10M17 7v10"/>',
  career: '<path d="M3 9l9-5 9 5-9 5z"/><path d="M7 11v5c3 2 7 2 10 0v-5"/>',
  mind: '<path d="M12 5a4 4 0 0 0-8 1 4 4 0 0 0 1 7 4 4 0 0 0 7 4zM12 5a4 4 0 0 1 8 1 4 4 0 0 1-1 7 4 4 0 0 1-7 4z"/>',
  create: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
  goals: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  board: '<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="6" width="8" height="8" rx="1"/><rect x="6" y="13" width="8" height="8" rx="1"/>',
  think: '<path d="M4 5h16v11H9l-5 4z"/>',
  inbox: '<path d="M4 13l3-8h10l3 8v6H4z"/><path d="M4 13h5l1 2h4l1-2h5"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/>',
  more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'
};
const VIEWS_META = [
  ["focus", "Focus", "Now"], ["overview", "Overview", "Now"],
  ["tasks", "Tasks", "Plan"], ["plan", "Calendar", "Plan"], ["inbox", "Capture inbox", "Plan"],
  ["simasia", "SimasiaAI", "Work"], ["career", "Career & PhD", "Work"],
  ["money", "Money", "Life"], ["goals", "Goals & habits", "Life"], ["mind", "Mind", "Life"], ["create", "Create", "Life"],
  ["board", "Whiteboard", "Think"], ["think", "Think with Claude", "Think"], ["settings", "Settings", "Think"]
];
const viewTitle = (v) => (VIEWS_META.find((x) => x[0] === v) || [, "PraxisAI"])[1];

function areaChip(a) { return `<span class="chip area" style="${ac(a)}"><span class="areadot"></span>${esc(AREAS[a] || a)}</span>`; }
function dueChip(d, label) {
  if (!d) return "";
  const n = daysUntil(d), cls = n < 0 ? "late" : n <= 2 ? "soon" : "";
  return `<span class="chip ${cls}">${label ? esc(label) + " " : ""}${esc(relDay(d))}</span>`;
}
const labelOf = (opts, v) => { const o = (opts || []).find((x) => x[0] === v); return o ? o[1] : v || ""; };
function tick(id, on, label) {
  return `<button class="tick" data-act="toggleDone" data-id="${id}" aria-pressed="${!!on}" aria-label="${on ? "Mark not done" : "Mark done"}: ${esc(label)}">${ICON.check}</button>`;
}
function itemRow(it, opts) {
  opts = opts || {};
  const done = it.type === "task" ? it.status === "done" : false;
  const metaBits = [];
  if (opts.area !== false) metaBits.push(areaChip(areaOf(it)));
  if (it.type !== "task") metaBits.push(`<span class="chip">${esc(TYPES[it.type].label)}</span>`);
  const d = dateOf(it); if (d) metaBits.push(dueChip(d));
  if (it.type === "task" && it.status === "doing") metaBits.push('<span class="chip brand">Doing</span>');
  if (it.type === "task" && it.status === "waiting") metaBits.push('<span class="chip">Waiting</span>');
  if (it.type === "task" && it.prio === "1") metaBits.push('<span class="chip late">High</span>');
  if (it.est) metaBits.push(`<span class="chip">${esc(it.est)} min</span>`);
  if (opts.extra) metaBits.push(opts.extra);
  const sub = opts.sub !== undefined ? opts.sub : (it.step ? "Next: " + it.step : "");
  const left = it.type === "task" ? tick(it.id, done, it.title) : `<span class="areadot" style="${ac(areaOf(it))};margin-top:7px"></span>`;
  return `<div class="it ${done ? "done" : ""}" style="${ac(areaOf(it))}">${left}
    <div style="min-width:0"><button class="t" data-act="open" data-id="${it.id}">${esc(it.title || "Untitled")}</button>
    ${sub ? `<div class="s">${esc(sub)}</div>` : ""}<div class="m">${metaBits.join("")}</div></div>
    <div class="row">${opts.right || ""}</div></div>`;
}
function emptyState(title, body, action) {
  return `<div class="empty"><b>${esc(title)}</b><span>${body}</span>${action || ""}</div>`;
}
function quickAdd(type, extra, ph) {
  extra = extra || {};
  const data = Object.entries(extra).map(([k, v]) => `data-x-${k}="${esc(v)}"`).join(" ");
  return `<form class="addrow" data-form="quick" data-type="${type}" ${data}>
    <input class="input" id="qa-${type}-${extra.area || extra.stage || extra.status || ""}-${String(ph || "").replace(/[^A-Za-z]/g, "").slice(0, 12)}" name="title" placeholder="${esc(ph || "Add " + TYPES[type].label.toLowerCase() + "…")}" autocomplete="off" aria-label="${esc(ph || "New " + TYPES[type].label)}">
    ${type === "task" || type === "opp" || type === "event" || type === "meeting" ? `<input class="input" type="date" name="date" aria-label="Date">` : ""}
    <button class="btn" type="submit">Add</button></form>`;
}
function bar(pct, cls) { return `<div class="bar ${cls || ""}" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`; }
function aiBtn(act, label, extra) { return CAP.sample ? `<button class="btn ghost sm ai" data-act="${act}" ${extra || ""}>${esc(label)}</button>` : ""; }
let toastT = null;
function toast(t) { const el = $("#toast"); if (!el) return; el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (el.hidden = true), 2600); }
