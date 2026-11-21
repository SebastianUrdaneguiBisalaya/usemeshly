import { z } from "zod";

/** A token endpoint response, re-checked after oauth4webapi has validated it. */
export const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().nonnegative().optional(),
  id_token: z.string().min(1).optional(),
  refresh_token: z.string().min(1).optional(),
  scope: z.string().optional(),
  token_type: z.string().min(1),
});

export const idTokenClaimsSchema = z.object({
  aud: z.union([
    z.string(),
    z.array(z.string()),
  ]),
  email: z.string().optional(),
  email_verified: z.boolean().optional(),
  exp: z.number(),
  iat: z.number(),
  iss: z.string().min(1),
  name: z.string().optional(),
  picture: z.string().optional(),
  sub: z.string().min(1),
});
