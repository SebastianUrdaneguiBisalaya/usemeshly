import { describe, expect, it } from "vitest";
import { isMeshlyError, MeshlyError } from "../../src/index";

const ACCESS_TOKEN = "ya29.a0AfB_secret-access";
const REFRESH_TOKEN = "1//0g-secret-refresh";
const CLIENT_SECRET = "GOCSPX-secret";

const leakyError = () =>
  new MeshlyError({
    code: "invalid_grant",
    message: `Refresh failed: refresh_token=${REFRESH_TOKEN}&client_secret=${CLIENT_SECRET} {"access_token":"${ACCESS_TOKEN}"} Authorization: Bearer ${ACCESS_TOKEN}`,
    providerCode: "invalid_grant",
    secrets: [
      REFRESH_TOKEN,
    ],
    status: 400,
  });

describe("MeshlyError", () => {
  it("never exposes tokens or secrets in any representation", () => {
    const error = leakyError();
    const outputs = [
      error.message,
      String(error),
      error.stack ?? "",
      JSON.stringify(error),
      // What console.log shows besides message and stack: the own enumerable properties.
      Object.values(error).join(" "),
    ];
    for (const output of outputs) {
      expect(output).not.toContain(ACCESS_TOKEN);
      expect(output).not.toContain(REFRESH_TOKEN);
      expect(output).not.toContain(CLIENT_SECRET);
    }
    expect(JSON.parse(JSON.stringify(error))).toMatchObject({
      code: "invalid_grant",
      providerCode: "invalid_grant",
      status: 400,
    });
  });

  it("drops a provider code that isn't an identifier", () => {
    const error = new MeshlyError({
      code: "invalid_response",
      message: "x",
      providerCode: `token ${ACCESS_TOKEN} leaked`,
    });
    expect(error.providerCode).toBeUndefined();
  });

  it("is recognized by brand and narrowed by code", () => {
    const error: unknown = leakyError();
    expect(isMeshlyError(error)).toBe(true);
    expect(isMeshlyError(error, "invalid_grant", "timeout")).toBe(true);
    expect(isMeshlyError(error, "timeout")).toBe(false);
    expect(isMeshlyError(new Error("plain"))).toBe(false);
  });
});
