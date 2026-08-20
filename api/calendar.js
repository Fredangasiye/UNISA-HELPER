export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const raw = String(req.query.url || "").trim();
  if (!raw) return res.status(400).json({ error: "Missing UNISA calendar URL." });

  let u;
  try { u = new URL(raw); } catch { return res.status(400).json({ error: "Invalid calendar URL." }); }
  const allowedHosts = new Set(["mymodules.dtls.unisa.ac.za", "www.mymodules.dtls.unisa.ac.za"]);
  if (u.protocol !== "https:") return res.status(403).json({ error: "Only HTTPS calendar URLs are allowed." });
  if (!allowedHosts.has(u.hostname)) return res.status(403).json({ error: "Only official UNISA myModules calendar URLs are allowed." });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const upstream = await fetch(u.toString(), {
      headers: { "Accept": "text/calendar, text/plain;q=0.9, */*;q=0.1", "User-Agent": "UNISA-Helper/1.0" },
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store"
    });
    clearTimeout(timeout);
    const body = await upstream.text();
    if (!upstream.ok) return res.status(502).json({ error: `UNISA returned HTTP ${upstream.status}. ${body.slice(0,180)}` });
    if (!/BEGIN:VCALENDAR/i.test(body)) return res.status(502).json({ error: "UNISA did not return a calendar feed. The URL may have expired or changed." });
    res.setHeader("Cache-Control", "no-store, private");
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.status(200).send(body);
  } catch (err) {
    return res.status(502).json({ error: "Could not reach the UNISA calendar. Please try again." });
  }
}
