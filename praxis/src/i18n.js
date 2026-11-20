// Greek interface. The app is written in English; this translates what is shown on screen,
// using the phrase list in el.json. Anything not in the list stays in English. Your own text is never changed.
(() => {
  const D = /*I18N_DICT*/{};
  const RX = (/*I18N_RX*/[]).map(([a, b]) => [new RegExp("^" + a + "$"), b]);
  const get = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const lang = get("praxis-lang") === "en" ? "en" : "el";
  window.__lang = lang;
  window.__i18n = {
    settingsHTML: () => `<div class="card" data-notr><h3>Γλώσσα · Language</h3><div class="row"><button class="btn ${lang === "el" ? "" : "ghost"} sm" data-lang="el">Ελληνικά</button><button class="btn ${lang === "en" ? "" : "ghost"} sm" data-lang="en">English</button></div></div>`
  };
  document.addEventListener("click", (e) => {
    const b = e.target.closest && e.target.closest("[data-lang]"); if (!b) return;
    try { localStorage.setItem("praxis-lang", b.dataset.lang); } catch (_) {}
    location.reload();
  });
  if (lang !== "el") return;
  document.documentElement.lang = "el";
  const miss = (window.__i18nMiss = new Set());
  const NUM = /\d+(?:[.,:]\d+)*/g;
  const look = (core) => {
    if (D[core] !== undefined) return D[core];
    const nums = [];
    const key = core.replace(NUM, (x) => (nums.push(x), "#"));
    if (nums.length && D[key] !== undefined) { let i = 0; return D[key].replace(/#/g, () => (i < nums.length ? nums[i++] : "")); }
    for (const [re, rep] of RX) if (re.test(core)) return core.replace(re, rep);
    return undefined;
  };
  const look2 = (core) => {
    let out = look(core);
    if (out === undefined && core.includes("Gemini")) { out = look(core.replace(/Gemini/g, "Claude")); if (out !== undefined) out = out.replace(/Claude/g, "Gemini"); }
    return out;
  };
  function tr(s) {
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s), core = m[2];
    if (!core || !/[A-Za-z]{2}/.test(core)) return null;
    let out = look2(core);
    if (out === undefined && core.includes("·")) { // "A · B · C": translate each part
      let hit = false;
      const parts = core.split(/(\s*·\s*)/).map((p, i) => { if (i % 2 || !/[A-Za-z]{2}/.test(p)) return p; const t = look2(p); if (t === undefined) { if (miss.size < 5000) miss.add(p); return p; } hit = true; return t; });
      if (hit) out = parts.join(""); else return null;
    }
    if (out === undefined) { if (miss.size < 5000) miss.add(core); return null; }
    return m[1] + out + m[3];
  }
  const SKIP = "textarea,script,style,[contenteditable],[data-notr],code,pre";
  const ATTRS = ["placeholder", "aria-label", "title"];
  function text(n) { const p = n.parentElement; if (!p || p.closest(SKIP)) return; const t = tr(n.nodeValue); if (t !== null && t !== n.nodeValue) n.nodeValue = t; }
  function attrs(el) { if (el.closest("[data-notr]")) return; for (const a of ATTRS) { const v = el.getAttribute(a); if (v) { const t = tr(v); if (t !== null && t !== v) el.setAttribute(a, t); } } }
  function walk(root) {
    if (root.nodeType === 3) return text(root);
    if (root.nodeType !== 1) return;
    attrs(root);
    for (const el of root.querySelectorAll("[placeholder],[aria-label],[title]")) attrs(el);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) text(n);
  }
  walk(document.body);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === "characterData") text(m.target);
      else if (m.type === "attributes") attrs(m.target);
      else for (const n of m.addedNodes) walk(n);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
})();
