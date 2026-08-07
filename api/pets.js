let tokenCache = { accessToken: null, expiresAt: 0 };
const PETFINDER_TOKEN_URL = "https://api.petfinder.com/v2/oauth2/token";
const PETFINDER_ANIMALS_URL = "https://api.petfinder.com/v2/animals";

export default async function handler(req, res) {
  if (req.method !== "GET") { res.setHeader("Allow", "GET"); return res.status(405).json({ error: "Method not allowed." }); }
  const apiKey = process.env.PETFINDER_API_KEY;
  const apiSecret = process.env.PETFINDER_API_SECRET;
  if (!apiKey || !apiSecret) return res.status(503).json({ error: "Petfinder API credentials are not configured.", message: "Add PETFINDER_API_KEY and PETFINDER_API_SECRET in your Vercel project's Environment Variables, then redeploy." });
  const location = clean(req.query.location, 100);
  const type = clean(req.query.type, 60);
  const distance = clampInt(req.query.distance, 1, 500, 25);
  const page = clampInt(req.query.page, 1, 100, 1);
  if (!location) return res.status(400).json({ error: "A location is required." });
  const allowedTypes = new Set(["Dog","Cat","Rabbit","Small & Furry","Horse","Bird","Scales, Fins & Other","Barnyard"]);
  if (!allowedTypes.has(type)) return res.status(400).json({ error: "Unsupported pet type." });
  try {
    const token = await getAccessToken(apiKey, apiSecret);
    const params = new URLSearchParams({ status: "adoptable", location, distance: String(distance), type, page: String(page), limit: "24", sort: "distance" });
    const upstream = await fetch(`${PETFINDER_ANIMALS_URL}?${params.toString()}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    const body = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const detail = body?.invalid_params?.[0]?.message || body?.detail || body?.title || "Petfinder could not complete that search.";
      return res.status(upstream.status === 429 ? 429 : 502).json({ error: "Petfinder search failed.", message: detail });
    }
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json(body);
  } catch (error) {
    console.error("Buddy Finder API error", error);
    return res.status(500).json({ error: "Could not load adoption listings.", message: "Please try again in a moment." });
  }
}

async function getAccessToken(apiKey, apiSecret) {
  const now = Date.now();
  if (tokenCache.accessToken && now < tokenCache.expiresAt) return tokenCache.accessToken;
  const body = new URLSearchParams({ grant_type: "client_credentials", client_id: apiKey, client_secret: apiSecret });
  const response = await fetch(PETFINDER_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body: body.toString() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error("Petfinder authentication failed.");
  const expiresInMs = Math.max(60, Number(data.expires_in) || 3600) * 1000;
  tokenCache = { accessToken: data.access_token, expiresAt: now + expiresInMs - 60000 };
  return tokenCache.accessToken;
}
function clean(value, maxLength) { if (Array.isArray(value)) value = value[0]; if (typeof value !== "string") return ""; return value.trim().slice(0, maxLength); }
function clampInt(value, min, max, fallback) { const parsed = Number.parseInt(Array.isArray(value) ? value[0] : value, 10); if (!Number.isFinite(parsed)) return fallback; return Math.min(max, Math.max(min, parsed)); }
