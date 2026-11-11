import { createHash, createPublicKey, verify } from "node:crypto";

import { describe, expect, it } from "vitest";

import { generateAuthKeys } from "./auth-keys";

const decode = (part: string) => JSON.parse(Buffer.from(part, "base64url").toString("utf8"));

describe("generateAuthKeys", () => {
  const keys = generateAuthKeys();
  const [ecKey, hsKey] = JSON.parse(keys.jwtKeys);

  it("adr_006 gera as chaves opacas sb_ no formato do script oficial", () => {
    for (const [key, prefix] of [
      [keys.publishableKey, "sb_publishable_"],
      [keys.secretKey, "sb_secret_"],
    ] as const) {
      expect(key).toMatch(new RegExp(`^${prefix}[A-Za-z0-9_-]{22}_[A-Za-z0-9_-]{8}$`));
      const intermediate = key.slice(0, -9);
      const checksum = createHash("sha256")
        .update(`supabase-self-hosted|${intermediate}`)
        .digest("base64url")
        .slice(0, 8);
      expect(key.slice(-8)).toBe(checksum);
    }
  });

  it("adr_006 o JWT_KEYS traz a chave ES256 com a parte privada e a HS256 do segredo", () => {
    expect(ecKey).toMatchObject({ kty: "EC", crv: "P-256", alg: "ES256", kid: keys.kid });
    expect(ecKey.d).toEqual(expect.any(String));
    expect(hsKey).toEqual({
      kty: "oct",
      alg: "HS256",
      k: Buffer.from(keys.jwtSecret).toString("base64url"),
    });
  });

  it("adr_006 os JWTs internos são ES256, com o kid da chave e o papel certo", () => {
    const publicKey = createPublicKey({
      key: { kty: ecKey.kty, crv: ecKey.crv, x: ecKey.x, y: ecKey.y },
      format: "jwk",
    });

    for (const [jwt, role] of [
      [keys.anonJwt, "anon"],
      [keys.serviceRoleJwt, "service_role"],
    ] as const) {
      const [header, payload, signature] = jwt.split(".");
      expect(decode(header)).toEqual({ alg: "ES256", typ: "JWT", kid: keys.kid });
      expect(decode(payload)).toMatchObject({ role, iss: "supabase" });
      expect(
        verify(
          "SHA256",
          Buffer.from(`${header}.${payload}`),
          { key: publicKey, dsaEncoding: "ieee-p1363" },
          Buffer.from(signature, "base64url"),
        ),
      ).toBe(true);
    }
  });

  it("adr_006 cada rodada gera chaves novas", () => {
    const other = generateAuthKeys();

    expect(other.secretKey).not.toBe(keys.secretKey);
    expect(other.kid).not.toBe(keys.kid);
    expect(other.jwtSecret).not.toBe(keys.jwtSecret);
  });
});
