const MAX_ADDRESS_LENGTH = 300;
const MAX_POSTCODE_LENGTH = 32;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ uprn: null, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ uprn: null, error: "Request body must be a JSON object" }, { status: 400 });
  }

  const { address, postcode } = body as { address?: unknown; postcode?: unknown };

  if (address !== undefined && address !== null && typeof address !== "string") {
    return Response.json({ uprn: null, error: "Invalid address" }, { status: 400 });
  }
  if (postcode !== undefined && postcode !== null && typeof postcode !== "string") {
    return Response.json({ uprn: null, error: "Invalid postcode" }, { status: 400 });
  }

  const trimmedAddress = typeof address === "string" ? address.trim() : "";
  const trimmedPostcode = typeof postcode === "string" ? postcode.trim() : "";

  if (!trimmedAddress && !trimmedPostcode) {
    return Response.json({ uprn: null, error: "Address or postcode is required" }, { status: 400 });
  }
  if (trimmedAddress.length > MAX_ADDRESS_LENGTH || trimmedPostcode.length > MAX_POSTCODE_LENGTH) {
    return Response.json({ uprn: null, error: "Address or postcode exceeds maximum length" }, { status: 400 });
  }

  const key = process.env.OS_PLACES_API_KEY;
  if (!key) {
    return Response.json({ uprn: null, error: "API key not configured" }, { status: 200 });
  }

  const combined = [trimmedAddress, trimmedPostcode].filter(Boolean).join(" ");
  const query = encodeURIComponent(combined);
  const url = `https://api.os.uk/search/places/v1/find?query=${query}&dataset=DPA&maxresults=1&key=${key}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return Response.json({ uprn: null, error: `Upstream lookup failed (${res.status})` }, { status: 502 });
    }
    const json = await res.json();
    const uprn = json.results?.[0]?.DPA?.UPRN ?? null;
    return Response.json({ uprn });
  } catch {
    return Response.json({ uprn: null, error: "Lookup failed" }, { status: 502 });
  }
}
