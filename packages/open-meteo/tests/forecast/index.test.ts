import { describeWeatherResource } from "../weather/resource";

describeWeatherResource("forecast", {
  call: (client, params) => client.forecast(params),
  commercial: "https://customer-api.open-meteo.com",
  free: "https://api.open-meteo.com",
  params: {
    daily: [
      "temperature_2m_max",
    ],
    hourly: [
      "temperature_2m",
    ],
    latitude: 52.52,
    longitude: 13.41,
  },
  path: "/v1/forecast",
  sections: {
    daily: {
      temperature_2m_max: [
        1,
      ],
      time: [
        "2026-11-21T00:00",
      ],
    },
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
