export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const raw = String(req.query.url || "").trim();
  if (!raw) return res.status(400).json({ error: "Missing calendar URL" });

  let u;
  try { u = new URL(raw); } catch { return res.status(400).json({ error: "Invalid URL" }); }

  const allowed = new Set(["mymodules.dtls.unisa.ac.za", "www.mymodules.dtls.unisa.ac.za"]);
  if (!allowed.has(u.hostname) || u.protocol !== "https:") {
    return res.status(403).json({ error: "Only official HTTPS UNISA myModules calendar URLs are allowed." });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const upstream = await fetch(u.toString(), {
      headers: {
        "Accept": "text/calendar,text/plain;q=0.9,*/*;q=0.1",
        "User-Agent": "UNISA-My-Work/1.0"
      },
      redirect: "follow",
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!upstream.ok) {
      return res.status(502).json({ error: `UNISA calendar request failed (${upstream.status}).` });
    }

    const text = await upstream.text();
    if (!/BEGIN:VCALENDAR/i.test(text)) {
      return res.status(502).json({ error: "The URL did not return a valid calendar feed." });
    }

    res.setHeader("Cache-Control", "no-store, private");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    return res.status(200).send(text);
  } catch {
    return res.status(502).json({ error: "Could not reach the UNISA calendar right now." });
  }
}
