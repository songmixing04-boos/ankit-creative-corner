import { createFileRoute } from "@tanstack/react-router";
import { proxyRequest } from "@/lib/site-proxy.server";

function pathOf(request: Request) {
  const url = new URL(request.url);
  return url.pathname + url.search;
}

export const Route = createFileRoute("/$")({
  server: {
    handlers: {
      GET: ({ request }) => proxyRequest(request, pathOf(request)),
      POST: ({ request }) => proxyRequest(request, pathOf(request)),
    },
  },
});
