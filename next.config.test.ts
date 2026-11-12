import { PHASE_PRODUCTION_SERVER } from "next/constants";
import { expect, it } from "vitest";

import config from "./next.config";

// O E2E confere três destes cabeçalhos na resposta de /login (e2e/csp.e2e.ts); aqui vão os seis,
// com os valores que a pessoa aprovou (RN-62).
it("ca_16 toda resposta leva os seis cabeçalhos fixos do RN-62", async () => {
  const rules = await config(PHASE_PRODUCTION_SERVER).headers?.();

  expect(rules).toEqual([
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        { key: "Strict-Transport-Security", value: "max-age=63072000" },
      ],
    },
  ]);
});
