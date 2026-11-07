// ================= drawer (edit any item) =================
function fieldHTML(id, it, f) {
  const v = it[f.k] != null ? it[f.k] : (DEFAULTS[it.type] || {})[f.k], fid = `f-${f.k}`;
  const wide = f.o && f.o.wide || f.t === "textarea" || f.t === "checklist" ? "wide" : "";
  let ctl;
  switch (f.t) {
    case "area": ctl = `<select class="input" id="${fid}" data-field="${f.k}" data-id="${id}">${Object.entries(AREAS).map(([k, l]) => `<option value="${k}" ${areaOf(it) === k ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`; break;
    case "select": ctl = `<select class="input" id="${fid}" data-field="${f.k}" data-id="${id}">${v == null && !f.o.some((o) => o[0] === "") ? '<option value="" selected>—</option>' : ""}${f.o.map(([k, l]) => `<option value="${esc(k)}" ${String(v == null ? "" : v) === String(k) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`; break;
    case "book": ctl = `<select class="input" id="${fid}" data-field="book" data-id="${id}"><option value="">—</option>${all("book").map((b) => `<option value="${b.id}" ${v === b.id ? "selected" : ""}>${esc(b.title)}</option>`).join("")}</select>`; break;
    case "textarea": ctl = `<textarea class="input" id="${fid}" data-field="${f.k}" data-id="${id}" rows="${(f.o && f.o.rows) || 3}">${esc(v || "")}</textarea>`; break;
    case "check": return `<label class="row ${wide}" style="gap:8px;font-weight:600"><input type="checkbox" class="cbx" id="${fid}" data-field="${f.k}" data-id="${id}" ${v ? "checked" : ""}>${esc(f.l)}</label>`;
    case "checklist": {
      const steps = Array.isArray(v) ? v : [];
      ctl = `<div class="checklist">${steps.map((s, i) => `<div class="ci ${s.d ? "d" : ""}"><input type="checkbox" class="cbx" data-act="stepDone" data-id="${id}" data-i="${i}" ${s.d ? "checked" : ""} aria-label="Step done"><input type="text" id="step-${i}" data-step="${i}" data-id="${id}" value="${esc(s.t)}" aria-label="Step"><button class="btn quiet sm" data-act="delStep" data-id="${id}" data-i="${i}" aria-label="Remove step">×</button></div>`).join("")}
        <form class="addrow" data-form="step" data-id="${id}"><input class="input" id="newstep" name="t" placeholder="Add a step" autocomplete="off" aria-label="New step"><button class="btn ghost sm" type="submit">Add</button></form>
        <div class="row">${aiBtn("breakdown", "Break it down with Claude", `data-id="${id}"`)}</div><div data-ai="bd-${id}">${aiBox("bd-" + id)}</div></div>`;
      break;
    }
    default: {
      const type = { date: "date", time: "time", number: "number", email: "email", url: "url" }[f.t] || "text";
      ctl = `<input class="input" type="${type}" ${type === "number" ? 'inputmode="decimal" step="any"' : ""} id="${fid}" data-field="${f.k}" data-id="${id}" value="${esc(v == null ? "" : v)}" ${f.o && f.o.ph ? `placeholder="${esc(f.o.ph)}"` : ""}>`;
    }
  }
  return `<label class="f ${wide}">${esc(f.l)}${ctl}</label>`;
}
function composer(id, it) {
  const c = UI.compose[id] || {};
  const isInv = it.type === "invoice";
  const purposes = isInv ? [["reminder", "Payment reminder"], ["send", "Send the invoice"]] : [["first", "First email"], ["follow", "Follow-up"], ["meeting", "Ask for a meeting"], ["thanks", "Thank-you after a meeting"]];
  return `<div class="card flat" style="background:var(--sunk);border:0"><div class="card-h"><h3>Email ${esc(it.email ? "to " + it.email : "")}</h3></div>
    ${CAP.sample ? `<div class="row"><select class="input" style="width:auto" id="c-purpose" data-compose="purpose" data-id="${id}" aria-label="Email purpose">${purposes.map(([k, l]) => `<option value="${k}" ${c.purpose === k ? "selected" : ""}>${esc(l)}</option>`).join("")}</select><button class="btn ghost sm ai" data-act="draftEmail" data-id="${id}" ${c.loading ? "disabled" : ""}>${c.loading ? "Writing…" : "Draft with Claude"}</button></div>` : ""}
    <label class="f">Subject<input class="input" id="c-subj" data-compose="subject" data-id="${id}" value="${esc(c.subject || "")}"></label>
    <label class="f">Message<textarea class="input" id="c-body" data-compose="body" data-id="${id}" rows="9">${esc(c.body || "")}</textarea></label>
    ${c.err ? `<div class="banner bad">${esc(c.err)}</div>` : ""}
    ${c.saved ? `<div class="banner"><span class="dot ok"></span>Saved as a draft in Gmail. Review it there, then press Send.${c.url ? ` <a href="${esc(c.url)}" target="_blank" rel="noopener">Open draft ↗</a>` : ""}</div>` : ""}
    <div class="row">${CAP.mcp ? `<button class="btn" data-act="gmailDraft" data-id="${id}" ${c.sending ? "disabled" : ""}>${c.sending ? "Saving…" : "Save as Gmail draft"}</button>` : '<span class="note">Gmail drafts work on claude.ai.</span>'}
      ${!isInv ? `<button class="btn ghost" data-act="markEmailed" data-id="${id}">I sent it · follow up in 5 days</button>` : ""}</div></div>`;
}
function renderDrawer() {
  const host = $("#drawer-host");
  const id = UI.editId, it = id && item(id);
  if (!it) { host.innerHTML = ""; UI.editId = null; return; }
  const def = TYPES[it.type] || TYPES.task;
  const title = def.titleArea
    ? `<textarea class="input" id="f-title" data-field="title" data-id="${id}" rows="3" placeholder="${esc(def.titleLabel || "Title")}" aria-label="${esc(def.titleLabel || "Title")}">${esc(it.title || "")}</textarea>`
    : `<input class="titlefield" id="f-title" data-field="title" data-id="${id}" value="${esc(it.title || "")}" placeholder="${esc(def.titleLabel || "Title")}" aria-label="${esc(def.titleLabel || "Title")}">`;
  let extra = "";
  if (it.type === "task") extra = `<div class="row"><button class="btn" data-act="focusOn" data-id="${id}">Focus on this now</button>${it.status !== "done" ? `<button class="btn ghost" data-act="complete" data-id="${id}">Done ✓</button>` : ""}</div>`;
  if (it.type === "lead") extra = composer(id, it);
  if (it.type === "invoice") extra = `${it.status !== "paid" ? `<div class="row"><button class="btn" data-act="invPaid" data-id="${id}">Mark paid (adds income to Money)</button>${it.status === "draft" ? `<button class="btn ghost" data-act="invSent" data-id="${id}">Mark sent</button>` : ""}</div>` : '<div class="banner"><span class="dot ok"></span>Paid. The income is in Money.</div>'}${composer(id, it)}`;
  if (it.type === "meeting") extra = `<div class="row">${aiBtn("mtgPrep", "Prepare with Claude", `data-id="${id}"`)}</div><div data-ai="mtg-${id}">${aiBox("mtg-" + id)}</div>`;
  if (it.type === "writing") extra = `<button class="btn" data-act="write" data-id="${id}">Open in writing mode</button>`;
  if (it.type === "book") {
    const notes = all("booknote").filter((n) => n.book === id).sort((a, b) => num(a.page) - num(b.page));
    extra = `<div class="card flat" style="background:var(--sunk);border:0"><h3>Notes from this book</h3>
      <div class="list">${notes.map((n) => `<div class="it"><span class="areadot" style="${ac("mind")};margin-top:7px"></span><div style="min-width:0"><button class="t" data-act="open" data-id="${n.id}">${esc(n.title)}</button>${n.notes ? `<div class="s">${esc(n.notes)}</div>` : ""}</div>${n.page ? `<span class="chip">p. ${esc(n.page)}</span>` : "<span></span>"}</div>`).join("") || '<p class="note">No notes yet.</p>'}</div>
      <form class="stack" data-form="booknote" data-id="${id}"><textarea class="input" name="t" id="bn-t" rows="2" placeholder="A quote or an insight, in your own words" aria-label="New note"></textarea><div class="addrow"><input class="input" name="p" type="number" placeholder="Page" aria-label="Page" style="flex:0 1 100px"><button class="btn ghost" type="submit">Add note</button></div></form></div>`;
  }
  if (it.type === "capture") extra = `<p class="note">Turn it into something from the Capture inbox.</p>`;
  host.innerHTML = `<div class="scrim" data-act="closeDrawer"></div>
    <aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(def.label)}">
      <div class="drawer-h"><span class="chip area" style="${ac(areaOf(it))}"><span class="areadot"></span>${esc(def.label)}</span><span class="grow"></span><button class="btn quiet" data-act="closeDrawer" aria-label="Close">Close</button></div>
      <div class="drawer-b">${title}${extra}<div class="fgrid">${def.fields.map((f) => fieldHTML(id, it, f)).join("")}</div>
        ${UI.confirmDel ? `<div class="confirm">Delete this ${esc(def.label.toLowerCase())} for good?<button class="btn danger sm" data-act="delYes" data-id="${id}">Delete</button><button class="btn quiet sm" data-act="delNo">Keep it</button></div>` : `<div class="row between"><span class="note">Added ${it.created ? new Date(it.created).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}</span><button class="btn danger sm" data-act="del">Delete</button></div>`}
      </div></aside>`;
}

// ================= writer overlay =================
const WRITING_PROMPTS = ["Γράψε για ένα αντικείμενο στο δωμάτιο σαν να ήταν ο τελευταίος σου φίλος.", "Write the conversation you didn't have this week.", "Ένα ποίημα που ξεκινά με «Σήμερα δεν…».", "Describe Athens at 07:00 using only sounds.", "Write a letter to yourself at 38, in public life.", "Ένα ποίημα για τη μητέρα σου που δεν θα της δείξεις.", "What does a patient hear when a doctor says 'it's fine'?", "Write ten lines, each beginning with 'I measure…' (Protagoras).", "Το espresso του πουλιού, δέκα χρόνια μετά.", "Write about the moment before you speak on a stage."];
function renderWriter() {
  const host = $("#writer-host");
  const w = UI.writer && item(UI.writer);
  if (!w) { host.innerHTML = ""; UI.writer = null; return; }
  host.innerHTML = `<div class="writer" role="dialog" aria-label="Writing mode"><div class="wh"><input class="wt" id="w-title" data-field="title" data-id="${UI.writer}" value="${esc(w.title || "")}" placeholder="Title" aria-label="Title">
    <span class="note" id="wc">${words(w.body)} words</span><button class="btn ghost sm" data-act="closeWriter">Done</button></div>
    <textarea id="w-body" data-field="body" data-id="${UI.writer}" placeholder="Start anywhere. Saved as you type." aria-label="Text">${esc(w.body || "")}</textarea></div>`;
}

// ================= sheets: quick capture, more, switch, search =================
function searchResults(q) {
  q = q.trim().toLowerCase(); if (q.length < 2) return "";
  const hits = all().filter((x) => [x.title, x.notes, x.body, x.org, x.contact, x.author].some((s) => s && String(s).toLowerCase().includes(q))).slice(0, 12);
  return hits.length ? hits.map((x) => `<button data-act="openSearch" data-id="${x.id}"><b>${esc(x.title || "Untitled")}</b><span class="note">${esc(TYPES[x.type].label)} · ${esc(AREAS[areaOf(x)])}</span></button>`).join("") : '<p class="note" style="padding:8px">Nothing found.</p>';
}
function renderSheet() {
  const host = $("#sheet-host");
  const s = UI.sheet;
  if (!s) { host.innerHTML = ""; return; }
  let inner = "";
  if (s === "capture") inner = `<form class="stack" data-form="fab"><div class="row between"><h2>Catch it before it's gone</h2><button type="button" class="btn quiet" data-act="closeSheet">Close</button></div>
      <textarea class="input" id="fabtext" name="t" rows="4" placeholder="Type, or tap the keyboard's microphone and speak" aria-label="Thought"></textarea>
      <div class="row"><button class="btn" type="submit" value="inbox">Save to inbox</button><button class="btn ghost" type="submit" value="task">Make it a task for today</button></div></form>`;
  if (s === "more") inner = `<div class="row between"><h2>Everything</h2><button class="btn quiet" data-act="closeSheet">Close</button></div><div class="grid g2">${VIEWS_META.map(([k, l]) => `<a class="btn ghost" style="justify-content:flex-start" href="#${k}">${NAV_ICON(ICONS[k])} ${esc(l)}</a>`).join("")}</div>`;
  if (s === "switch") { const opts = [...todayTasks(), ...all("task").filter((t) => t.status === "next" && !todayTasks().some((x) => x.id === t.id)).sort(byUrgency)].slice(0, 12);
    inner = `<div class="row between"><h2>What's the one thing?</h2><button class="btn quiet" data-act="closeSheet">Close</button></div><div class="list">${opts.map((t) => itemRow(t, { right: `<button class="btn sm" data-act="focusOn" data-id="${t.id}">Choose</button>` })).join("") || '<p class="note">No open tasks. Add one first.</p>'}</div>`; }
  if (s === "search") inner = `<div class="row between"><h2>Find</h2><button class="btn quiet" data-act="closeSheet">Close</button></div><div class="search">${ICON.search}<input id="q2" class="input" style="padding-left:32px" placeholder="Search everything" value="${esc(UI.q)}" aria-label="Search everything" autocomplete="off"></div><div id="results2" class="list">${searchResults(UI.q)}</div>`;
  host.innerHTML = `<div class="scrim" data-act="closeSheet"></div><div class="sheet" role="dialog" aria-modal="true">${inner}</div>`;
}

// ================= shell =================
function renderRail() {
  const capN = all("capture").length;
  const leadN = all("lead").filter((l) => isOpen(l) && (l.stage === "todo" || (l.followUp && l.followUp <= today()))).length;
  const badges = { inbox: capN, simasia: leadN };
  let html = "", grp = "";
  for (const [k, l, g] of VIEWS_META) {
    if (g !== grp) { html += `<div class="grp">${esc(g)}</div>`; grp = g; }
    html += `<a href="#${k}" ${UI.view === k ? 'aria-current="page"' : ""}>${NAV_ICON(ICONS[k])}<span>${esc(l)}</span>${badges[k] ? `<span class="badge">${badges[k]}</span>` : ""}</a>`;
  }
  $("#nav").innerHTML = html;
  $("#syncline").innerHTML = S.mode === "cloud" ? (S.err ? '<span class="dot bad"></span>Sync stopped' : S.cached ? '<span class="dot warn"></span>Connecting…' : '<span class="dot ok"></span>Synced on all devices') : S.mode === "local" ? '<span class="dot warn"></span>This device only' : '<span class="dot"></span>Loading…';
  $("#topname").textContent = viewTitle(UI.view);
  $("#tabbar").innerHTML = [["focus", "Focus"], ["overview", "Overview"], ["tasks", "Tasks"], ["simasia", "SimasiaAI"]].map(([k, l]) => `<a href="#${k}" ${UI.view === k ? 'aria-current="page"' : ""}>${NAV_ICON(ICONS[k])}<span>${l}</span></a>`).join("") + `<button data-act="sheet" data-s="more" aria-label="More">${NAV_ICON(ICONS.more)}<span>More</span></button>`;
}
function renderMain() {
  const main = $("#main");
  if (S.mode === "loading" || (S.mode === "cloud" && !S.loaded)) { main.innerHTML = `<div class="page"><h1>PraxisAI</h1><p class="muted">Opening your space…</p></div>`; return; }
  let pre = "";
  if (!CAP.owner) pre += `<div class="banner warn">This is Dimitris's private PraxisAI. Its contents are visible only to him.</div>`;
  if (S.mode === "local") pre += `<div class="banner warn"><span class="dot warn"></span>You're outside claude.ai, so changes are saved in this browser only.</div>`;
  if (S.err) pre += `<div class="banner bad">Sync stopped. Reload the page to reconnect; your recent changes stay on screen until then.</div>`;
  main.innerHTML = (pre ? `<div class="page" style="margin-bottom:12px">${pre}</div>` : "") + (VIEWS[UI.view] || viewFocus)();
}
let renderQueued = false, deferred = false;
function isEditing() { const a = document.activeElement; return !!(a && a.matches && a.matches("textarea, input:not([type]), input[type=text], input[type=number], input[type=email], input[type=url], input[type=search]") && a.closest("#main, #drawer-host, #writer-host, #sheet-host")); }
function scheduleRender() { if (renderQueued) return; renderQueued = true; requestAnimationFrame(() => { renderQueued = false; if (isEditing() || dragging) { deferred = true; return; } renderAll(); }); }
function renderAll() {
  const a = document.activeElement, fid = a && a.id;
  let ss = null, se = null; try { ss = a.selectionStart; se = a.selectionEnd; } catch (_) {}
  const wb = $("#wbwrap"), wbs = wb ? [wb.scrollLeft, wb.scrollTop] : null;
  const dsc = $(".drawer-b") ? $(".drawer-b").scrollTop : 0;
  const keep = {};
  $$("#main input[id], #main textarea[id], #sheet-host input[id], #sheet-host textarea[id], #drawer-host input[id], #drawer-host textarea[id]").forEach((el) => {
    const d = el.dataset; if (d.field || d.money || d.setting || d.compose || d.sticky || d.step !== undefined || d.boardTitle || el.type === "checkbox" || el.type === "file") return;
    if (el.value) keep[el.id] = el.value;
  });
  renderRail(); renderMain(); renderDrawer(); renderSheet(); renderWriter();
  for (const [k, v] of Object.entries(keep)) { const el = document.getElementById(k); if (el && !el.value) el.value = v; }
  if (fid) { const el = document.getElementById(fid); if (el && el !== document.activeElement) { try { el.focus({ preventScroll: true }); if (ss != null && el.setSelectionRange) el.setSelectionRange(ss, se); } catch (_) {} } }
  if (wbs && $("#wbwrap")) { $("#wbwrap").scrollLeft = wbs[0]; $("#wbwrap").scrollTop = wbs[1]; }
  if ($(".drawer-b")) $(".drawer-b").scrollTop = dsc;
  if (UI.view === "think") { const c = $("#chat"); if (c) c.lastElementChild && c.lastElementChild.scrollIntoView({ block: "nearest" }); }
  deferred = false;
}
document.addEventListener("focusout", () => setTimeout(() => { if (deferred && !isEditing() && !dragging) renderAll(); }, 0));

// ================= actions =================
function go(view) { if (location.hash !== "#" + view) location.hash = view; else { UI.view = view; renderAll(); } }
function markDone(id, on) {
  const it = item(id); if (!it) return;
  it.status = on ? "done" : (it.status === "done" ? "next" : it.status); it.doneAt = on ? Date.now() : null; it.today = on ? it.today : it.today;
  upsert("items", id, it);
  if (on && meta("focus").current === id) setMeta("focus", { current: null });
  const T = timerState(); if (on && T && T.id === id && T.phase === "focus") { const done = Math.round((T.len * 60000 - timeLeft(T)) / 60000); if (done > 0) logFocus(done); setTimer(null); releaseWake(); document.title = "PraxisAI"; }
}
const ACT = {
  open: (d) => { UI.editId = d.id; UI.confirmDel = false; },
  openSearch: (d) => { UI.sheet = null; const it = item(d.id); if (it && it.type === "writing") UI.writer = d.id; else UI.editId = d.id; UI.confirmDel = false; },
  closeDrawer: () => { UI.editId = null; UI.confirmDel = false; },
  del: () => { UI.confirmDel = true; },
  delNo: () => { UI.confirmDel = false; },
  delYes: (d) => { const it = item(d.id); del("items", d.id); UI.editId = null; UI.confirmDel = false; if (it && it.type === "book") for (const n of all("booknote")) if (n.book === d.id) del("items", n.id); toast("Deleted"); },
  toggleDone: (d) => { const it = item(d.id); if (!it) return; const on = it.status !== "done"; markDone(d.id, on); if (on) toast(winLine()); },
  complete: (d) => { markDone(d.id, true); UI.editId = null; toast(winLine()); },
  focusOn: (d) => { setMeta("focus", { current: d.id }); const it = item(d.id); if (it && it.status !== "doing" && it.type === "task") { it.status = "doing"; upsert("items", d.id, it); } UI.sheet = null; UI.editId = null; go("focus"); },
  switchFocus: () => { UI.sheet = "switch"; },
  stepDone: (d) => { const it = item(d.id); if (!it || !Array.isArray(it.steps)) return; const s = it.steps[+d.i]; if (s) { s.d = !s.d; upsert("items", d.id, it); if (s.d) toast("Step done. Next one."); } },
  delStep: (d) => { const it = item(d.id); if (!it || !Array.isArray(it.steps)) return; it.steps.splice(+d.i, 1); upsert("items", d.id, it); },
  breakdown: (d) => breakdown(d.id),
  timerStart: (d) => {
    try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
    setTimer({ phase: "focus", id: d.id, len: focusLen(), end: Date.now() + focusLen() * 60000, pausedLeft: null });
    setMeta("focus", { current: d.id });
    const it = item(d.id); if (it && it.type === "task" && it.status !== "doing") { it.status = "doing"; upsert("items", d.id, it); }
    requestWake();
  },
  timerPause: () => { const T = timerState(); if (T) { T.pausedLeft = timeLeft(T); setTimer(T); document.title = "PraxisAI"; } },
  timerResume: () => { const T = timerState(); if (T && T.pausedLeft != null) { T.end = Date.now() + T.pausedLeft; T.pausedLeft = null; setTimer(T); } },
  timerStop: () => { const T = timerState(); if (T && T.phase === "focus") { const done = Math.round((T.len * 60000 - timeLeft(T)) / 60000); if (done >= 5) logFocus(done); } setTimer(null); releaseWake(); document.title = "PraxisAI"; },
  calm: () => { UI.calm = !UI.calm; lsSet("praxis-calm", UI.calm ? "1" : "0"); },
  toggleMore: () => { UI.showMore = !UI.showMore; },
  toggleDoneList: () => { UI.showDone = !UI.showDone; },
  tab: (d) => { UI.tabs[d.key] = d.val; },
  area: (d) => { UI.area = d.val; },
  advance: (d) => { const it = item(d.id); if (!it) return; const order = ["inbox", "next", "doing", "done"]; const i = order.indexOf(it.status || "next"); const nx = order[Math.min(order.length - 1, (i < 0 ? 1 : i + 1))]; if (nx === "done") { markDone(d.id, true); toast(winLine()); } else { it.status = nx; upsert("items", d.id, it); } },
  invSent: (d) => { const it = item(d.id); if (!it) return; it.status = "sent"; it.issued = it.issued || today(); it.due = it.due || addDays(today(), 30); upsert("items", d.id, it); toast("Marked sent. Due " + fmtShort(it.due) + "."); },
  invPaid: (d) => invoicePaid(d.id),
  mailTask: (d) => { const th = UI.inbox.threads.find((t) => t.id === d.tid); if (!th) return; const m = (th.messages || [])[0] || {}; const from = ((m.addressDisplayNames || [])[0] || {}).displayName || m.sender || "";
    createItem("task", { title: "Reply: " + decode(m.subject || "email"), area: "simasia", status: "next", notes: `From ${from}\n${decode(m.snippet || "")}`, link: th.viewUrl || "" }); toast("Task added to SimasiaAI"); },
  week: (d) => { UI.weekOff = +d.d === 0 ? 0 : UI.weekOff + (+d.d); },
  moneyAsk: () => moneyAsk(),
  careerAsk: () => careerAsk(),
  newWriting: (d) => { const id = createItem("writing", { kind: d.kind, title: "" }); UI.writer = id; },
  write: (d) => { UI.writer = d.id; UI.editId = null; },
  closeWriter: () => { UI.writer = null; },
  prompt: () => { UI.prompt = WRITING_PROMPTS[Math.floor(Math.random() * WRITING_PROMPTS.length)]; },
  hobbyToday: (d) => { setField(d.id, "lastDone", today()); toast("Logged. Good for you."); },
  goalStep: (d) => { const it = item(d.id); if (!it) return; it.current = Math.max(0, num(it.current) + (+d.d)); upsert("items", d.id, it); if (num(it.current) >= num(it.target) && +d.d > 0) toast("Goal reached: " + it.title); },
  habit: (d) => { const it = item(d.id); if (!it) return; it.log = Object.assign({}, it.log); if (it.log[d.d]) delete it.log[d.d]; else it.log[d.d] = true; const cutoff = addDays(today(), -120); for (const k of Object.keys(it.log)) if (k < cutoff) delete it.log[k]; upsert("items", d.id, it); },
  newBoard: () => { const id = uid(); upsert("boards", id, { title: "New board", notes: [], created: Date.now() }); UI.board = id; },
  addSticky: (d) => { const b = S.boards.get(UI.board); if (!b) return; const w = $("#wbwrap"); const x = w ? w.scrollLeft + 30 + Math.random() * Math.max(40, w.clientWidth - 260) : 40, y = w ? w.scrollTop + 30 + Math.random() * Math.max(40, w.clientHeight - 180) : 40; b.notes = (b.notes || []).concat([{ id: uid(), x: Math.round(x), y: Math.round(y), c: d.c, t: "" }]); upsert("boards", UI.board, b); },
  delSticky: (d) => { const b = S.boards.get(UI.board); if (!b) return; b.notes = (b.notes || []).filter((n) => n.id !== d.n); upsert("boards", UI.board, b); },
  noteTask: (d) => { const b = S.boards.get(UI.board); const n = b && (b.notes || []).find((x) => x.id === d.n); if (!n || !n.t.trim()) { toast("Write something on the note first"); return; } createItem("task", { title: n.t.trim().split("\n")[0].slice(0, 140), notes: n.t, status: "inbox" }); toast("Added to Tasks (Inbox)"); },
  newThread: () => { UI.thread = "new"; UI.ai.chat = null; },
  pickThread: (d) => { UI.thread = d.id; UI.ai.chat = null; },
  thinkPrompt: (d) => { sendChat(THINK_PROMPTS[+d.i][1]); },
  stopChat: () => { if (UI.chatCtl) UI.chatCtl.abort(); },
  sortInbox: () => sortInbox(),
  applySort: () => applySort(),
  cancelSort: () => { UI.sort = null; },
  delCapture: (d) => { del("items", d.id); },
  backup: () => backup(),
  draftEmail: (d) => draftEmail(d.id),
  gmailDraft: (d) => gmailDraft(d.id),
  markEmailed: (d) => { const it = item(d.id); if (!it) return; it.stage = it.stage === "todo" ? "emailed" : "followup"; it.followUp = addDays(today(), 5); it.lastEmailed = today(); upsert("items", d.id, it); toast("Follow-up set for " + fmtShort(it.followUp)); },
  mtgPrep: (d) => mtgPrep(d.id),
  sheet: (d) => { UI.sheet = d.s; },
  closeSheet: () => { UI.sheet = null; },
  fab: () => { UI.sheet = "capture"; },
  restoreYes: () => restoreApply(),
  restoreNo: () => { UI.restore = null; }
};
const WINS = ["Done. That's a win.", "Nice. One less thing in your head.", "Done ✓ Take a breath.", "Finished. Momentum is yours.", "Ticked. Small wins add up."];
const winLine = () => WINS[Math.floor(Math.random() * WINS.length)];

function invoicePaid(id) {
  const it = item(id); if (!it) return;
  it.status = "paid"; it.paidOn = today(); upsert("items", id, it);
  const exists = all("txn").some((t) => t.invoice === id);
  if (!exists && num(it.amount) > 0) createItem("txn", { title: `Invoice ${it.number ? it.number + " · " : ""}${it.title || "client"}`, kind: "income", amount: num(it.amount), date: today(), cat: "SimasiaAI", invoice: id });
  toast(`Paid: ${eur(num(it.amount), 1)} added to Money`);
}

// ================= Claude actions =================
async function breakdown(id) {
  const it = item(id); if (!it || !CAP.sample) return;
  const key = "bd-" + id; UI.ai[key] = { loading: true }; renderAll();
  try {
    const arr = await CAP.sample.json(`Break this task into 3 to 6 tiny, concrete steps for someone who finds starting hard. The first step must take under 5 minutes. Each step is at most 12 words and starts with a verb. Write the steps in the same language as the task. Reply with only a JSON array of strings, like ["Open the proposal file", "Write the first sentence"].\n\nTask: ${it.title}\n${it.notes ? "Notes: " + String(it.notes).slice(0, 1200) : ""}`, { modelTier: "quick" });
    const steps = (Array.isArray(arr) ? arr : []).map((s) => String(s).trim()).filter(Boolean).slice(0, 8).map((t) => ({ t, d: false }));
    if (!steps.length) throw { code: "invalid_json" };
    const cur = item(id); if (!cur) return;
    cur.steps = (Array.isArray(cur.steps) ? cur.steps : []).concat(steps); upsert("items", id, cur);
    UI.ai[key] = null; toast(`Added ${steps.length} small steps`);
  } catch (e) { UI.ai[key] = e && e.code === "cancelled" ? null : { err: sampleErr(e) }; }
  renderAll();
}
async function draftEmail(id) {
  const it = item(id); if (!it || !CAP.sample) return;
  const c = UI.compose[id] = Object.assign({ purpose: it.type === "invoice" ? "reminder" : (it.stage === "todo" ? "first" : "follow") }, UI.compose[id] || {}, { loading: true, err: "", saved: false });
  renderAll();
  const lang = it.lang === "en" ? "English" : "Greek";
  const what = {
    first: "a short first email introducing SimasiaAI and asking for a 20-minute call",
    follow: "a short, friendly follow-up to my earlier email, adding one useful thought and a simple question",
    meeting: "a short email asking for a meeting, with two concrete time options next week",
    thanks: "a short thank-you after our meeting, summarising what we agreed and the next step",
    reminder: "a polite payment reminder for this invoice, warm but clear",
    send: "a short email sending this invoice (attached separately)"
  }[c.purpose] || "a short email";
  const facts = it.type === "invoice"
    ? `Client: ${it.title}\nInvoice number: ${it.number || "—"}\nAmount: ${eur(num(it.amount), 1)}\nIssued: ${it.issued || "—"}\nDue: ${it.due || "—"}`
    : `Organisation: ${it.title}\nContact person: ${it.contact || "unknown"}\nWhat they need / notes: ${String(it.notes || "").slice(0, 1500) || "—"}\nCurrent stage: ${labelOf(LEAD_STAGES, it.stage)}`;
  try {
    const r = await CAP.sample.json(`You write emails for Dimitris Papadakis, co-founder of SimasiaAI, an Athens AI company that builds verifiable, hallucination-free AI assistants for patient associations, disability organisations, NGOs and clinics (live examples: Myrto AI for cancer patients with KAPA3, SKP-i for people with multiple sclerosis, BPAN Heroes, Perfectaki Able). His voice: warm, clear, human, a little playful, never hype. Start from the person and their need, then the technology. No buzzwords.
Write ${what}, in ${lang}${lang === "Greek" ? " (polite plural, natural modern Greek)" : ""}. Under 150 words. Plain text, no markdown, no signature block (Gmail adds it); end with his first name.
${facts}
Reply with only JSON: {"subject": "...", "body": "..."}`, { cache: false });
    UI.compose[id] = Object.assign({}, UI.compose[id], { subject: String((r && r.subject) || ""), body: String((r && r.body) || ""), loading: false });
  } catch (e) { UI.compose[id] = Object.assign({}, UI.compose[id], { loading: false, err: e && e.code === "cancelled" ? "" : sampleErr(e) }); }
  renderAll();
}
async function gmailDraft(id) {
  const it = item(id); const c = UI.compose[id] || {};
  if (!it) return;
  const to = String(it.email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) { UI.compose[id] = Object.assign({}, c, { err: "Add a valid email address in the fields below first." }); renderAll(); return; }
  if (!String(c.body || "").trim()) { UI.compose[id] = Object.assign({}, c, { err: "Write the message (or draft it with Claude) first." }); renderAll(); return; }
  UI.compose[id] = Object.assign({}, c, { sending: true, err: "" }); renderAll();
  try {
    const p = await gmail("create_draft", { to: [to], subject: c.subject || "", body: c.body, includeSignature: true });
    UI.compose[id] = Object.assign({}, UI.compose[id], { sending: false, saved: true, url: (p && p.viewUrl) || "" });
    it.lastDraft = today(); upsert("items", id, it);
  } catch (e) { UI.compose[id] = Object.assign({}, UI.compose[id], { sending: false, err: gmailErr(e) + (e && ["server_unavailable", "upstream_error"].includes(e.code) ? " Check Gmail drafts before trying again, it may have been saved." : "") }); }
  renderAll();
}
async function mtgPrep(id) {
  const it = item(id); if (!it || !CAP.sample) return;
  const key = "mtg-" + id; UI.ai[key] = { loading: true, text: "" }; renderAll();
  try {
    const r = await CAP.sample(`Help me prepare a meeting. Keep it short and scannable, plain text with simple dashes, no markdown headings.
Give: 1) one opening sentence I can say, 2) a 3-point agenda, 3) five sharp questions to ask, 4) what to bring or send before, 5) the one outcome to aim for.
Meeting: ${it.title}
Date/time: ${it.date || "?"} ${it.time || ""}
With: ${it.with || "?"}
My goal: ${it.goal || "?"}
Notes so far: ${String(it.prep || it.notes || "").slice(0, 1500)}
Context: ${lifeContext().slice(0, 1800)}`, { cache: false, onText: ({ text }) => { const el = $(`[data-ai="${key}"]`); if (el) el.innerHTML = `<div class="ai-out">${esc(text)}</div>`; } });
    const cur = item(id); if (cur) { cur.prep = (cur.prep ? cur.prep + "\n\n" : "") + r.text; upsert("items", id, cur); }
    UI.ai[key] = null; toast("Prep added to the meeting");
  } catch (e) { UI.ai[key] = e && e.code === "cancelled" ? null : { err: sampleErr(e) }; }
  renderAll();
}
function moneyAsk() {
  const ms = monthsBack(6).map((k) => { const s = moneySnapshot(k); return `${k}: income ${s.inc.toFixed(0)}, spent ${s.exp.toFixed(0)}`; }).join("\n");
  const mk = UI.moneyMonth || monthKey(today());
  const cats = {}; for (const x of all("txn")) if (monthKey(x.date || "") === mk && x.kind !== "income") cats[x.cat || "Other"] = (cats[x.cat || "Other"] || 0) + num(x.amount);
  const m = moneySnapshot(mk);
  askClaude("moneyAsk", `Look at my money and talk to me like a calm, practical friend (not a financial adviser; say so in one short line at the end). Be brief, calm and concrete.
${meta("settings").aboutMe || ""}
Give: what's happening in 2 sentences, the one risk to watch, and one action for this week. Euros.
Monthly floor (must cover): ${m.floor || "not set"}. Freedom target: ${m.target}/month. Savings: ${m.savings || "not set"}. Safety goal: ${m.goalMonths} months.
Last 6 months:\n${ms}
Spending by category in ${mk}: ${Object.entries(cats).map(([c, v]) => c + " " + v.toFixed(0)).join(", ") || "none"}
Unpaid invoices: ${m.unpaid.toFixed(0)} (overdue ${m.overdue.toFixed(0)}).`, { cache: false });
}
function careerAsk() {
  const opps = all("opp").filter(isOpen).sort((a, b) => (a.deadline || "9") < (b.deadline || "9") ? -1 : 1).slice(0, 15).map((o) => `- ${o.title} (${labelOf(OPP_KIND, o.kind)}, ${o.org || ""}) deadline ${o.deadline || "none"}, status ${labelOf(OPP_STATUS, o.status)}, fit ${o.fit || "?"}${o.next ? ", next: " + o.next : ""}`).join("\n");
  const paths = all("path").map((p) => `- ${p.title}: ${p.why || ""}`).join("\n");
  askClaude("careerAsk", `${lifeContext()}
My open opportunities:\n${opps || "- none"}
Career paths I'm testing:\n${paths || "- none"}
Question: what is the ONE most useful career action for me this week, and why? Then name up to two things I should drop or postpone. Be decisive and short. Plain text, no markdown headings.`, { cache: false });
}
async function sortInbox() {
  const caps = all("capture").sort((a, b) => (a.created || 0) - (b.created || 0)).slice(0, 40);
  if (!caps.length || !CAP.sample) return;
  UI.sort = { loading: true }; renderAll();
  try {
    const arr = await CAP.sample.json(`Sort my captured thoughts into PraxisAI items. Today is ${today()}.
Types: task (something to do), note (to remember), project (bigger idea), lead (an organisation SimasiaAI could contact), event (something on a date), writing (a poem or text idea), lesson (something I learned), txn (money spent or earned; put the amount in "amount").
Areas: simasia (SimasiaAI work), career (career & PhD), money, mind (books, therapy, learning), create (writing, projects, hobbies), body (gym, food, health), life (friends, family, home, admin).
Rules: one item per thought unless a thought clearly holds two; short clear titles in the thought's own language; "due" only when a date is stated or obvious (YYYY-MM-DD), else null.
Reply with only a JSON array of objects: {"i": index of the thought, "type": ..., "area": ..., "title": ..., "due": "YYYY-MM-DD" or null, "amount": number or null}.
Thoughts:
${caps.map((c, i) => `${i}. ${String(c.title).slice(0, 400)}`).join("\n")}`, { modelTier: "quick", cache: false });
    const ok = ["task", "note", "project", "lead", "event", "writing", "lesson", "txn"];
    const items = (Array.isArray(arr) ? arr : []).filter((x) => x && x.title && caps[+x.i]).map((x) => ({ i: +x.i, cid: caps[+x.i].id, type: ok.includes(x.type) ? x.type : "task", area: AREAS[x.area] ? x.area : "life", title: String(x.title).slice(0, 200), due: /^\d{4}-\d{2}-\d{2}$/.test(x.due || "") ? x.due : null, amount: num(x.amount) || null, keep: true }));
    if (!items.length) throw { code: "invalid_json" };
    UI.sort = { items };
  } catch (e) { UI.sort = e && e.code === "cancelled" ? null : { err: sampleErr(e) }; }
  renderAll();
}
function applySort() {
  const so = UI.sort; if (!so || !so.items) return;
  const used = new Set(); let n = 0;
  for (const s of so.items) {
    if (s.keep === false) continue;
    const f = { title: s.title, area: s.area };
    if (s.type === "task") { f.status = "next"; if (s.due) f.due = s.due; }
    if (s.type === "event" && s.due) f.date = s.due;
    if (s.type === "txn") { f.amount = s.amount || 0; f.date = s.due || today(); f.kind = "expense"; f.area = "money"; }
    if (s.type === "lead") f.area = "simasia";
    createItem(s.type, f); used.add(s.cid); n++;
  }
  for (const cid of used) del("items", cid);
  UI.sort = null; toast(`Created ${plural(n, "item")}`);
}
async function sendChat(text) {
  text = String(text || "").trim(); if (!text || !CAP.sample) return;
  let tid = UI.thread && UI.thread !== "new" && S.threads.has(UI.thread) ? UI.thread : null;
  if (!tid) { tid = uid(); upsert("threads", tid, { title: text.slice(0, 60), msgs: [], created: Date.now() }); UI.thread = tid; }
  const th = S.threads.get(tid);
  th.msgs = (th.msgs || []).concat([{ role: "user", content: text, at: Date.now() }]).slice(-60);
  upsert("threads", tid, th);
  const RULES = `You are my thinking partner inside PraxisAI, my personal operations app. Be warm, direct and brief: one idea at a time, short paragraphs, concrete next steps, and ask at most one question back. Answer in the language I write in (Greek or English). Plain text; simple dashes for lists.\n\n${lifeContext()}`;
  const turns = th.msgs.slice(-20).map((m) => ({ role: m.role, content: m.content }));
  const ctl = UI.chatCtl = new AbortController();
  UI.ai.chat = { loading: true, text: "" }; renderAll();
  try {
    const r = await CAP.sample([{ role: "user", content: RULES }].concat(turns), { cache: false, signal: ctl.signal, onText: ({ text: t }) => { UI.ai.chat = { loading: true, text: t }; const el = $("#live"); if (el) { el.textContent = t; el.scrollIntoView({ block: "nearest" }); } } });
    const cur = S.threads.get(tid); if (cur) { cur.msgs = (cur.msgs || []).concat([{ role: "assistant", content: r.text, at: Date.now() }]).slice(-60); upsert("threads", tid, cur); }
    UI.ai.chat = null;
  } catch (e) {
    const partial = e && e.text;
    if (partial) { const cur = S.threads.get(tid); if (cur) { cur.msgs = cur.msgs.concat([{ role: "assistant", content: partial + " …", at: Date.now() }]); upsert("threads", tid, cur); } }
    UI.ai.chat = e && e.code === "cancelled" ? null : { err: sampleErr(e) };
  }
  renderAll();
}
async function backup() {
  const o = { app: "praxisai", saved: new Date().toISOString() }; for (const c of COLS) o[c] = Object.fromEntries(S[c]);
  try { await CAP.downloads.save({ filename: `praxisai-backup-${today()}.json`, data: JSON.stringify(o, null, 1) }); }
  catch (e) { if (e && e.code !== "cancelled" && e.code !== "declined") toast("The download didn't start. Try again."); }
}
function restoreApply() {
  const o = UI.restore; if (!o) return;
  let n = 0;
  for (const c of COLS) for (const [id, v] of Object.entries(o[c] || {})) { if (v && typeof v === "object") { upsert(c, id, clone(v)); n++; } }
  UI.restore = null; toast(`Restored ${plural(n, "record")}`);
}

// ================= events =================
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el || el.tagName === "SELECT" || (el.tagName === "INPUT" && el.type !== "checkbox")) return;
  const fn = ACT[el.dataset.act]; if (!fn) return;
  if (el.tagName !== "A") e.preventDefault();
  const r = fn(el.dataset, el);
  if (!(r && r.then)) renderAll();
});
window.addEventListener("hashchange", () => {
  const h = location.hash.slice(1); if (!VIEW_IDS.includes(h)) return;
  UI.view = h; lsSet("praxis-view", h); UI.sheet = null; UI.editId = null; UI.showMore = false;
  renderAll(); window.scrollTo(0, 0);
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (UI.writer) UI.writer = null; else if (UI.editId) UI.editId = null; else if (UI.sheet) UI.sheet = null; else return;
  renderAll();
});
document.addEventListener("input", (e) => {
  const t = e.target, d = t.dataset;
  if (d.field && d.id && t.type !== "checkbox" && t.tagName !== "SELECT") {
    const isText = ["TEXTAREA"].includes(t.tagName) || ["text", "number", "email", "url", ""].includes(t.type);
    if (isText) { setField(d.id, d.field, t.type === "number" ? t.value : t.value, true); if (t.id === "w-body") { const wc = $("#wc"); if (wc) wc.textContent = words(t.value) + " words"; } }
    return;
  }
  if (d.step !== undefined && d.id) { const it = item(d.id); if (it && it.steps && it.steps[+d.step]) { it.steps[+d.step].t = t.value; upsert("items", d.id, it, true); } return; }
  if (d.money) { const s = meta("settings"); setMeta("settings", { money: Object.assign({}, s.money, { [d.money]: t.value }) }, true); return; }
  if (d.setting) { setMeta("settings", { [d.setting]: t.value }, true); return; }
  if (d.sticky) { const b = S.boards.get(UI.board); const n = b && (b.notes || []).find((x) => x.id === d.sticky); if (n) { n.t = t.value; upsert("boards", UI.board, b, true); } return; }
  if (d.boardTitle) { const b = S.boards.get(d.boardTitle); if (b) { b.title = t.value; upsert("boards", d.boardTitle, b, true); } return; }
  if (d.compose && d.id && t.tagName !== "SELECT") { UI.compose[d.id] = Object.assign({}, UI.compose[d.id], { [d.compose]: t.value, saved: false }); return; }
  if (t.id === "q" || t.id === "q2") { UI.q = t.value; const box = t.id === "q" ? $("#results") : $("#results2"); if (box) { const h = searchResults(UI.q); box.innerHTML = h; if (t.id === "q") box.hidden = !h; } }
});
document.addEventListener("change", async (e) => {
  const t = e.target, d = t.dataset;
  if (d.field && d.id && (t.tagName === "SELECT" || t.type === "checkbox" || t.type === "date" || t.type === "time")) {
    const it = item(d.id); if (!it) return;
    const v = t.type === "checkbox" ? t.checked : t.value;
    if (d.field === "status" && it.type === "task") { markDone(d.id, v === "done"); if (v !== "done") setField(d.id, "status", v); }
    else setField(d.id, d.field, v);
    renderAll(); return;
  }
  if (d.act === "convert" && t.value) {
    const c = item(d.id); if (!c) return;
    const f = { title: c.title.split("\n")[0].slice(0, 160), notes: c.title.includes("\n") ? c.title : "" };
    const nid = createItem(t.value, f); del("items", d.id); UI.editId = nid; toast("Turned into " + TYPES[t.value].label.toLowerCase()); renderAll(); return;
  }
  if (d.act === "moneyMonth") { UI.moneyMonth = t.value; renderAll(); return; }
  if (d.act === "pickBoard") { UI.board = t.value; renderAll(); return; }
  if (d.sorti !== undefined && UI.sort && UI.sort.items) { UI.sort.items[+d.sorti].keep = t.checked; return; }
  if (d.compose === "purpose") { UI.compose[d.id] = Object.assign({}, UI.compose[d.id], { purpose: t.value }); return; }
  if (t.id === "restore" && t.files && t.files[0]) {
    try { const o = JSON.parse(await t.files[0].text()); if (!o || !o.items) throw 0; UI.restore = o; } catch (_) { toast("That file isn't a PraxisAI backup"); }
    t.value = ""; renderAll();
  }
});
document.addEventListener("submit", async (e) => {
  const f = e.target, d = f.dataset; e.preventDefault();
  const val = (n) => (f.elements[n] ? String(f.elements[n].value || "").trim() : "");
  switch (d.form) {
    case "quick": {
      const title = val("title"); if (!title) return;
      const type = d.type, x = {};
      for (const [k, v] of Object.entries(d)) if (k.startsWith("x") && k.length > 1) { const key = k[1].toLowerCase() + k.slice(2); x[key] = v; }
      const fields = { title };
      if (x.area) fields.area = x.area; if (x.status) fields.status = x.status; if (x.stage) fields.stage = x.stage; if (x.date) fields.date = x.date;
      if (x.today) fields.today = true;
      const dt = val("date");
      if (dt) { if (type === "task") fields.due = dt; else if (type === "opp" || type === "goal") fields.deadline = dt; else fields.date = dt; }
      const id = createItem(type, fields);
      if (["lead", "invoice", "meeting", "book", "goal", "habit", "opp"].includes(type)) UI.editId = id;
      if (type === "task" && x.today && !meta("focus").current) setMeta("focus", { current: id });
      break;
    }
    case "park": { const t = val("t"); if (!t) return; createItem("capture", { title: t }); toast("Parked in your inbox. Back to the one thing."); break; }
    case "capture": { const lines = val("t").split("\n").map((s) => s.trim()).filter(Boolean); lines.forEach((l) => createItem("capture", { title: l })); if (lines.length) toast(`Saved ${plural(lines.length, "thought")}`); break; }
    case "fab": {
      const t = val("t"); if (!t) return; const how = e.submitter && e.submitter.value;
      if (how === "task") { createItem("task", { title: t, today: true, status: "next" }); toast("Added to today"); } else { createItem("capture", { title: t }); toast("Saved to your inbox"); }
      UI.sheet = null; break;
    }
    case "txn": {
      const amount = num(val("amount")), title = val("title"); if (!title || !amount) return;
      createItem("txn", { title, amount, kind: val("kind") || "expense", cat: val("cat") || "Other", date: val("date") || today() });
      toast(`${val("kind") === "income" ? "Income" : "Expense"} logged`); break;
    }
    case "gmailq": { const q = val("q"); if (q) setMeta("settings", { gmailQuery: q }); renderAll(); loadInbox(true); return; }
    case "chat": { const t = val("m"); if (!t) return; f.reset(); const box = $("#chatbox"); if (box) box.value = ""; sendChat(t); return; }
    case "step": { const t = val("t"); const it = item(d.id); if (!t || !it) return; it.steps = (Array.isArray(it.steps) ? it.steps : []).concat([{ t, d: false }]); upsert("items", d.id, it); break; }
    case "booknote": { const t = val("t"); if (!t) return; createItem("booknote", { title: t, book: d.id, page: val("p") }); toast("Note saved"); break; }
  }
  f.reset();
  renderAll();
});
document.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && e.target.id === "chatbox") { e.preventDefault(); e.target.form.requestSubmit(); } });

