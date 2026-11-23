// ================= FOOD BASE: USDA values, a small Greek food list, the foods I remember =================
// Calories come from two sources that check each other: the AI reads what I wrote and guesses the portion in grams,
// and USDA FoodData Central (the reference database) gives the values per 100 g. See estimateFood in 4-food.js.
const fkey = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ς/g, "σ").replace(/\s+/g, " ").trim();
const USDA_ON = () => !!(window.__usda && window.__usda.on());

// Used only when the AI is not available. [pattern on accent-free text, USDA search words, grams of one piece or portion, grams of a slice, flags]
// flags: w = weak (ignored when another food is found in the same phrase), l = liquid (a cup or glass is 240 g)
const FOODS = [
  [/ασπραδ/, "egg white, cooked", 33], [/αυγ[οα]/, "egg, whole, boiled", 50],
  [/ψωμι.*ολικ|ολικ.*ψωμι/, "bread, whole-wheat", 30], [/φρυγανι/, "melba toast", 8], [/παξιμαδ/, "rusk toast", 30],
  [/αραβικ|πιτ(α|εσ)( |$)/, "bread, pita, white", 60], [/τορτιγ/, "tortillas, flour", 45], [/ψωμι|ψωμακ/, "bread, wheat", 30],
  [/καστανο ρυζι|ρυζι καστανο/, "rice, brown, cooked", 150], [/ρυζι/, "rice, white, cooked", 150],
  [/μακαρον|ζυμαρικ|σπαγγετι|πεννε/, "pasta, cooked", 180], [/γλυκοπατατ/, "sweet potato, baked", 150], [/πατατ/, "potatoes, boiled", 150],
  [/βρωμη|κουακερ/, "oats, rolled, dry", 40], [/κινοα/, "quinoa, cooked", 150],
  [/κοτοπουλ|στηθοσ/, "chicken breast, roasted, meat only", 150], [/γαλοπουλ/, "turkey breast, roasted", 60, 20],
  [/μοσχαρ|κιμα|μπιφτεκ/, "beef, ground, cooked", 120], [/χοιριν/, "pork loin, cooked", 150], [/σνιτσελ/, "chicken schnitzel, breaded, fried", 150],
  [/σολομ/, "salmon, cooked", 150], [/τονο/, "tuna, canned in water, drained", 100], [/γαριδ/, "shrimp, cooked", 100], [/ψαρι|τσιπουρ|λαβρακ/, "sea bass, cooked", 180],
  [/γιαουρτ/, "yogurt, Greek, plain, lowfat", 200, 0, "l"], [/γαλα( |$)/, "milk, reduced fat 2%", 240, 0, "l"],
  [/cottage|κοτατζ/, "cottage cheese, lowfat 2%", 100], [/ανθοτυρ|μυζηθρ|ρικοτα/, "cheese, ricotta, part skim", 50],
  [/φυστικοβουτυρ/, "peanut butter, smooth", 15], [/ταχιν/, "tahini", 15], [/ελαιολαδ|λαδι( |$)/, "olive oil", 10],
  [/(^| )μελι( |$)/, "honey", 10], [/ζαχαρ/, "sugar, granulated", 5],
  [/μπαναν/, "banana, raw", 120], [/μηλο|μηλα( |$)/, "apple, raw, with skin", 180], [/πορτοκαλ/, "orange, raw", 150], [/μανταριν/, "tangerine, raw", 80],
  [/αχλαδ/, "pear, raw", 170], [/φραουλ/, "strawberries, raw", 150], [/σταφυλ/, "grapes, raw", 100], [/ακτινιδ/, "kiwifruit, raw", 75], [/αβοκαντο/, "avocado, raw", 100],
  [/ντοματιν/, "tomatoes, red, ripe, raw", 100], [/ντοματ|τοματ/, "tomatoes, red, ripe, raw", 120], [/αγγουρ/, "cucumber, raw", 150],
  [/λαχανο/, "cabbage, raw", 80], [/καροτ/, "carrots, raw", 60], [/μαρουλ/, "lettuce, raw", 80], [/μπροκολ/, "broccoli, cooked", 150], [/σπανακ/, "spinach, cooked", 150],
  [/φασολακ/, "green beans, cooked", 200], [/φακ(ε|η)/, "lentils, cooked", 250], [/ρεβ[υι]θ/, "chickpeas, cooked", 200], [/φασολ/, "beans, white, cooked", 200],
  [/αμυγδαλ/, "almonds", 30], [/καρυδ/, "walnuts", 30], [/φ[ιυ]στικ/, "peanuts, roasted", 30], [/ξηρ.*καρπ/, "mixed nuts", 30],
  [/σοκολατ/, "chocolate, dark, 70-85% cacao", 20], [/πρωτειν|whey/, "whey protein powder", 30],
  [/χυμο/, "orange juice", 250, 0, "l"], [/μπ[υι]ρα/, "beer, regular", 330, 0, "l"], [/κρασι/, "wine, table, red", 150, 0, "l"], [/καφε|εσπρεσ|φρεντο/, "coffee, brewed", 240, 0, "l"],
  [/πιτσα/, "pizza, cheese", 220, 110], [/ελι(α|εσ)( |$)/, "olives, ripe", 20],
  [/κασερι|γκουντα|τυρι/, "cheese, gouda", 30, 25, "w"], [/βουτυρ/, "butter", 10, 0, "w"], [/φετα( |$)/, "cheese, feta", 40, 0, "w"], [/σαλατ/, "lettuce, raw", 100, 0, "w"]
];
const NUMW = { μισο: 0.5, μιση: 0.5, μισοσ: 0.5, ενα: 1, μια: 1, ενασ: 1, δυο: 2, τρια: 3, τρεισ: 3, τεσσερα: 4, τεσσερισ: 4, πεντε: 5 };
// "2 αυγά, 1 φέτα ψωμί ολικής και γιαούρτι με μέλι" -> items with grams and a USDA search term. Rough on purpose: I check it before saving.
function parseFoodText(text) {
  const out = [];
  for (const raw of String(text).split(/[,;+\n]| και | με | κι /i)) {
    let t = fkey(raw); if (!t) continue;
    const m = t.match(/(\d+(?:[.,]\d+)?)/);
    let n = m ? parseFloat(m[1].replace(",", ".")) : null;
    if (n == null) for (const w of t.split(" ")) if (NUMW[w] != null) { n = NUMW[w]; break; }
    const inGrams = m && /^ ?(γρ|g( |$)|gr|γραμμ|ml|μλ)/.test(t.slice(m.index + m[0].length));
    const spoon = /(^| )κ\.? ?σ\.?( |$)|κουταλι(α|εσ)( |$)/.test(t) ? 15 : /(^| )κ\.? ?γ\.?( |$)|κουταλακ/.test(t) ? 5 : 0;
    const cup = /φλιτζαν|κουπα|ποτηρ/.test(t), slice = /φετ(α|εσ) \S/.test(t);
    let hits = [], rest = t;
    for (const f of FOODS) { const h = rest.match(f[0]); if (h) { hits.push(f); rest = rest.replace(h[0], " "); } }
    if (hits.length > 1) hits = hits.filter((f) => f[4] !== "w").length ? hits.filter((f) => f[4] !== "w") : hits.slice(0, 1);
    if (!hits.length) { out.push({ name: raw.trim().slice(0, 120), amount: "", grams: 0, en: "", kcal: 0, protein: 0, carbs: 0, fat: 0, src: "none" }); continue; }
    hits.forEach((f, i) => {
      const k = i === 0 && n != null ? n : 1; // the number belongs to the first food of the phrase
      const grams = i === 0 && inGrams ? n : i === 0 && spoon ? k * spoon : i === 0 && cup && f[4] === "l" ? k * 240 : i === 0 && slice && f[3] ? k * f[3] : k * f[2];
      out.push({ name: hits.length > 1 ? f[1].split(",")[0] + " (" + raw.trim().slice(0, 60) + ")" : raw.trim().slice(0, 120), amount: Math.round(grams) + " g", grams, en: f[1], kcal: 0, protein: 0, carbs: 0, fat: 0, src: "none" });
    });
  }
  return out.slice(0, 25);
}

