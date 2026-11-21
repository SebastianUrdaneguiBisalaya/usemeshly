import type { ParamRule } from "./index";

type Rules = Record<string, ParamRule>;
type Limit = readonly [
  min: number,
  max: number,
  defaultValue: number,
];

export const timeRules: Rules = {
  timeformat: {
    type: "enum",
    values: [
      "iso8601",
      "unixtime",
    ],
  },
  timezone: {
    type: "timezone",
  },
};

export const temperatureRule: Rules = {
  temperature_unit: {
    type: "enum",
    values: [
      "celsius",
      "fahrenheit",
    ],
  },
};

export const windRule: Rules = {
  wind_speed_unit: {
    type: "enum",
    values: [
      "kmh",
      "ms",
      "mph",
      "kn",
    ],
  },
};

export const precipitationRule: Rules = {
  precipitation_unit: {
    type: "enum",
    values: [
      "mm",
      "inch",
    ],
  },
};

export const unitRules: Rules = {
  ...temperatureRule,
  ...windRule,
  ...precipitationRule,
};

export const dateRules: Rules = {
  end_date: {
    type: "date",
  },
  start_date: {
    type: "date",
  },
};

export const hourRules: Rules = {
  forecast_hours: {
    min: 0,
    type: "integer",
  },
  past_hours: {
    min: 0,
    type: "integer",
  },
};

export const cellRule: Rules = {
  cell_selection: {
    type: "enum",
    values: [
      "land",
      "sea",
      "nearest",
    ],
  },
};

export const elevationRule: Rules = {
  elevation: {
    type: "number",
  },
};

export const tiltRules: Rules = {
  azimuth: {
    type: "number",
  },
  tilt: {
    max: 90,
    min: 0,
    type: "number",
  },
};

/** `past_days` / `forecast_days` with the spec's range; without one, any non-negative integer. */
export const dayRules = (limits: {
  readonly past_days?: Limit;
  readonly forecast_days?: Limit;
}): Rules => ({
  forecast_days: {
    max: limits.forecast_days?.[1],
    min: limits.forecast_days?.[0] ?? 0,
    type: "integer",
  } as ParamRule,
  past_days: {
    max: limits.past_days?.[1],
    min: limits.past_days?.[0] ?? 0,
    type: "integer",
  } as ParamRule,
});

export const modelsRule = (values: readonly string[]): Rules => ({
  models: {
    type: "list",
    values,
  },
});
