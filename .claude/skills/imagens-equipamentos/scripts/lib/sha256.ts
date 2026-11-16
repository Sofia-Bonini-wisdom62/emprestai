import { createHash } from "node:crypto";

// O SHA-256 em hexadecimal minúsculo, como o manifesto guarda (RN-17).
export const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
