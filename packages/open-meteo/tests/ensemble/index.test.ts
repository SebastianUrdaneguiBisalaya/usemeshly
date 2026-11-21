import { describeWeatherResource } from "../weather/resource";

describeWeatherResource("ensemble", {
  call: (client, params) => client.ensemble(params),
  commercial: "https://customer-ensemble-api.open-meteo.com",
  free: "https://ensemble-api.open-meteo.com",
  params: {
    hourly: [
      "temperature_2m",
    ],
    latitude: 52.52,
    longitude: 13.41,
    models: [
      "dwd_icon_seamless_eps",
    ],
  },
  path: "/v1/ensemble",
  sections: {
    hourly: {
      temperature_2m: [
        1,
      ],
      temperature_2m_member01: [
        1,
      ],
      time: [
        "2026-11-21T00:00",
      ],
    },
  },
});
