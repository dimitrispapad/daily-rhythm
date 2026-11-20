// ================= GYM =================
// Sessions live in meta/gymLog = { days: { "YYYY-MM-DD": { type, mins, effort, note } } }.
const GLOG = () => meta("gymLog");
const gymDays = () => GLOG().days || {};
const GYM_TYPES = ["Weights", "Cardio", "Mobility / yoga", "Sport", "Other"];
UI.gymDay = null; UI.gymP = null;
// The trainer's programme: meta/gymPlan = { gym, coach, date, weeks, rest, days: [{ name, groups: [{ name, ex: [{ n, sets, reps }] }] }], finish: { name, ex } }
const GPLAN = () => meta("gymPlan");
function nextProgDay() { const P = GPLAN(), log = gymDays(); if (!P.days) return 0; const last = Object.keys(log).filter((d) => d < today() && log[d].pday != null).sort().pop(); return last ? (num(log[last].pday) + 1) % P.days.length : 0; }
function progHTML(sel, cur) {
  const P = GPLAN(); if (!P.days || !P.days.length) return "";
  const pd = UI.gymP != null ? UI.gymP : cur && cur.pday != null ? num(cur.pday) : nextProgDay(), day = P.days[pd] || P.days[0];
  const done = (cur && cur.done) || [], kg = (cur && cur.kg) || {}, last = GLOG().last || {};
  const wk = P.date ? Math.floor(-daysUntil(P.date) / 7) + 1 : 0;
  const row = (e, key) => `<div class="exrow"><button class="tick" data-act="gymEx" data-d="${sel}" data-k="${key}" data-p="${pd}" aria-pressed="${done.includes(key)}" aria-label="${esc(e.n)}">${ICON.check}</button>
      <div style="min-width:0"><b>${esc(e.n)}</b><div class="s">${esc(e.sets)} × ${esc(e.reps)}${last[key] && !kg[key] ? ` · last time ${esc(last[key])} kg` : ""}</div></div>
      <input class="input kg" type="number" inputmode="decimal" step="0.5" min="0" max="500" id="kg-${sel}-${key}" data-kg="${key}" data-d="${sel}" data-p="${pd}" value="${esc(kg[key] != null ? kg[key] : "")}" placeholder="${last[key] ? esc(last[key]) : "kg"}" aria-label="${esc(e.n)} kg"></div>`;
  const all = day.groups.reduce((n, g) => n + g.ex.length, 0) + ((P.finish && P.finish.ex.length) || 0);
  return `<div class="card"><div class="card-h"><h3>My programme</h3><span class="note">${[P.gym, P.coach && "by " + P.coach, wk > 0 && P.weeks && `week ${Math.min(wk, P.weeks)} of ${P.weeks}`].filter(Boolean).map(esc).join(" · ")}</span></div>
    <div class="chips">${P.days.map((d, i) => `<button class="pill" data-act="gymP" data-i="${i}" aria-pressed="${i === pd}">${esc(d.name)}</button>`).join("")}</div>
    <div class="row between"><span class="note">${esc(day.groups.map((g) => g.name).join(" · "))}</span><span class="chip ${done.length >= all ? "good" : ""}">${done.length}/${all}</span></div>
    ${day.groups.map((g, gi) => `<div class="exgroup"><span class="eyebrow">${esc(g.name)}</span>${g.ex.map((e, i) => row(e, `d${pd}-${gi}-${i}`)).join("")}</div>`).join("")}
    ${P.finish ? `<div class="exgroup"><span class="eyebrow">${esc(P.finish.name)}</span>${P.finish.ex.map((e, i) => row(e, `f-${i}`)).join("")}</div>` : ""}
    ${P.rest ? `<p class="note">${esc(P.rest)}</p>` : ""}</div>`;
}
function gymTarget() { const h = [...S.items.values()].find((i) => i.type === "habit" && /gym/i.test(i.title || "")); return (h && num(h.perWeek)) || 4; }
function viewGym() {
  const t = today(), ws = weekStart(t), days = [...Array(7)].map((_, i) => addDays(ws, i)), log = gymDays();
  const sel = UI.gymDay || t, cur = log[sel], done = days.filter((d) => log[d]).length, target = gymTarget();
  const n = NUT(), dayType = n.days ? nutDay(sel) : null;
  const r = typeof PLAN !== "undefined" && PLAN && PLAN.days ? PLAN.days[dayKeyOf(sel)] : null, blk = r && r.blocks ? r.blocks.find((b) => b.tag === "gym") : null;
  const mins = days.reduce((s, d) => s + (log[d] ? num(log[d].mins) : 0), 0);
  const past = Object.keys(log).sort().reverse().slice(0, 12);
  return `<div class="page">${head("Gym", n.exercise ? esc(n.exercise) : "Your training, session by session.")}
    <div class="grid food2" style="align-items:start"><div class="stack" style="gap:14px">
      <div class="card" style="${ac("body")};border-top:3px solid var(--ac)"><div class="card-h"><h3>This week</h3><span class="chip ${done >= target ? "good" : ""}">${done} of ${target} sessions</span></div>
        ${bar((done / target) * 100, done >= target ? "good" : "")}
        <div class="wk">${days.map((d) => `<button class="${d === sel ? "sel" : ""}" data-act="gymDay" data-d="${d}" aria-pressed="${!!log[d]}" aria-label="${fmtDay(d)}"><span>${DAY_NAME[dayKeyOf(d)]}</span><span>${log[d] ? "✓" : d === t ? "•" : ""}</span></button>`).join("")}</div>
        <p class="note">${mins ? `${mins} minutes of training this week. ` : ""}Tap a day to log or change it.</p></div>
      <div class="card"><div class="card-h"><h3>${sel === t ? "Today" : fmtDay(sel)}</h3>${dayType ? `<span class="chip area" style="${ac("body")}">${esc(dayType.en)}</span>` : ""}</div>
        ${blk && !GPLAN().days ? `<p><b>Suggested:</b> ${esc(blk.t.replace("Gym: ", ""))}</p><p class="note">${esc(blk.d || "")}</p>` : ""}
        ${cur ? `<div class="it done" style="${ac("body")}"><span class="chip good">✓</span><div style="min-width:0"><b>${esc(cur.type || "Session")}</b><div class="m">${cur.mins ? `<span class="chip">${num(cur.mins)} min</span>` : ""}${cur.effort ? `<span class="chip">Effort ${num(cur.effort)}/5</span>` : ""}</div>${cur.note ? `<div class="s">${esc(cur.note)}</div>` : ""}</div><button class="btn quiet sm" data-act="gymDel" data-d="${sel}">Remove</button></div>` : ""}
        <form class="stack" data-form="gym" data-d="${sel}">
          <div class="fgrid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">
            <label class="f">Type<select class="input" name="type" id="gym-type">${GYM_TYPES.map((x) => `<option ${cur && cur.type === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>
            <label class="f">Minutes<input class="input" name="mins" id="gym-mins" type="number" inputmode="numeric" min="0" max="600" value="${cur ? esc(cur.mins || "") : ""}" placeholder="60"></label>
            <label class="f">Effort (1–5)<select class="input" name="effort" id="gym-effort">${["", 1, 2, 3, 4, 5].map((x) => `<option value="${x}" ${cur && String(cur.effort || "") === String(x) ? "selected" : ""}>${x || "—"}</option>`).join("")}</select></label>
          </div>
          <textarea class="input" name="note" id="gym-note" rows="2" placeholder="What you did: exercises, weights, how it felt" aria-label="Session notes">${cur ? esc(cur.note || "") : ""}</textarea>
          <div class="row"><button class="btn" type="submit">${cur ? "Update session" : "Log session"}</button></div>
        </form></div>
      ${progHTML(sel, cur)}
    </div><div class="stack" style="gap:14px">
      <div class="card"><h3>Recent sessions</h3><div class="list">${past.map((d) => `<div class="it"><span class="chip">${fmtShort(d)}</span><div style="min-width:0"><b>${esc(log[d].pday != null && GPLAN().days && GPLAN().days[log[d].pday] ? GPLAN().days[log[d].pday].name : log[d].type || "Session")}</b><div class="s">${[log[d].done && log[d].done.length && log[d].done.length + " exercises", log[d].mins && num(log[d].mins) + " min", log[d].effort && "Effort " + num(log[d].effort) + "/5", log[d].note].filter(Boolean).map(esc).join(" · ")}</div></div></div>`).join("") || '<p class="note">No sessions logged yet. Log the first one after your next workout.</p>'}</div></div>
      ${n.days ? weightHTML() : ""}
    </div></div></div>`;
}
VIEWS.gym = viewGym;
