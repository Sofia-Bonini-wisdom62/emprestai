import {
  createHash,
  generateKeyPairSync,
  type KeyObject,
  randomBytes,
  randomUUID,
  sign,
} from "node:crypto";

// Chaves da pilha do E2E, novas a cada rodada e descartadas com ela. O algoritmo é o do script
// oficial add-new-auth-keys.sh, que gera as do dev (ADR-006, seção 4): par ES256 em JWK, a chave
// HS256 junto, JWTs internos de anon e service_role e as chaves opacas sb_ com checksum.
export type AuthKeys = {
  jwtSecret: string;
  // JSON do GOTRUE_JWT_KEYS: a chave EC com a parte privada, mais a HS256.
  jwtKeys: string;
  kid: string;
  publishableKey: string;
  secretKey: string;
  anonJwt: string;
  serviceRoleJwt: string;
};

// O mesmo ref do script oficial, que entra só no checksum das chaves opacas.
const PROJECT_REF = "supabase-self-hosted";
const ONE_DAY_SECONDS = 24 * 3600;

export function generateAuthKeys(): AuthKeys {
  const jwtSecret = randomBytes(32).toString("hex");
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const jwk = privateKey.export({ format: "jwk" });
  const kid = randomUUID();

  const jwtKeys = JSON.stringify([
    {
      kty: "EC",
      kid,
      use: "sig",
      key_ops: ["sign", "verify"],
      alg: "ES256",
      ext: true,
      crv: jwk.crv,
      x: jwk.x,
      y: jwk.y,
      d: jwk.d,
    },
    { kty: "oct", k: Buffer.from(jwtSecret).toString("base64url"), alg: "HS256" },
  ]);

  // A pilha vive minutos; um dia de validade sobra, ao contrário dos cinco anos do script oficial.
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ONE_DAY_SECONDS;

  return {
    jwtSecret,
    jwtKeys,
    kid,
    publishableKey: opaqueKey("sb_publishable_"),
    secretKey: opaqueKey("sb_secret_"),
    anonJwt: signEs256(privateKey, kid, { role: "anon", iss: "supabase", iat, exp }),
    serviceRoleJwt: signEs256(privateKey, kid, { role: "service_role", iss: "supabase", iat, exp }),
  };
}

function signEs256(privateKey: KeyObject, kid: string, payload: Record<string, unknown>) {
  const header = Buffer.from(JSON.stringify({ alg: "ES256", typ: "JWT", kid })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const data = `${header}.${body}`;
  const signature = sign("SHA256", Buffer.from(data), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  }).toString("base64url");

  return `${data}.${signature}`;
}

function opaqueKey(prefix: string) {
  const intermediate = prefix + randomBytes(17).toString("base64url").slice(0, 22);
  const checksum = createHash("sha256")
    .update(`${PROJECT_REF}|${intermediate}`)
    .digest("base64url")
    .slice(0, 8);

  return `${intermediate}_${checksum}`;
}
