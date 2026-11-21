import { describeWeatherResource } from "../weather/resource";

describeWeatherResource("seasonal", {
  call: (client, params) => client.seasonal(params),
  commercial: "https://customer-seasonal-api.open-meteo.com",
  free: "https://seasonal-api.open-meteo.com",
  params: {
    daily: [
      "temperature_2m_max",
    ],
    latitude: 52.52,
    longitude: 13.41,
    monthly: [
      "temperature_2m_mean",
    ],
  },
  path: "/v1/seasonal",
  sections: {
    daily: {
      temperature_2m_max: [
        1,
      ],
      time: [
        "2026-11-21T00:00",
      ],
    },
    monthly: {
      temperature_2m_mean: [
        1,
      ],
      time: [
        "2026-11-21T00:00",
      ],
    },
  },
});
