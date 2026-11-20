// PraxisAI standalone: gives the app the same services it gets on claude.ai, from your own stack.
//   storage -> your Netlify site (api/data, behind your passcode), with an offline copy on the device
//   AI      -> Gemini, through your Netlify site (api/ai) or a key kept on this device
//   backup  -> a normal file download
// Without a Netlify backend (for example on GitHub Pages) everything is saved on the device only.
(() => {
  const ls = {
    get: (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch (_) { return false; } },
    del: (k) => { try { localStorage.removeItem(k); } catch (_) {} }
  };
  const api = (p) => new URL("api/" + p, document.baseURI).href;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const COLS = ["items", "boards", "threads", "meta", "nutri"];
  const GOOGLE = "https://generativelanguage.googleapis.com/v1beta/models/";
  const MODELS = ["gemini-flash-latest", "gemini-3.6-flash", "gemini-2.5-flash"];

  const st = { server: null, pass: ls.get("praxis-pass") || "", cloud: false, online: false, lastSync: 0 };
  const ownKey = () => ls.get("praxis-gemini-key") || "";
  const head = () => ({ "content-type": "application/json", "x-praxis-key": st.pass });

  // ---------- passcode screen ----------
  function lock(message) {
    return new Promise((resolve) => {
      let el = document.getElementById("sa-lock");
      if (!el) { el = document.createElement("div"); el.id = "sa-lock"; document.body.appendChild(el); }
      el.innerHTML = `<form class="sa-box"><svg width="44" height="44" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 4 L37 35 H3 Z" fill="none" stroke="var(--brand)" stroke-width="3" stroke-linejoin="round"/><circle cx="20" cy="25" r="4.2" fill="var(--now)"/></svg>
        <h1>PraxisAI</h1><p>${esc(message || "Type your passcode to open your space.")}</p>
        <input class="input" type="password" id="sa-pass" autocomplete="current-password" placeholder="Passcode" aria-label="Passcode" required>
        <button class="btn" type="submit">Open</button><p class="note" id="sa-msg" role="status"></p></form>`;
      const f = el.querySelector("form"), msg = el.querySelector("#sa-msg"), inp = el.querySelector("#sa-pass");
      setTimeout(() => inp.focus(), 50);
      f.addEventListener("submit", async (e) => {
        e.preventDefault();
        const p = inp.value; if (!p) return;
        msg.textContent = "Checking…";
        try {
          const r = await fetch(api("data") + "?since=999999999", { headers: { "x-praxis-key": p }, cache: "no-store" });
          if (r.status === 401) { msg.textContent = "That passcode isn't right."; inp.select(); return; }
          if (!r.ok) { msg.textContent = "The server didn't answer. Try again."; return; }
          st.pass = p; ls.set("praxis-pass", p); el.remove(); resolve();
        } catch (_) { msg.textContent = "No connection. Check your internet and try again."; }
      });
    });
  }

  // ---------- storage: same shape as the claude.ai store ----------
  let docs = new Map(), rev = 0, outbox = new Map(), sending = false, pushTimer = null;
  const subs = [];
  function loadCache() {
    try { const c = JSON.parse(ls.get("praxis-cloud-cache") || "null"); if (c) { docs = new Map(Object.entries(c.docs || {})); rev = c.rev || 0; } } catch (_) {}
    try { const o = JSON.parse(ls.get("praxis-outbox") || "null"); if (o) outbox = new Map(Object.entries(o)); } catch (_) {}
    for (const [k, v] of outbox) { if (v.d) docs.delete(k); else docs.set(k, v.b); }
  }
  let cacheTimer = null;
  function saveCache() {
    clearTimeout(cacheTimer);
    cacheTimer = setTimeout(() => { ls.set("praxis-cloud-cache", JSON.stringify({ rev, docs: Object.fromEntries(docs) })); }, 300);
  }
  const saveOutbox = () => ls.set("praxis-outbox", JSON.stringify(Object.fromEntries(outbox)));
  function snapOf(col) {
    const list = [];
    for (const [k, b] of docs) if (k.startsWith(col + "/")) { const body = JSON.parse(JSON.stringify(b)); list.push({ id: k.slice(col.length + 1), exists: true, data: () => body, metadata: { fromCache: !st.online, hasPendingWrites: outbox.has(k) } }); }
    return { docs: list, size: list.length, empty: !list.length, metadata: { fromCache: !st.online, hasPendingWrites: false } };
  }
  const emit = (cols) => { for (const s of subs) if (!cols || cols.has(s.col)) { try { s.next(snapOf(s.col)); } catch (_) {} } };
  async function pull() {
    try {
      const r = await fetch(api("data") + (rev ? "?since=" + rev : ""), { headers: head(), cache: "no-store" });
      if (r.status === 401) { await relock(); return; }
      if (!r.ok) throw 0;
      const j = await r.json(), touched = new Set();
      if (j.full) { for (const k of [...docs.keys()]) if (!(k in j.docs) && !outbox.has(k)) { docs.delete(k); touched.add(k.split("/")[0]); } }
      for (const [k, b] of Object.entries(j.docs || {})) {
        if (outbox.has(k)) continue; // a newer change from this device is waiting to be sent
        if (b === null) docs.delete(k); else docs.set(k, b);
        touched.add(k.split("/")[0]);
      }
      if (j.rev < rev) { rev = 0; return pull(); } // the server copy was reset: load everything again
      rev = j.rev || 0;
      const first = !st.online; st.online = true; st.lastSync = Date.now(); saveCache();
      emit(first ? null : touched);
    } catch (_) { if (st.online) { st.online = false; emit(null); } }
  }
  async function push() {
    if (sending || !outbox.size) return;
    sending = true;
    const batch = [...outbox.entries()];
    try {
      const r = await fetch(api("data"), { method: "POST", headers: head(), body: JSON.stringify({ ops: batch.map(([k, v]) => (v.d ? { k, d: true } : { k, b: v.b })) }) });
      if (r.status === 401) { sending = false; await relock(); return push(); }
      if (!r.ok) throw 0;
      const j = await r.json();
      for (const [k, v] of batch) if (outbox.get(k) === v) outbox.delete(k);
      if (j.rev === rev + 1) rev = j.rev; // nothing else changed in between
      saveOutbox(); saveCache();
      if (!st.online) { st.online = true; emit(null); }
      st.lastSync = Date.now();
    } catch (_) { if (st.online) { st.online = false; emit(null); } }
    sending = false;
    if (outbox.size && st.online) schedulePush(200);
  }
  const schedulePush = (ms) => { clearTimeout(pushTimer); pushTimer = setTimeout(push, ms); };
  let relocking = null;
  function relock() { if (!relocking) relocking = lock("Your passcode changed. Type the new one.").then(() => { relocking = null; }); return relocking; }
  const db = {
    collection: (col) => ({ onSnapshot: (next) => { const s = { col, next }; subs.push(s); setTimeout(() => next(snapOf(col)), 0); return () => { const i = subs.indexOf(s); if (i >= 0) subs.splice(i, 1); }; } }),
    doc: (path) => ({
      set: async (b) => { const body = JSON.parse(JSON.stringify(b)); docs.set(path, body); outbox.set(path, { b: body }); saveOutbox(); saveCache(); schedulePush(150); },
      delete: async () => { docs.delete(path); outbox.set(path, { d: 1 }); saveOutbox(); saveCache(); schedulePush(150); }
    })
  };
  function startSync() {
    loadCache();
    pull().then(push);
    setInterval(() => { if (document.visibilityState === "visible") { push(); pull(); } }, 25000);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") { push(); pull(); } });
    window.addEventListener("online", () => { push(); pull(); });
    window.addEventListener("pagehide", () => { if (outbox.size) push(); });
  }

  // ---------- AI: Gemini ----------
  const toContents = (input) => (typeof input === "string" ? [{ role: "user", content: input }] : input).map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: String(m.content) }] }));
  const viaServer = () => st.cloud && st.server && st.server.ai;
  const aiReady = () => !!(viaServer() || ownKey());
  async function gemini(input, opts, wantJson) {
    const contents = toContents(input), signal = opts && opts.signal;
    const fail = (code) => { throw { code }; };
    try {
      if (viaServer()) {
        const r = await fetch(api("ai"), { method: "POST", headers: head(), body: JSON.stringify({ contents, json: !!wantJson }), signal });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) fail(j.error === "unauthorized" ? "session_expired" : j.error || "upstream_error");
        return j.text;
      }
      const key = ownKey(); if (!key) fail("no_key");
      for (const model of MODELS) {
        const r = await fetch(GOOGLE + model + ":generateContent", { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key }, signal,
          body: JSON.stringify({ contents, generationConfig: { temperature: 0.4, responseMimeType: wantJson ? "application/json" : "text/plain" } }) });
        if (r.status === 404) continue;
        if (r.status === 429) fail("rate_limited");
        if (r.status === 400 || r.status === 401 || r.status === 403) fail("no_key");
        if (!r.ok) fail("upstream_error");
        const d = await r.json(), c = (d.candidates || [])[0];
        const out = c && c.content && Array.isArray(c.content.parts) ? c.content.parts.map((p) => p.text || "").join("") : "";
        if (!out) fail(d.promptFeedback && d.promptFeedback.blockReason ? "refused" : "empty_completion");
        return out;
      }
      fail("upstream_error");
    } catch (e) {
      if (e && e.code) throw e;
      throw { code: e && e.name === "AbortError" ? "cancelled" : "upstream_error" };
    }
  }
  const sample = async (input, opts) => { const text = await gemini(input, opts, false); if (opts && opts.onText) opts.onText({ text }); return { text, truncated: false }; };
  sample.json = async (input, opts) => {
    const text = await gemini(input, opts, true);
    try { return JSON.parse(text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, "")); } catch (_) { throw { code: "invalid_json" }; }
  };
  const downloads = { save: async ({ filename, data }) => {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], { type: "application/json" })); a.download = filename || "praxisai.json";
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); return {};
  } };

  // ---------- start ----------
  const ready = (async () => {
    let server = null, reached = false;
    try { const r = await fetch(api("status"), { cache: "no-store" }); reached = true; if (r.ok) { const j = await r.json(); if (j && j.app === "praxis") server = j; } } catch (_) {}
    if (reached) { if (server) ls.set("praxis-server", JSON.stringify(server)); else ls.del("praxis-server"); }
    else { try { server = JSON.parse(ls.get("praxis-server") || "null"); } catch (_) {} } // offline: use what we knew
    st.server = server;
    if (server && server.sync) {
      if (!st.pass) await lock();
      st.cloud = true; startSync();
    }
  })();
  const services = { db: () => (st.cloud ? db : null), sample: () => (aiReady() ? sample : null), downloads: () => downloads, user: () => ({ canEdit: async () => true }) };
  window.claude = { use: async (name) => { await ready; return services[name] ? services[name]() : null; } };

  // ---------- "This app" card in Settings ----------
  window.__standalone = {
    settingsHTML() {
      const s = st.server;
      const sync = st.cloud ? `<span class="dot ${st.online ? "ok" : "warn"}"></span>${st.online ? "Synced through your own Netlify site, on every device where you type your passcode." : "Offline. Changes are kept on this device and sent when you're back online."}${outbox.size ? ` ${outbox.size} waiting to send.` : ""}`
        : s ? '<span class="dot warn"></span>Saved on this device only. To sync your phone and laptop, add APP_PASSCODE in your Netlify site settings and redeploy.'
        : '<span class="dot warn"></span>Saved on this device only. This address has no sync server; use your Netlify address to sync between devices.';
      const ai = viaServer() ? '<p><span class="dot ok"></span>Gemini is on. The key is stored on your Netlify site, not in the app.</p>'
        : `<p>${ownKey() ? '<span class="dot ok"></span>Gemini is on, using the key saved on this device.' : '<span class="dot warn"></span>Gemini is off. Paste a Gemini API key to turn on calorie estimates and the other AI buttons.'}</p>
          <div class="addrow"><input class="input" type="password" id="sa-key" placeholder="${ownKey() ? "Replace the saved key" : "Gemini API key"}" autocomplete="off" aria-label="Gemini API key"><button class="btn ghost" data-sa="savekey">Save key</button>${ownKey() ? '<button class="btn quiet" data-sa="delkey">Remove</button>' : ""}</div>
          <p class="note">Get a key at aistudio.google.com/apikey. It stays on this device and is sent only to Google.</p>`;
      return `<div class="card"><h3>This app</h3><p>${sync}</p>${st.cloud ? '<div class="row"><button class="btn ghost sm" data-sa="syncnow">Sync now</button><button class="btn quiet sm" data-sa="signout">Lock this device</button></div>' : ""}</div>
        <div class="card"><h3>Gemini</h3>${ai}</div>`;
    }
  };
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-sa]"); if (!b) return;
    e.preventDefault();
    const a = b.dataset.sa;
    if (a === "savekey") { const v = (document.getElementById("sa-key").value || "").trim(); if (v.length < 20) { document.getElementById("sa-key").focus(); return; } ls.set("praxis-gemini-key", v); location.reload(); }
    if (a === "delkey") { ls.del("praxis-gemini-key"); location.reload(); }
    if (a === "syncnow") { b.textContent = "Syncing…"; await push(); await pull(); location.hash = "#settings"; window.dispatchEvent(new Event("hashchange")); }
    if (a === "signout") {
      if (outbox.size) { await push(); if (outbox.size) { b.textContent = "Still sending changes. Try again when online."; return; } }
      ["praxis-pass", "praxis-cloud-cache", "praxis-outbox"].forEach(ls.del); location.reload();
    }
  });
  if ("serviceWorker" in navigator && location.protocol === "https:") window.addEventListener("load", () => { navigator.serviceWorker.register("sw.js").catch(() => {}); });
})();
