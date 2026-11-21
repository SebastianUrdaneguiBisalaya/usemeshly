import { z } from "zod";
import type {
  CommunityCountry,
  CountryInfo,
  CountryInfoWithBorders,
  ProCountry,
} from "./types";

// From the OpenAPI specs in ../../openapi. Unknown fields are stripped, so the types only promise what was checked.

/** `CountryInfoDto`. */
export const countryInfoSchema: z.ZodType<CountryInfo> = z.object({
  commonName: z.string(),
  countryCode: z.string(),
  nativeName: z.string(),
  officialName: z.string(),
  region: z.string(),
});

/** `CountryInfoWithBordersDto`, identical in Community v4 and Pro v1. */
export const countryInfoWithBordersSchema: z.ZodType<CountryInfoWithBorders> =
  z.object({
    borders: z.array(countryInfoSchema).nullish(),
    commonName: z.string(),
    countryCode: z.string(),
    nativeName: z.string(),
    officialName: z.string(),
    region: z.string(),
  });

/** Community v4 `CountryV4Dto`. */
export const communityCountrySchema: z.ZodType<CommunityCountry> = z.object({
  countryCode: z.string(),
  name: z.string(),
});

/** Pro v1 `CountryV1Dto`. */
export const proCountrySchema: z.ZodType<ProCountry> = z.object({
  commonName: z.string(),
  countryCode: z.string(),
  nativeName: z.string(),
  officialName: z.string(),
  region: z.string(),
  subRegion: z.string(),
});
