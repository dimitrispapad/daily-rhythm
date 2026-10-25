// Small, dependency-free iCalendar reader: parses .ics text and expands
// recurring events into concrete occurrences inside a time window.
// Covers what Apple Calendar publishes: TZID / UTC / all-day times, RRULE
// (DAILY, WEEKLY, MONTHLY, YEARLY with INTERVAL, COUNT, UNTIL, BYDAY,
// BYMONTHDAY, BYMONTH, BYSETPOS), EXDATE, RECURRENCE-ID overrides, CANCELLED.

const DEFAULT_TZ = "Europe/Athens";
const DAY = 86400000;
const WD = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

// ---------- parsing ----------
function unescapeText(v) {
  return v.replace(/\\(n|N|,|;|\\)/g, (_, c) => (c === "n" || c === "N" ? "\n" : c));
}

function parseLine(line) {
  // NAME;PARAM=VAL;PARAM="V:AL":VALUE  (colon inside quotes is not the separator)
  let i = 0, inQ = false;
  for (; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQ = !inQ;
    else if (ch === ":" && !inQ) break;
  }
  const head = line.slice(0, i), value = line.slice(i + 1);
  const parts = [];
  let cur = ""; inQ = false;
  for (const ch of head) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === ";" && !inQ) { parts.push(cur); cur = ""; } else cur += ch;
  }
  parts.push(cur);
  const name = parts.shift().toUpperCase();
  const params = {};
  for (const p of parts) { const eq = p.indexOf("="); if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1); }
  return { name, params, value };
}

function parseICS(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const root = { type: "ROOT", props: {}, children: [] };
  const stack = [root];
  for (const raw of lines) {
    if (!raw.trim()) continue;
    const { name, params, value } = parseLine(raw);
    const top = stack[stack.length - 1];
    if (name === "BEGIN") { const c = { type: value.toUpperCase(), props: {}, children: [] }; top.children.push(c); stack.push(c); }
    else if (name === "END") { if (stack.length > 1) stack.pop(); }
    else (top.props[name] = top.props[name] || []).push({ params, value });
  }
  return root;
}

// ---------- time zones ----------
const fmtCache = {};
function validTz(tz) {
  if (!tz) return null;
  const candidates = [tz, tz.replace(/^.*?([A-Za-z]+\/[A-Za-z_\-+]+(?:\/[A-Za-z_\-+]+)?)$/, "$1")];
  for (const c of candidates) { try { new Intl.DateTimeFormat("en-US", { timeZone: c }); return c; } catch (_) {} }
  return null;
}
function tzOffset(ms, tz) {
  const f = fmtCache[tz] || (fmtCache[tz] = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"
  }));
  const p = {}; for (const x of f.formatToParts(new Date(ms))) p[x.type] = x.value;
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000;
}
// Wall-clock time in tz -> UTC ms
function zonedToUtc(y, mo, d, h, mi, s, tz) {
  const guess = Date.UTC(y, mo, d, h, mi, s);
  const o1 = tzOffset(guess - tzOffset(guess, tz), tz);
  return guess - o1;
}

// value like 20261025T093000Z, 20261025T093000, 20261025
function parseTime(prop, fallbackTz) {
  if (!prop) return null;
  const v = prop.value.trim();
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/.exec(v);
  if (!m) return null;
  const y = +m[1], mo = +m[2] - 1, d = +m[3];
  if (prop.params.VALUE === "DATE" || m[4] === undefined) return { allDay: true, y, mo, d };
  const h = +m[4], mi = +m[5], s = +(m[6] || 0);
  if (m[7]) return { allDay: false, utc: true, tz: "UTC", y, mo, d, h, mi, s, ms: Date.UTC(y, mo, d, h, mi, s) };
  const tz = validTz(prop.params.TZID) || fallbackTz;
  return { allDay: false, tz, y, mo, d, h, mi, s, ms: zonedToUtc(y, mo, d, h, mi, s, tz) };
}

