import { isMeshlyError } from "@usemeshly/auth";
import { describe, expect, it } from "vitest";
import {
  API_KEY,
  calledUrl,
  commercial,
  free,
  json,
  mockFetch,
  rejection,
} from "../helpers";

const meta = {
  chunk_time_length: 253,
  data_end_time: 1795914000,
  last_run_availability_time: 1795276785,
  last_run_initialisation_time: 1795262400,
  last_run_modification_time: 1795276785,
  temporal_resolution_seconds: 3600,
  update_interval_seconds: 21600,
};

describe("modelUpdates.get", () => {
  it("reads the model's metadata from the forecast server", async () => {
    const fetch = mockFetch(() => json(meta));

    const { chunk_time_length: _dropped, ...documented } = meta;
    await expect(free(fetch).modelUpdates.get("dwd_icon")).resolves.toEqual(
      documented,
    );
    expect(calledUrl(fetch).toString()).toBe(
      "https://api.open-meteo.com/data/dwd_icon/static/meta.json",
    );
  });

  it("uses the server of the given API and the customer- host", async () => {
    const fetch = mockFetch(() => json(meta));

    await commercial(fetch).modelUpdates.get("ecmwf_ifs025_ensemble", {
      api: "ensemble",
    });

    const url = calledUrl(fetch);
    expect(url.origin).toBe("https://customer-ensemble-api.open-meteo.com");
    expect(url.pathname).toBe("/data/ecmwf_ifs025_ensemble/static/meta.json");
    expect(url.searchParams.get("apikey")).toBe(API_KEY);
  });

  it.each([
    "../secrets",
    "DWD ICON",
    "",
  ])("rejects the model %j before any request", async (model) => {
    const fetch = mockFetch(() => json(meta));

    const error = await rejection(free(fetch).modelUpdates.get(model));

    expect(isMeshlyError(error, "invalid_argument")).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects an unknown api", async () => {
    const error = await rejection(
      free(mockFetch(() => json(meta))).modelUpdates.get("dwd_icon", {
        api: "weather" as never,
      }),
    );

    expect(isMeshlyError(error, "invalid_argument")).toBe(true);
  });
});