// drag cards between task columns (desktop)
let dragId = null;
document.addEventListener("dragstart", (e) => { const c = e.target.closest && e.target.closest("[data-drag]"); if (!c) return; dragId = c.dataset.drag; c.classList.add("dragging"); try { e.dataTransfer.setData("text/plain", dragId); e.dataTransfer.effectAllowed = "move"; } catch (_) {} });
document.addEventListener("dragend", () => { dragId = null; $$(".col.drop").forEach((c) => c.classList.remove("drop")); $$(".dragging").forEach((c) => c.classList.remove("dragging")); });
document.addEventListener("dragover", (e) => { const col = e.target.closest && e.target.closest("[data-drop]"); if (!col || !dragId) return; e.preventDefault(); $$(".col.drop").forEach((c) => c !== col && c.classList.remove("drop")); col.classList.add("drop"); });
document.addEventListener("drop", (e) => {
  const col = e.target.closest && e.target.closest("[data-drop]"); if (!col || !dragId) return; e.preventDefault();
  const st = col.dataset.drop, id = dragId; dragId = null;
  if (st === "done") { markDone(id, true); toast(winLine()); } else { const it = item(id); if (it) { if (it.status === "done") it.doneAt = null; it.status = st; upsert("items", id, it); } }
  renderAll();
});

