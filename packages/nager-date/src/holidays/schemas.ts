import { z } from "zod";
import type { CommunityHoliday, ProHoliday } from "./types";

// From Nager.Date's OpenAPI specs (Community v4, Pro v1). Unknown fields are stripped, so the types only promise what
// was checked.

/** `HolidayTypes`. */
export const holidayTypeSchema = z.enum([
  "Public",
  "Bank",
  "School",
  "Authorities",
  "Optional",
  "Observance",
]);

/** Community v4 `PublicHolidayV4Dto`. */
export const communityHolidaySchema: z.ZodType<CommunityHoliday> = z.object({
  countryCode: z.string(),
  date: z.iso.date(),
  holidayTypes: z.array(holidayTypeSchema),
  name: z.string(),
  nationalHoliday: z.boolean().optional(),
  subdivisionCodes: z.array(z.string()).nullish(),
});

/** Pro v1 `HolidayV1Dto`. */
export const proHolidaySchema: z.ZodType<ProHoliday> = z.object({
  countryCode: z.string(),
  date: z.iso.date(),
  englishName: z.string(),
  holidayTypes: z.array(holidayTypeSchema),
  id: z.string(),
  localName: z.string(),
  nationalHoliday: z.boolean().optional(),
  observedDate: z.iso.date(),
  subdivisionCodes: z.array(z.string()).nullish(),
});
