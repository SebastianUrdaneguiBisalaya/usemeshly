// Response types inferred from the request: only the requested variables exist, keyed by name.

/** What `kinds` maps every variable to: `time` values are timestamps, `number` values measurements. */
export type VariableKinds = Readonly<Record<string, "number" | "time">>;

/** `time` and timestamp variables: ISO 8601 strings, or Unix seconds with `timeformat: "unixtime"`. */
export type TimeValue<P> = P extends {
  timeformat: "unixtime";
}
  ? number
  : string;

type Value<Kind, P> = Kind extends "time" ? TimeValue<P> : number;

/** Two or more models: Open-Meteo suffixes each variable with the model (`temperature_2m_icon_global`). */
type MultiModel<P> = P extends {
  models: readonly [
    unknown,
    unknown,
    ...unknown[],
  ];
}
  ? true
  : false;

type ModelOf<P> = P extends {
  models: readonly (infer Model extends string)[];
}
  ? Model
  : never;

/** The variable names requested in `section`. */
export type Requested<P, Section extends string, Kinds> = P extends {
  readonly [K in Section]: readonly (infer Name)[];
}
  ? Name & keyof Kinds & string
  : never;

type Keyed<Kinds, Names extends keyof Kinds & string, P, Item> =
  MultiModel<P> extends true
    ? {
        [K in Names as `${K}_${ModelOf<P>}`]: Item extends "array"
          ? (Value<Kinds[K], P> | null)[]
          : Value<Kinds[K], P> | null;
      }
    : {
        // Mapped over `Pick` so each variable keeps its TSDoc label.
        [K in keyof Pick<Kinds, Names>]: Item extends "array"
          ? (Value<Kinds[K], P> | null)[]
          : Value<Kinds[K], P> | null;
      };

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
/** `01` … `99`. */
export type MemberNumber = Exclude<`${Digit}${Digit}`, "00">;

/**
 * Ensemble members next to each requested variable (`temperature_2m_member01`, …), for ensemble and seasonal
 * responses. Optional: how many exist depends on the model. With several models the member keys aren't typed (they
 * are still in the parsed object).
 */
export type Members<Names extends string, P> =
  MultiModel<P> extends true
    ? unknown
    : {
        [K in Names as `${K}_member${MemberNumber}`]?: (number | null)[];
      };

/** A time series: `time` plus one array per requested variable, aligned by index. `null` marks missing data. */
export type Series<
  Kinds,
  Names extends keyof Kinds & string,
  P,
  WithMembers extends boolean = false,
> = {
  /** The time of each value. */
  time: TimeValue<P>[];
} & Keyed<Kinds, Names, P, "array"> &
  (WithMembers extends true ? Members<Names, P> : unknown);

/** The conditions now: one value per requested variable. */
export type Current<Kinds, Names extends keyof Kinds & string, P> = {
  /** The time the values are valid for. */
  time: TimeValue<P>;
  /** The length of the interval the values cover, in seconds (900 for 15-minutely). */
  interval: number;
} & Keyed<Kinds, Names, P, "scalar">;

/** The unit of each key of `Data` (e.g. `°C`, `km/h`, `iso8601`). */
export type UnitsOf<Data> = {
  [K in keyof Data]: string;
};

/**
 * `{ [section]: data, [section_units]: units }` when `section` lists at least one variable, nothing otherwise (an
 * empty list isn't sent).
 */
export type Section<
  P,
  Name extends string,
  Kinds,
  Shape extends "series" | "current",
  WithMembers extends boolean = false,
> = [
  Requested<P, Name, Kinds>,
] extends [
  never,
]
  ? unknown
  : SectionOf<P, Name, Kinds, Shape, WithMembers, Requested<P, Name, Kinds>>;

type SectionOf<
  P,
  Name extends string,
  Kinds,
  Shape extends "series" | "current",
  WithMembers extends boolean,
  Names extends keyof Kinds & string,
> = Shape extends "current"
  ? {
      [K in Name]: Current<Kinds, Names, P>;
    } & {
      [K in `${Name}_units`]: UnitsOf<Current<Kinds, Names, P>>;
    }
  : {
      [K in Name]: Series<Kinds, Names, P, WithMembers>;
    } & {
      [K in `${Name}_units`]: UnitsOf<Series<Kinds, Names, P, WithMembers>>;
    };

/** What every weather response has, whatever was requested. */
export type LocationMeta = {
  /** Latitude of the grid cell used, in WGS84. It can differ from the requested one by a few kilometres. */
  latitude: number;
  /** Longitude of the grid cell used, in WGS84. */
  longitude: number;
  /** The elevation used for statistical downscaling, in metres. */
  elevation?: number | undefined;
  /** Time Open-Meteo took to generate the response, in milliseconds. */
  generationtime_ms: number;
  /** Offset of the time zone from GMT, in seconds. */
  utc_offset_seconds: number;
  /** The time zone used (`GMT`, or the requested or resolved one). */
  timezone: string;
  /** Its abbreviation, e.g. `CEST`. */
  timezone_abbreviation: string;
};

type Simplify<T> = {
  [K in keyof T]: T[K];
} & {};

/** One location's response, or an array of them when several coordinates were requested. */
export type PerLocation<P, Body> = P extends {
  latitude: readonly number[];
}
  ? Simplify<LocationMeta & Body>[]
  : Simplify<LocationMeta & Body>;
