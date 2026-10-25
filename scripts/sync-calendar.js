// Reads Dimitris's iCloud calendar(s), keeps the next few weeks of events,
// encrypts them with CAL_PASSPHRASE and writes _site/events.enc.json.
// Run by the GitHub Action. Needs two repository secrets:
//   ICLOUD_CALENDAR_URLS  one or more iCloud "Public Calendar" links (webcal://...), one per line
//   CAL_PASSPHRASE        the passphrase typed once into the app on each device
// Writes "changed=true|false" to $GITHUB_OUTPUT so scheduled runs only publish when events changed.

const fs = require("fs");
const path = require("path");
const { webcrypto: crypto } = require("crypto");
const { eventsFromICS } = require("./ical.js");

const OUT = path.join(__dirname, "..", "_site", "events.enc.json");
const DAY = 86400000;
const ITER = 250000;

const setOutput = (k, v) => { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };
const b64 = (buf) => Buffer.from(buf).toString("base64");
const unb64 = (s) => new Uint8Array(Buffer.from(s, "base64"));

async function keyFrom(pass, salt) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITER }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function encrypt(obj, pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await keyFrom(pass, salt), new TextEncoder().encode(JSON.stringify(obj)));
  return { v: 1, kdf: "PBKDF2-SHA256", iter: ITER, salt: b64(salt), iv: b64(iv), data: b64(data) };
}
async function decrypt(file, pass) {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(file.iv) }, await keyFrom(pass, unb64(file.salt)), unb64(file.data));
  return JSON.parse(new TextDecoder().decode(plain));
}

async function fetchText(url, ms = 30000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctl.signal, headers: { "User-Agent": "daily-rhythm-sync" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.text();
  } finally { clearTimeout(t); }
}

async function previous(pagesUrl) {
  try {
    const res = await fetch(pagesUrl + "events.enc.json?nocache=" + Date.now());
    if (!res.ok) return null;
    return await res.json();
  } catch (_) { return null; }
}

async function main() {
  const urls = (process.env.ICLOUD_CALENDAR_URLS || "").split(/[\s,]+/).map((u) => u.trim()).filter(Boolean)
    .map((u) => u.replace(/^webcal:\/\//i, "https://"));
  const pass = process.env.CAL_PASSPHRASE || "";
  const repo = process.env.GITHUB_REPOSITORY || "dimitrispapad/daily-rhythm";
  const [owner, name] = repo.split("/");
  const pagesUrl = process.env.PAGES_URL || `https://${owner.toLowerCase()}.github.io/${name}/`;

  if (!urls.length || !pass) {
    console.log("Calendar not connected yet (add ICLOUD_CALENDAR_URLS and CAL_PASSPHRASE secrets). Skipping.");
    setOutput("changed", "false");
    return;
  }

  const prev = await previous(pagesUrl);
  let prevPlain = null;
  if (prev) { try { prevPlain = await decrypt(prev, pass); } catch (_) { console.log("Published events use a different passphrase; replacing them."); } }

  const now = Date.now();
  const from = now - 2 * DAY, to = now + 35 * DAY;
  const calendars = [], events = [];
  let failed = 0;
  for (const [i, url] of urls.entries()) {
    try {
      const ics = await fetchText(url);
      if (!/BEGIN:VCALENDAR/.test(ics)) throw new Error("not a calendar");
      const r = eventsFromICS(ics, { from, to, tz: "Europe/Athens", name: "Calendar " + (i + 1) });
      calendars.push(r.name);
      events.push(...r.events);
      console.log(`Calendar ${i + 1}: ${r.events.length} events in the next 5 weeks.`);
    } catch (e) {
      failed++;
      console.log(`Calendar ${i + 1}: could not read it (${e.message}). Check the link is still shared as a Public Calendar.`);
    }
  }

  if (failed === urls.length) {
    // Keep what was published before rather than wiping the events.
    if (prev) { fs.writeFileSync(OUT, JSON.stringify(prev)); console.log("Kept the previously published events."); }
    setOutput("changed", "false");
    process.exitCode = prev ? 0 : 1;
    return;
  }

  const seen = new Set();
  const list = events.filter((e) => { const k = e.t + "|" + e.s + "|" + e.e; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => (a.s < b.s ? -1 : a.s > b.s ? 1 : 0));
  const same = prevPlain && JSON.stringify(prevPlain.events) === JSON.stringify(list) && JSON.stringify(prevPlain.calendars) === JSON.stringify(calendars);

  if (same) {
    fs.writeFileSync(OUT, JSON.stringify(prev));
    console.log(`No change: ${list.length} events.`);
    setOutput("changed", "false");
  } else {
    fs.writeFileSync(OUT, JSON.stringify(await encrypt({ updated: new Date().toISOString(), calendars, events: list }, pass)));
    console.log(`Updated: ${list.length} events from ${calendars.length} calendar(s).`);
    setOutput("changed", "true");
  }
}

if (require.main === module) main().catch((e) => { console.error("Calendar sync failed:", e.message); process.exitCode = 1; });

module.exports = { encrypt, decrypt };
