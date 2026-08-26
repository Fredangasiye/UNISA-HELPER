export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  // Parse the URL directly so the full encoded UNISA calendar URL is preserved.
  const requestUrl = new URL(req.url, `https://${req.headers.host || "localhost"}`);
  const raw = requestUrl.searchParams.get("url");

  if (!raw) return res.status(400).json({ error: "Missing calendar URL." });

  let target;
  try {
    target = new URL(raw);
  } catch {
    return res.status(400).json({ error: "Invalid calendar URL." });
  }

  const allowedHosts = new Set([
    "mymodules.dtls.unisa.ac.za",
    "www.mymodules.dtls.unisa.ac.za"
  ]);

  if (target.protocol !== "https:" || !allowedHosts.has(target.hostname)) {
    return res.status(403).json({
      error: "Only official HTTPS UNISA myModules calendar URLs are allowed."
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const upstream = await fetch(target.toString(), {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        "Accept": "text/calendar, text/plain;q=0.9, */*;q=0.1",
        "User-Agent": "Mozilla/5.0 (compatible; UNISA-My-Work/1.0)",
        "Referer": "https://mymodules.dtls.unisa.ac.za/"
      }
    });

    if (!upstream.ok) {
      return res.status(502).json({
        error: `UNISA returned HTTP ${upstream.status}.`
      });
    }

    const text = await upstream.text();

    if (!/BEGIN:VCALENDAR/i.test(text)) {
      return res.status(502).json({
        error: "UNISA responded, but it was not a calendar feed."
      });
    }

    res.setHeader("Cache-Control", "no-store, private");
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");

    return res.status(200).send(text);
  } catch (err) {
    const message = err?.name === "AbortError"
      ? "UNISA took too long to respond."
      : "The server could not reach UNISA.";

    return res.status(502).json({ error: message });
  } finally {
    clearTimeout(timeout);
  }
}
