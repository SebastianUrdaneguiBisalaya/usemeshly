import type { MeshlyError } from "@usemeshly/auth";
import type { NagerDateErrorCode } from "./errors";
import { nagerError } from "./errors";

const COUNTRY_CODE = /^[A-Za-z]{2}$/;
/** ISO 3166-1 alpha-2 (`AT`) or ISO 3166-2 subdivision (`AT-1`, `US-CA`, `GB-ENG`). */
const ISO_CODE = /^[A-Za-z]{2}(-[A-Za-z0-9]{1,3})?$/;

// Messages never echo the value: it may come from user input.
const invalid = (message: string): MeshlyError<NagerDateErrorCode> =>
  nagerError("invalid_argument", message);

export const assertCountryCode = (value: unknown): void => {
  if (typeof value !== "string" || !COUNTRY_CODE.test(value)) {
    throw invalid(
      'countryCode must be an ISO 3166-1 alpha-2 code, e.g. "US" or "DE"',
    );
  }
};

export const assertIsoCode = (value: unknown): void => {
  if (typeof value !== "string" || !ISO_CODE.test(value)) {
    throw invalid(
      'isoCode must be an ISO 3166-1 alpha-2 code ("AT") or an ISO 3166-2 subdivision code ("AT-1")',
    );
  }
};

export const assertIntegerInRange = (
  name: string,
  value: unknown,
  min: number,
  max: number,
): void => {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw invalid(`${name} must be an integer from ${min} to ${max}`);
  }
};

export const assertYear = (value: unknown): void =>
  assertIntegerInRange("year", value, 1, 9999);