// whiteboard: drag sticky notes by their handle
let dragging = null;
document.addEventListener("pointerdown", (e) => {
  const h = e.target.closest && e.target.closest("[data-handle]"); if (!h || e.target.closest("button")) return;
  const el = h.parentElement; const id = h.dataset.handle;
  dragging = { id, el, sx: e.clientX, sy: e.clientY, x: parseFloat(el.style.left) || 0, y: parseFloat(el.style.top) || 0 };
  el.classList.add("dragging"); try { h.setPointerCapture(e.pointerId); } catch (_) {} e.preventDefault();
});
document.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const nx = Math.max(0, Math.min(2200, dragging.x + e.clientX - dragging.sx)), ny = Math.max(0, Math.min(1480, dragging.y + e.clientY - dragging.sy));
  dragging.el.style.left = nx + "px"; dragging.el.style.top = ny + "px"; dragging.nx = nx; dragging.ny = ny;
});
document.addEventListener("pointerup", () => {
  if (!dragging) return;
  const g = dragging; dragging = null; g.el.classList.remove("dragging");
  if (g.nx == null) return;
  const b = S.boards.get(UI.board); const n = b && (b.notes || []).find((x) => x.id === g.id);
  if (n) { n.x = Math.round(g.nx); n.y = Math.round(g.ny); upsert("boards", UI.board, b); }
  if (deferred) renderAll();
});

// restore confirmation shown on the Settings page
const _viewSettings = VIEWS.settings;
VIEWS.settings = () => {
  const r = UI.restore;
  const n = r ? COLS.reduce((s, c) => s + Object.keys(r[c] || {}).length, 0) : 0;
  return (r ? `<div class="page" style="margin-bottom:12px"><div class="confirm">Restore ${plural(n, "record")} from the backup? Records with the same id are replaced; nothing else is deleted.<button class="btn sm" data-act="restoreYes">Restore</button><button class="btn quiet sm" data-act="restoreNo">Cancel</button></div></div>` : "") + _viewSettings();
};

// search box in the rail
document.addEventListener("focusin", (e) => { if (e.target.id === "q") { const box = $("#results"); const h = searchResults(UI.q); box.innerHTML = h; box.hidden = !h; } });
document.addEventListener("click", (e) => { if (!e.target.closest(".search")) { const box = $("#results"); if (box) box.hidden = true; } }, true);

// ================= boot =================
renderAll();
initStore();
initCaps();
setInterval(tickTimer, 1000);
setInterval(() => { if (UI.view === "focus" && !isEditing() && !dragging && !UI.editId && !UI.sheet) renderAll(); }, 60000);
