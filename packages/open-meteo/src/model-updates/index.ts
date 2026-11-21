import { z } from "zod";
import { meteoError } from "../errors";
import type { Http } from "../http";
import { parseWith } from "../http";
import type {
  ModelMetadata,
  ModelUpdatesApi,
  ModelUpdatesResource,
} from "./types";

const APIS: readonly ModelUpdatesApi[] = [
  "forecast",
  "historical-forecast",
  "previous-runs",
  "single-runs",
  "archive",
  "air-quality",
  "marine",
  "ensemble",
  "climate",
  "flood",
  "seasonal",
  "satellite",
];

const MODEL = /^[a-z0-9_]{1,100}$/;

const metadataSchema: z.ZodType<ModelMetadata> = z.object({
  data_end_time: z.number().optional(),
  last_run_availability_time: z.number(),
  last_run_initialisation_time: z.number(),
  last_run_modification_time: z.number(),
  temporal_resolution_seconds: z.number(),
  update_interval_seconds: z.number(),
});

/** `api` → `api.open-meteo.com`, anything else → `<api>-api.open-meteo.com`, as the docs build it. */
const hostPrefix = (api: ModelUpdatesApi): string =>
  api === "forecast" ? "api" : `${api}-api`;

export const createModelUpdates = (http: Http): ModelUpdatesResource => ({
  get: async (model, options = {}) => {
    if (typeof model !== "string" || !MODEL.test(model)) {
      throw meteoError(
        "invalid_argument",
        "model must be a data directory name such as dwd_icon (lower case, digits and _)",
      );
    }
    const api = options.api ?? "forecast";
    if (!APIS.includes(api)) {
      throw meteoError(
        "invalid_argument",
        `api must be one of ${APIS.join(", ")}`,
      );
    }
    const prefix = hostPrefix(api);
    return parseWith(
      metadataSchema,
      await http.get(
        {
          commercial: `https://customer-${prefix}.open-meteo.com`,
          free: `https://${prefix}.open-meteo.com`,
          path: `/data/${model}/static/meta.json`,
        },
        {},
        options,
      ),
    );
  },
});