function parseDuration(v) {
  const m = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec((v || "").trim());
  if (!m) return null;
  const ms = ((+m[2] || 0) * 7 * DAY) + ((+m[3] || 0) * DAY) + ((+m[4] || 0) * 3600000) + ((+m[5] || 0) * 60000) + ((+m[6] || 0) * 1000);
  return m[1] === "-" ? -ms : ms;
}

// ---------- recurrence ----------
const dayNum = (y, mo, d) => Math.floor(Date.UTC(y, mo, d) / DAY);
const fromDayNum = (n) => { const x = new Date(n * DAY); return { y: x.getUTCFullYear(), mo: x.getUTCMonth(), d: x.getUTCDate() }; };
const weekday = (n) => (new Date(n * DAY).getUTCDay());
const daysInMonth = (y, mo) => new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();

function parseRRule(v) {
  const r = {};
  for (const part of v.split(";")) { const [k, val] = part.split("="); if (k && val !== undefined) r[k.toUpperCase()] = val; }
  const out = {
    freq: r.FREQ, interval: Math.max(1, +(r.INTERVAL || 1)), count: r.COUNT ? +r.COUNT : null, until: null,
    byday: r.BYDAY ? r.BYDAY.split(",").map((x) => { const m = /^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/.exec(x.trim()); return m ? { n: m[1] ? +m[1] : 0, wd: WD.indexOf(m[2]) } : null; }).filter(Boolean) : null,
    bymonthday: r.BYMONTHDAY ? r.BYMONTHDAY.split(",").map(Number) : null,
    bymonth: r.BYMONTH ? r.BYMONTH.split(",").map((x) => +x - 1) : null,
    bysetpos: r.BYSETPOS ? r.BYSETPOS.split(",").map(Number) : null,
    untilRaw: r.UNTIL || null
  };
  return out;
}

function nthWeekdayInMonth(y, mo, wd, n) {
  const first = dayNum(y, mo, 1), dim = daysInMonth(y, mo);
  const all = [];
  for (let i = 0; i < dim; i++) if (weekday(first + i) === wd) all.push(first + i);
  if (!n) return all;
  const pick = n > 0 ? all[n - 1] : all[all.length + n];
  return pick === undefined ? [] : [pick];
}

// Candidate day numbers for one period of the rule
function candidates(rule, start, periodIndex) {
  const step = periodIndex * rule.interval;
  let days = [];
  if (rule.freq === "DAILY") {
    days = [start.dn + step];
  } else if (rule.freq === "WEEKLY") {
    const weekStart = start.dn - ((weekday(start.dn) + 6) % 7) + step * 7; // Monday
    const wds = rule.byday ? rule.byday.map((b) => b.wd) : [weekday(start.dn)];
    days = wds.map((wd) => weekStart + ((wd + 6) % 7));
  } else if (rule.freq === "MONTHLY") {
    const total = start.y * 12 + start.mo + step, y = Math.floor(total / 12), mo = total % 12, dim = daysInMonth(y, mo);
    let set = null;
    if (rule.byday) { set = []; for (const b of rule.byday) set.push(...nthWeekdayInMonth(y, mo, b.wd, b.n)); }
    if (rule.bymonthday) {
      const md = rule.bymonthday.map((x) => (x > 0 ? x : dim + x + 1)).filter((x) => x >= 1 && x <= dim).map((x) => dayNum(y, mo, x));
      set = set ? set.filter((x) => md.includes(x)) : md;
    }
    if (!set) set = start.d <= dim ? [dayNum(y, mo, start.d)] : [];
    days = set;
  } else if (rule.freq === "YEARLY") {
    const y = start.y + step;
    const months = rule.bymonth || [start.mo];
    for (const mo of months) {
      const dim = daysInMonth(y, mo);
      if (rule.byday) for (const b of rule.byday) days.push(...nthWeekdayInMonth(y, mo, b.wd, b.n));
      else if (rule.bymonthday) days.push(...rule.bymonthday.map((x) => (x > 0 ? x : dim + x + 1)).filter((x) => x >= 1 && x <= dim).map((x) => dayNum(y, mo, x)));
      else if (start.d <= dim) days.push(dayNum(y, mo, start.d));
    }
  }
  if (rule.bymonth && rule.freq !== "YEARLY") days = days.filter((n) => rule.bymonth.includes(fromDayNum(n).mo));
  if (rule.byday && rule.freq === "DAILY") days = days.filter((n) => rule.byday.some((b) => b.wd === weekday(n)));
  days = [...new Set(days)].sort((a, b) => a - b);
  if (rule.bysetpos) { const all = days; days = rule.bysetpos.map((p) => (p > 0 ? all[p - 1] : all[all.length + p])).filter((x) => x !== undefined).sort((a, b) => a - b); }
  return days;
}

