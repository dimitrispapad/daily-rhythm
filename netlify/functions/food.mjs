// Nutrient values per 100 g from USDA FoodData Central (fdc.nal.usda.gov), the reference database.
// POST /api/food { queries: ["egg, whole, boiled", ...] } -> { foods: [{ q, match: { id, name, type, kcal, p, c, f } | null, error? }] }
// FDC_API_KEY is a free key from fdc.nal.usda.gov/api-key-signup. Without it the shared DEMO_KEY is used (about 30 lookups an hour).
import { guard, json } from "../lib/auth.mjs";

export const config = { path: "/api/food" };
const BASE = process.env.FDC_API_BASE || "https://api.nal.usda.gov/fdc/v1";
const TYPES = "Foundation,SR Legacy,Survey (FNDDS)"; // lab-analysed foods and foods as eaten; no brand labels
const memo = new Map();

const pick = (food) => {
  const by = {}; for (const n of food.foodNutrients || []) if (n && n.value != null && by[n.nutrientId] == null) by[n.nutrientId] = +n.value;
  const p = by[1003], f = by[1004], c = by[1005];
  let kcal = by[1008] != null ? by[1008] : by[2047] != null ? by[2047] : by[2048];
  if (kcal == null && (p != null || f != null || c != null)) kcal = 4 * (p || 0) + 4 * (c || 0) + 9 * (f || 0);
  if (kcal == null) return null;
  const r1 = (x) => Math.round((x || 0) * 10) / 10;
  return { id: food.fdcId, name: String(food.description || "").slice(0, 120), type: food.dataType, kcal: Math.round(kcal), p: r1(p), c: r1(c), f: r1(f) };
};

async function lookup(q, key) {
  if (memo.has(q)) return { q, match: memo.get(q) };
  let r;
  try { r = await fetch(`${BASE}/foods/search?api_key=${encodeURIComponent(key)}&query=${encodeURIComponent(q)}&dataType=${encodeURIComponent(TYPES)}&pageSize=6`); }
  catch (_) { return { q, match: null, error: "upstream_error" }; }
  if (r.status === 429) return { q, match: null, error: "rate_limited" };
  if (r.status === 403) return { q, match: null, error: "bad_key" };
  if (!r.ok) return { q, match: null, error: "upstream_error" };
  const data = await r.json().catch(() => null);
  let match = null;
  for (const food of (data && data.foods) || []) { match = pick(food); if (match) break; }
  if (memo.size > 500) memo.clear();
  memo.set(q, match);
  return { q, match };
}

export default async (req) => {
  const bad = await guard(req);
  if (bad) return bad;
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  let body;
  try { body = JSON.parse(await req.text()); } catch (_) { return json({ error: "bad_request" }, 400); }
  const qs = Array.isArray(body.queries) ? [...new Set(body.queries.map((q) => String(q || "").trim().toLowerCase().slice(0, 80)).filter(Boolean))].slice(0, 15) : [];
  if (!qs.length) return json({ error: "bad_request" }, 400);
  const key = process.env.FDC_API_KEY || "DEMO_KEY";
  const foods = await Promise.all(qs.map((q) => lookup(q, key)));
  return json({ foods, ownKey: !!process.env.FDC_API_KEY });
};
