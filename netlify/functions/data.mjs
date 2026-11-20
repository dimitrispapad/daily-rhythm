// PraxisAI sync. All records live in one private Netlify Blobs entry:
//   { rev, docs: { "items/abc": { b: {...}, r: 12 } | { d: 1, r: 13 } } }
// GET  /api/data            -> every record
// GET  /api/data?since=12   -> only what changed after revision 12 (null = deleted)
// POST /api/data {ops:[{k, b} | {k, d:true}]} -> applies the writes, returns the new revision
import { getStore } from "@netlify/blobs";
import { guard, json } from "../lib/auth.mjs";

export const config = { path: "/api/data" };
const KEY = /^(items|boards|threads|meta|nutri)\/[A-Za-z0-9_.~:@+-]{1,200}$/;
const MAX_BODY = 3 * 1024 * 1024;

export default async (req) => {
  const bad = await guard(req);
  if (bad) return bad;
  const store = getStore({ name: "praxis", consistency: "strong" });
  const read = async () => {
    const cur = await store.getWithMetadata("db", { type: "json" });
    return { db: (cur && cur.data) || { rev: 0, docs: {} }, etag: cur ? cur.etag : null, exists: !!cur };
  };

  if (req.method === "GET") {
    const { db } = await read();
    const since = Number(new URL(req.url).searchParams.get("since"));
    const out = {};
    for (const [k, v] of Object.entries(db.docs)) {
      if (since > 0) { if (v.r > since) out[k] = v.d ? null : v.b; }
      else if (!v.d) out[k] = v.b;
    }
    return json({ rev: db.rev, full: !(since > 0), docs: out });
  }

  if (req.method === "POST") {
    const text = await req.text();
    if (text.length > MAX_BODY) return json({ error: "too_large" }, 413);
    let ops;
    try { ops = JSON.parse(text).ops; } catch (_) { return json({ error: "bad_request" }, 400); }
    if (!Array.isArray(ops) || !ops.length || ops.length > 500) return json({ error: "bad_request" }, 400);
    for (const o of ops) {
      if (!o || !KEY.test(o.k) || (!o.d && (typeof o.b !== "object" || o.b === null || Array.isArray(o.b)))) return json({ error: "bad_request" }, 400);
    }
    for (let attempt = 0; attempt < 6; attempt++) {
      const { db, etag, exists } = await read();
      db.rev = (db.rev || 0) + 1;
      for (const o of ops) db.docs[o.k] = o.d ? { d: 1, r: db.rev } : { b: o.b, r: db.rev };
      const res = await store.setJSON("db", db, exists ? (etag ? { onlyIfMatch: etag } : {}) : { onlyIfNew: true });
      if (!res || res.modified !== false) return json({ rev: db.rev });
      await new Promise((r) => setTimeout(r, 40 + Math.random() * 120)); // another device wrote first: retry on the fresh copy
    }
    return json({ error: "busy" }, 503);
  }
  return json({ error: "method_not_allowed" }, 405);
};