// USDA values for a list of search terms, remembered on this device so the same food is not asked twice.
async function usdaLookup(terms) {
  let cache = {}; try { cache = JSON.parse(lsGet("praxis-usda") || "{}"); } catch (_) {}
  const need = [...new Set(terms.map((q) => String(q || "").trim().toLowerCase()).filter(Boolean))].filter((q) => !cache[q]);
  let err = "";
  if (need.length) {
    const r = await window.__usda(need);
    if (!r) err = "upstream_error";
    else for (const x of r) { if (x.match) cache[x.q] = x.match; else if (x.error) err = x.error; }
    const keys = Object.keys(cache); if (keys.length > 400) for (const k of keys.slice(0, 100)) delete cache[k];
    lsSet("praxis-usda", JSON.stringify(cache));
  }
  return { cache, err };
}
// Put USDA values on the items. When the AI also gave numbers and the two disagree a lot, the USDA match is probably the wrong food, so the AI number stays.
async function applyUSDA(items) {
  const can = items.filter((x) => x.en && x.grams > 0); if (!can.length) return "";
  const { cache, err } = await usdaLookup(can.map((x) => x.en));
  for (const x of can) {
    const u = cache[String(x.en).trim().toLowerCase()]; if (!u) continue;
    const k = x.grams / 100, kcal = u.kcal * k, had = num(x.kcal) > 0;
    if (had && Math.max(kcal, x.kcal) > 40 && (kcal / x.kcal < 0.6 || kcal / x.kcal > 1.6)) continue;
    Object.assign(x, { kcal: Math.round(kcal), protein: Math.round(u.p * k * 10) / 10, carbs: Math.round(u.c * k * 10) / 10, fat: Math.round(u.f * k * 10) / 10, src: "usda", ref: u.name });
  }
  return err;
}

