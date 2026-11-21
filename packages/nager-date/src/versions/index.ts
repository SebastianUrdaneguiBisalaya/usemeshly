import { z } from "zod";
import type { Http } from "../http";
import { parseBody } from "../http";
import type { CallOptions } from "../types";
import { versionInfoSchema } from "./schemas";
import type { VersionInfo } from "./types";

const PATH = [
  "Versions",
] as const;

/** Community v4 answers with one object. */
export const createCommunityVersions =
  (http: Http) =>
  async (options?: CallOptions): Promise<VersionInfo> =>
    parseBody(versionInfoSchema, await http.get(PATH, options));

/** Pro v1 answers with one object per Nager library. */
export const createProVersions =
  (http: Http) =>
  async (options?: CallOptions): Promise<VersionInfo[]> =>
    parseBody(z.array(versionInfoSchema), await http.get(PATH, options));
