import { z } from "zod";

// O link do convite e o da redefinição (RN-35, RN-44): token_hash e type.
export const linkSchema = z.object({
  token_hash: z.string().min(1).max(512),
  type: z.enum(["invite", "recovery"]),
});
