import { describeWeatherResource } from "../weather/resource";

describeWeatherResource("previousRuns", {
  call: (client, params) => client.previousRuns(params),
  commercial: "https://customer-previous-runs-api.open-meteo.com",
  free: "https://previous-runs-api.open-meteo.com",
  params: {
    hourly: [
      "temperature_2m",
      "temperature_2m_previous_day1",
    ],
    latitude: 52.52,
    longitude: 13.41,
  },
  path: "/v1/forecast",
  sections: {
    hourly: {
      temperature_2m: [
        1,
      ],
      temperature_2m_previous_day1: [
        1,
      ],
      time: [
        "2026-11-21T00:00",
      ],
    },
  },
});
