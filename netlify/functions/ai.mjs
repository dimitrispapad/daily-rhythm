// PraxisAI's AI calls go through here so the Gemini key stays on the server.
// POST /api/ai { contents: [{role, parts:[{text}]}], json: bool } -> { text }
import { guard, json } from "../lib/auth.mjs";

export const config = { path: "/api/ai" };
const BASE = process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com";
// Tried in order; a model Google has retired (404) or refuses for this key (403) is skipped.
const MODELS = [process.env.GEMINI_MODEL, "gemini-flash-latest", "gemini-3.6-flash", "gemini-2.5-flash"].filter(Boolean);

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

  let last = 502, denied = "";
  for (const model of MODELS) {
    let r;
    try {
      r = await fetch(`${BASE}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(payload)
      });
    } catch (_) { return json({ error: "upstream_error" }, 502); }
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
    const data = await r.json();
    const cand = (data.candidates || [])[0];
    const out = cand && cand.content && Array.isArray(cand.content.parts) ? cand.content.parts.map((p) => p.text || "").join("") : "";
    if (!out) return json({ error: data.promptFeedback && data.promptFeedback.blockReason ? "refused" : "empty_completion" }, 502);
    return json({ text: out, model });
  }
  // 403 on every model: Google refuses this key or its project. Only a different key fixes that.
  if (denied) return json({ error: "no_key", detail: denied + " Google refuses this key for every model. Make a new key in a NEW project at aistudio.google.com/apikey, put it in GEMINI_API_KEY and redeploy." }, 502);
  return json({ error: "upstream_error", detail: "None of these models answered: " + MODELS.join(", ") + ". Set GEMINI_MODEL to a model your key can use." }, 502);
};
