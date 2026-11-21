/** Version information of a Nager library running on the server (`VersionInfoDto`). */
export type VersionInfo = {
  /** The name of the library, e.g. `"Nager.Date"`. */
  name: string;
  /** The version of the library (its NuGet package version). */
  version: string;
};
