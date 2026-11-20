// Tells the app what this site can do. Holds no secrets.
import { json } from "../lib/auth.mjs";
export const config = { path: "/api/status" };
export default async () =>
  json({ app: "praxis", sync: (process.env.APP_PASSCODE || "").length >= 8, ai: !!process.env.GEMINI_API_KEY });