// ---------- the foods I remember ----------
// Every food I logged is remembered by how often I eat it. ★ keeps one at the front, × forgets it. Stored in meta/foods { pins: [entry], hide: [key] }.
const FMEM = () => meta("foods");
function favourites(limit) {
  const M = FMEM(), hide = new Set(M.hide || []), m = new Map();
  for (const [date, doc] of S.nutri) for (const e of doc.log || []) { if (e.src === "plan" || !e.name) continue; const k = fkey(e.name); if (hide.has(k)) continue; const x = m.get(k) || { k, n: 0, last: "", e }; x.n++; if (date >= x.last) { x.last = date; x.e = e; } m.set(k, x); }
  const pins = (M.pins || []).map((e) => { const k = fkey(e.name), x = m.get(k); m.delete(k); return { k, n: x ? x.n : 0, last: x ? x.last : "", e, pin: true }; });
  return pins.concat([...m.values()].sort((a, b) => b.n - a.n || (a.last < b.last ? 1 : -1))).slice(0, limit || 14);
}
const memFind = (text) => favourites(500).find((x) => x.k === fkey(text));
const isPinned = (name) => (FMEM().pins || []).some((e) => fkey(e.name) === fkey(name));
function saveMem(pins, hide) { upsert("meta", "foods", Object.assign({}, FMEM(), { pins: pins.slice(-60), hide: hide.slice(-200) })); }
function quickHTML(date) {
  const fav = favourites(); if (!fav.length) return "";
  const short = (s) => (s.length > 34 ? s.slice(0, 32) + "…" : s);
  return `<div><span class="eyebrow">My foods · tap to add, × to forget</span><div class="chips" style="margin-top:6px">${fav.map((x) => `<span class="favchip"><button class="pill" data-act="quickAdd" data-d="${date}" data-k="${esc(x.k)}">${x.pin ? "★ " : "+ "}${esc(short(x.e.name))} <span class="muted">${r5(x.e.kcal)} kcal</span></button><button class="favx" data-act="favDel" data-k="${esc(x.k)}" aria-label="Forget ${esc(x.e.name)}">×</button></span>`).join("")}</div></div>`;
}
