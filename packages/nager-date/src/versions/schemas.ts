import { z } from "zod";
import type { VersionInfo } from "./types";

/** `VersionInfoDto`, identical in Community v4 and Pro v1. */
export const versionInfoSchema: z.ZodType<VersionInfo> = z.object({
  name: z.string(),
  version: z.string(),
});
