import { describeWeatherResource } from "../weather/resource";

describeWeatherResource("singleRuns", {
  call: (client, params) => client.singleRuns(params),
  commercial: "https://customer-single-runs-api.open-meteo.com",
  free: "https://single-runs-api.open-meteo.com",
  params: {
    hourly: [
      "temperature_2m",
    ],
    latitude: 52.52,
    longitude: 13.41,
    models: [
      "icon_global",
    ],
    run: "2026-11-20T00:00",
  },
  path: "/v1/forecast",
  sections: {
    hourly: {
      temperature_2m: [
        1,
      ],
      time: [
        "2026-11-21T00:00",
      ],
    },
  },
});
