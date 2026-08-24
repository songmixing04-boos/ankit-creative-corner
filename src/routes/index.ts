import { createFileRoute } from "@tanstack/react-router";
import { proxyRequest } from "@/lib/site-proxy.server";

export const Route = createFileRoute("/")({
  server: {
    handlers: {
      GET: ({ request }) => proxyRequest(request, "/home"),
      POST: ({ request }) => proxyRequest(request, "/home"),
    },
  },
});
