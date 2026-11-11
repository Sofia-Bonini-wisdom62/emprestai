import type { NextRequest } from "next/server";

import { authConfigFromEnv } from "@/server/auth-client";
import { handleSession } from "@/server/session-proxy";

export function proxy(request: NextRequest) {
  return handleSession(request, authConfigFromEnv());
}

// Toda rota, menos os estáticos (spec 001, contrato do proxy.ts).
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
