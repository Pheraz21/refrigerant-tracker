export async function POST(req: Request) {
  const { address, postcode } = await req.json();
  const key = process.env.OS_PLACES_API_KEY;

  if (!key) {
    return Response.json({ uprn: null, error: "API key not configured" }, { status: 200 });
  }

  const query = encodeURIComponent(`${address} ${postcode}`);
  const url = `https://api.os.uk/search/places/v1/find?query=${query}&dataset=DPA&maxresults=1&key=${key}`;

  try {
    const res = await fetch(url);
    const json = await res.json();
    const uprn = json.results?.[0]?.DPA?.UPRN ?? null;
    return Response.json({ uprn });
  } catch {
    return Response.json({ uprn: null, error: "Lookup failed" }, { status: 200 });
  }
}
