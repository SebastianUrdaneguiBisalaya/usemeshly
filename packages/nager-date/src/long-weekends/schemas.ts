import { z } from "zod";
import type { LongWeekend } from "./types";

/** Pro v1 `LongWeekendV1Dto`. */
export const longWeekendSchema: z.ZodType<LongWeekend> = z.object({
  bridgeDays: z.array(z.iso.date()).optional(),
  dayCount: z.number().int().optional(),
  endDate: z.iso.date().optional(),
  needBridgeDay: z.boolean().optional(),
  startDate: z.iso.date().optional(),
});
