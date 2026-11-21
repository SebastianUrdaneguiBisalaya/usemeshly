import { describeWeatherResource } from "../weather/resource";

describeWeatherResource("climate", {
  call: (client, params) => client.climate(params),
  commercial: "https://customer-climate-api.open-meteo.com",
  free: "https://climate-api.open-meteo.com",
  params: {
    daily: [
      "temperature_2m_max",
    ],
    end_date: "2040-01-02",
    latitude: 52.52,
    longitude: 13.41,
    models: [
      "MRI_AGCM3_2_S",
    ],
    start_date: "2040-01-01",
  },
  path: "/v1/climate",
  sections: {
    daily: {
      temperature_2m_max: [
        1,
      ],
      time: [
        "2026-11-21T00:00",
      ],
    },
  },
});
