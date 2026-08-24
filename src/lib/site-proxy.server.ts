const ORIGIN = "https://www.study-mate.in";

const TELEGRAM_URL = "https://t.me/+oStLl-wO2dMyZmM1";
const WHATSAPP_URL =
  "https://whatsapp.com/channel/0029VbDCEcsGehEQt6q1lu36";

const BRAND = "KGS x Ankit Chaudhary";

const LOGO_URL = "/ankit-logo.png";

/** Tokens that must never be touched by the text rewriting (asset paths, api urls). */
const PROTECTED = /(https?:\/\/[^\s"'<>)]+|[\w./-]+\.(?:jpg|jpeg|png|webp|gif|svg|ico|json|html|css|js|mp4|m3u8))/gi;

function rewriteUrls(text: string): string {
  return text
    // brand logo -> ours
    .replace(/https?:\/\/i\.postimg\.cc\/x1M0YN5Z\/sunny\.jpg/gi, LOGO_URL)
    // social links -> ours
    .replace(/https?:\/\/(?:www\.)?t\.me\/[^\s"'<>)]*/gi, TELEGRAM_URL)
    .replace(
      /https?:\/\/(?:(?:www|chat|api)\.)?whatsapp\.com\/[^\s"'<>)]*/gi,
      WHATSAPP_URL,
    )
    // hide the original domain
    .replace(/https?:\/\/(?:www\.)?study-mate\.in/gi, "")
    .replace(/study-mate\.in/gi, "");
}

function rewriteText(text: string): string {
  return text
    .replace(/Sunny\s*X\s*Khan\s*Global\s*Studies/gi, BRAND)
    .replace(/Khan\s*Global\s*Studies/gi, BRAND)
    .replace(/Sunny\s*Kgs/gi, BRAND)
    .replace(/\bKGS\b/g, BRAND)
    .replace(/Sunny/g, BRAND)
    .replace(/SUNNY/g, BRAND.toUpperCase())
    .replace(/sunny/g, BRAND.toLowerCase())
    // preview/iframe safe navigation: top-frame nav & new tabs are blocked
    .replace(/window\.top\.location/g, "window.location")
    .replace(/window\.parent\.location/g, "window.location")
    .replace(/target=(["'])_blank\1/g, 'target="_self"')
    .replace(/target=\\?"_blank\\?"/g, 'target="_self"');
}


/** Applies branding rewrites while leaving URLs / file paths intact. */
export function rewriteBody(body: string): string {
  let out = "";
  let last = 0;
  PROTECTED.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PROTECTED.exec(body)) !== null) {
    out += rewriteText(body.slice(last, m.index));
    out += rewriteUrls(m[0]);
    last = m.index + m[0].length;
  }
  out += rewriteText(body.slice(last));
  return out;
}

const HOP_BY_HOP = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "content-security-policy",
  "content-security-policy-report-only",
  "x-frame-options",
  "strict-transport-security",
]);

export async function proxyRequest(
  request: Request,
  pathAndQuery: string,
): Promise<Response> {
  const targetUrl = ORIGIN + (pathAndQuery.startsWith("/") ? "" : "/") + pathAndQuery;

  const headers = new Headers();
  const copy = ["accept", "accept-language", "content-type", "x-requested-with", "range"];
  for (const h of copy) {
    const v = request.headers.get(h);
    if (v) headers.set(h, v);
  }
  headers.set(
    "user-agent",
    request.headers.get("user-agent") ??
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
  );
  headers.set("referer", ORIGIN + "/");

  const init: RequestInit = { method: request.method, headers, redirect: "manual" };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(targetUrl, init);

  // follow redirects internally so the original host never leaks
  if (upstream.status >= 300 && upstream.status < 400) {
    const loc = upstream.headers.get("location");
    if (loc) {
      const abs = new URL(loc, targetUrl);
      const path = abs.hostname.endsWith("study-mate.in")
        ? abs.pathname + abs.search
        : null;
      if (path) return proxyRequest(new Request(request.url, { method: "GET" }), path);
      return Response.redirect(abs.toString(), 302);
    }
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  const outHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) outHeaders.set(key, value);
  });

  const isText =
    contentType.includes("text/html") ||
    contentType.includes("javascript") ||
    contentType.includes("text/css") ||
    contentType.includes("json");

  if (isText) {
    const text = await upstream.text();
    return new Response(rewriteBody(text), {
      status: upstream.status,
      headers: outHeaders,
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: outHeaders,
  });
}
