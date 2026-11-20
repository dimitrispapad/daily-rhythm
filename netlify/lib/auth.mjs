// Shared by the PraxisAI functions: every data and AI request must carry the passcode.
import { createHash, timingSafeEqual } from "node:crypto";

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

const digest = (s) => createHash("sha256").update(String(s)).digest();

// Returns null when the request may proceed, otherwise the Response to send back.
export async function guard(req) {
  const want = process.env.APP_PASSCODE || "";
  if (want.length < 8) return json({ error: "not_configured" }, 503);
  const got = req.headers.get("x-praxis-key") || "";
  if (!timingSafeEqual(digest(got), digest(want))) {
    await new Promise((r) => setTimeout(r, 600)); // slows down guessing
    return json({ error: "unauthorized" }, 401);
  }
  return null;
}
