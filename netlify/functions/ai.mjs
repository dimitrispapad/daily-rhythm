// PraxisAI's AI calls go through here so the Gemini key stays on the server.
// POST /api/ai { contents: [{role, parts:[{text}]}], json: bool } -> { text }
import { guard, json } from "../lib/auth.mjs";

export const config = { path: "/api/ai" };
const BASE = process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com";
// Tried in order; a model Google has retired (404) or refuses for this key (403) is skipped.
// The light models come first: they answer in a few seconds. The bigger ones think first and can run past Netlify's time limit (the 504).
const MODELS = [...new Set([process.env.GEMINI_MODEL, "gemini-flash-lite-latest", "gemini-2.5-flash-lite", "gemini-flash-latest", "gemini-2.5-flash"].filter(Boolean))];
const TRY_MS = +process.env.AI_TRY_MS || 11000, TOTAL_MS = +process.env.AI_TOTAL_MS || 23000; // Netlify stops a function at about 30 s

export default async (req) => {
  const bad = await guard(req);
  if (bad) return bad;
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json({ error: "no_key" }, 503);
  const text = await req.text();
  if (text.length > 300000) return json({ error: "prompt_too_large" }, 413);
  let body;
  try { body = JSON.parse(text); } catch (_) { return json({ error: "bad_request" }, 400); }
  if (!Array.isArray(body.contents) || !body.contents.length) return json({ error: "bad_request" }, 400);
  const payload = { contents: body.contents, generationConfig: { temperature: 0.4, responseMimeType: body.json ? "application/json" : "text/plain" } };

  let last = 502, denied = "", slow = "";
  const t0 = Date.now();
  for (const model of MODELS) {
    const left = TOTAL_MS - (Date.now() - t0);
    if (left < 2500) break;
    let r, data;
    try {
      r = await fetch(`${BASE}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(payload), signal: AbortSignal.timeout(Math.min(TRY_MS, left))
      });
      if (r.ok) data = await r.json(); // the answer body is read inside the same time limit
    } catch (e) {
      if (e && (e.name === "TimeoutError" || e.name === "AbortError")) { slow = model; continue; } // too slow: try the next model
      return json({ error: "upstream_error" }, 502);
    }
    if (r.status === 404) { last = 404; continue; }
    // what Google said, without the key, so a failed setup can be diagnosed from the app
    const why = async () => { const t = await r.text().catch(() => ""); let m = t; try { m = JSON.parse(t).error.message; } catch (_) {} return `Google ${r.status} (${model}): ${String(m).slice(0, 220)}`; };
    if (r.status === 429) return json({ error: "rate_limited", detail: await why() }, 429);
    if (r.status === 403) { denied = await why(); continue; } // sometimes one model is refused and another is allowed
    if (r.status === 400 || r.status === 401) {
      const d = await why();
      return json({ error: /api key|API_KEY|permission/i.test(d) ? "no_key" : "upstream_error", detail: d }, 502);
    }
    if (!r.ok) return json({ error: "upstream_error", detail: await why() }, 502);
    const cand = (data.candidates || [])[0];
    const out = cand && cand.content && Array.isArray(cand.content.parts) ? cand.content.parts.map((p) => p.text || "").join("") : "";
    if (!out) return json({ error: data.promptFeedback && data.promptFeedback.blockReason ? "refused" : "empty_completion" }, 502);
    return json({ text: out, model });
  }
  if (slow && !denied) return json({ error: "too_slow", detail: `Gemini took too long to answer (${slow}). Try again; if it keeps happening, set GEMINI_MODEL to gemini-flash-lite-latest in Netlify.` }, 504);
  // 403 on every model: Google refuses this key or its project. Only a different key fixes that.
  if (denied) return json({ error: "no_key", detail: denied + " Google refuses this key for every model. Make a new key in a NEW project at aistudio.google.com/apikey, put it in GEMINI_API_KEY and redeploy." }, 502);
  return json({ error: "upstream_error", detail: "None of these models answered: " + MODELS.join(", ") + ". Set GEMINI_MODEL to a model your key can use." }, 502);
};
