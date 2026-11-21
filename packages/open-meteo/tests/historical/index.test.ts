import { describeWeatherResource } from "../weather/resource";

describeWeatherResource("historical", {
  call: (client, params) => client.historical(params),
  commercial: "https://customer-archive-api.open-meteo.com",
  free: "https://archive-api.open-meteo.com",
  params: {
    daily: [
      "temperature_2m_mean",
    ],
    end_date: "2024-01-02",
    latitude: 52.52,
    longitude: 13.41,
    start_date: "2024-01-01",
  },
  path: "/v1/archive",
  sections: {
    daily: {
      temperature_2m_mean: [
        1,
      ],
      time: [
        "2026-11-21T00:00",
      ],
    },
  },
});