// Yields occurrence start descriptors (day number + start wall clock)
function* expand(rule, start, untilMs, endLimitMs, toMs) {
  let emitted = 0;
  for (let p = 0; p < 20000; p++) {
    const days = candidates(rule, start, p);
    if (!days.length) {
      // period with no matches; still stop once periods are past the window
      if (p > 0 && periodStartMs(rule, start, p, toMs) > endLimitMs) return;
      continue;
    }
    for (const dn of days) {
      if (dn < start.dn) continue;
      const ms = toMs(dn);
      if (untilMs !== null && ms > untilMs) return;
      if (ms > endLimitMs) return;
      yield { dn, ms };
      emitted++;
      if (rule.count && emitted >= rule.count) return;
    }
  }
}
function periodStartMs(rule, start, p, toMs) {
  const step = p * rule.interval;
  if (rule.freq === "DAILY") return toMs(start.dn + step);
  if (rule.freq === "WEEKLY") return toMs(start.dn + step * 7);
  if (rule.freq === "MONTHLY") { const t = start.y * 12 + start.mo + step; return toMs(dayNum(Math.floor(t / 12), t % 12, 1)); }
  return toMs(dayNum(start.y + step, 0, 1));
}

// ---------- events ----------
const get = (c, k) => (c.props[k] ? c.props[k][0] : null);
const text = (c, k) => { const p = get(c, k); return p ? unescapeText(p.value).trim() : ""; };
const isoDate = (y, mo, d) => `${y}-${String(mo + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

function eventsFromICS(icsText, opts) {
  const from = opts.from, to = opts.to, fallbackTz = validTz(opts.tz) || DEFAULT_TZ;
  const root = parseICS(icsText);
  const cal = root.children.find((c) => c.type === "VCALENDAR") || root;
  const calTz = validTz(text(cal, "X-WR-TIMEZONE")) || fallbackTz;
  const calName = text(cal, "X-WR-CALNAME") || opts.name || "Calendar";
  const vevents = cal.children.filter((c) => c.type === "VEVENT");

  // overrides: UID -> Map(recurrence-id key -> component)
  const overrides = {};
  const keyOf = (t) => (t.allDay ? isoDate(t.y, t.mo, t.d) : String(t.ms));
  for (const ev of vevents) {
    const rid = get(ev, "RECURRENCE-ID");
    if (!rid) continue;
    const t = parseTime(rid, calTz); if (!t) continue;
    const uid = text(ev, "UID");
    (overrides[uid] = overrides[uid] || new Map()).set(keyOf(t), ev);
  }

  const out = [];
  const push = (ev, sT, startMs, endMs, allDayStart, allDayEnd) => {
    if (text(ev, "STATUS").toUpperCase() === "CANCELLED") return;
    const busy = text(ev, "TRANSP").toUpperCase() !== "TRANSPARENT";
    const base = { t: text(ev, "SUMMARY") || "Busy", loc: text(ev, "LOCATION") || undefined, cal: calName, busy };
    if (sT.allDay) {
      const sDn = allDayStart, eDn = Math.max(allDayEnd, allDayStart + 1);
      if (sDn * DAY >= to || eDn * DAY <= from - DAY) return;
      const a = fromDayNum(sDn), b = fromDayNum(eDn);
      out.push(Object.assign(base, { allDay: true, s: isoDate(a.y, a.mo, a.d), e: isoDate(b.y, b.mo, b.d) }));
    } else {
      if (startMs >= to || endMs <= from) return;
      out.push(Object.assign(base, { allDay: false, s: new Date(startMs).toISOString(), e: new Date(endMs).toISOString() }));
    }
  };

  for (const ev of vevents) {
    const sT = parseTime(get(ev, "DTSTART"), calTz);
    if (!sT) continue;
    const eT = parseTime(get(ev, "DTEND"), calTz);
    const dur = parseDuration(text(ev, "DURATION"));
    const uid = text(ev, "UID");

    if (get(ev, "RECURRENCE-ID")) { // a moved/changed single occurrence
      if (sT.allDay) { const s = dayNum(sT.y, sT.mo, sT.d); const e = eT ? dayNum(eT.y, eT.mo, eT.d) : s + Math.max(1, Math.round((dur || DAY) / DAY)); push(ev, sT, 0, 0, s, e); }
      else { const e = eT ? eT.ms : sT.ms + (dur !== null ? dur : 0); push(ev, sT, sT.ms, e, 0, 0); }
      continue;
    }

    // length of the event
    let lenMs, lenDays;
    if (sT.allDay) lenDays = eT ? dayNum(eT.y, eT.mo, eT.d) - dayNum(sT.y, sT.mo, sT.d) : Math.max(1, Math.round((dur || DAY) / DAY));
    else lenMs = eT ? eT.ms - sT.ms : (dur !== null ? dur : 0);

    const rr = get(ev, "RRULE");
    if (!rr) {
      if (sT.allDay) { const s = dayNum(sT.y, sT.mo, sT.d); push(ev, sT, 0, 0, s, s + lenDays); }
      else push(ev, sT, sT.ms, sT.ms + lenMs, 0, 0);
      continue;
    }

    const rule = parseRRule(rr.value);
    if (!["DAILY", "WEEKLY", "MONTHLY", "YEARLY"].includes(rule.freq)) continue;
    const start = { dn: dayNum(sT.y, sT.mo, sT.d), y: sT.y, mo: sT.mo, d: sT.d };
    const toMs = sT.allDay
      ? (dn) => dn * DAY
      : sT.utc
        ? (dn) => dn * DAY + (sT.h * 3600 + sT.mi * 60 + sT.s) * 1000
        : (dn) => { const c = fromDayNum(dn); return zonedToUtc(c.y, c.mo, c.d, sT.h, sT.mi, sT.s, sT.tz); };
    let untilMs = null;
    if (rule.untilRaw) {
      const u = parseTime({ value: rule.untilRaw, params: {} }, sT.tz || calTz);
      untilMs = u ? (u.allDay ? (dayNum(u.y, u.mo, u.d) + 1) * DAY - 1 : u.ms) : null;
    }
    const exdates = new Set();
    for (const ex of ev.props.EXDATE || []) {
      for (const v of ex.value.split(",")) {
        const t = parseTime({ value: v.trim(), params: ex.params }, calTz);
        if (t) exdates.add(sT.allDay ? isoDate(t.y, t.mo, t.d) : String(t.allDay ? toMs(dayNum(t.y, t.mo, t.d)) : t.ms));
      }
    }
    const ov = overrides[uid] || new Map();
    const lastStart = to + (sT.allDay ? DAY : 0);
    for (const occ of expand(rule, start, untilMs, lastStart, toMs)) {
      const c = fromDayNum(occ.dn);
      const key = sT.allDay ? isoDate(c.y, c.mo, c.d) : String(occ.ms);
      if (exdates.has(key) || ov.has(key)) continue;
      if (sT.allDay) push(ev, sT, 0, 0, occ.dn, occ.dn + lenDays);
      else push(ev, sT, occ.ms, occ.ms + lenMs, 0, 0);
    }
  }
  return { name: calName, events: out };
}

module.exports = { parseICS, eventsFromICS, zonedToUtc, parseRRule };
