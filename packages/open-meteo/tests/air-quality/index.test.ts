import { describeWeatherResource } from "../weather/resource";

describeWeatherResource("airQuality", {
  call: (client, params) => client.airQuality(params),
  commercial: "https://customer-air-quality-api.open-meteo.com",
  free: "https://air-quality-api.open-meteo.com",
  params: {
    hourly: [
      "pm2_5",
      "european_aqi",
    ],
    latitude: 52.52,
    longitude: 13.41,
  },
  path: "/v1/air-quality",
  sections: {
    hourly: {
      european_aqi: [
        1,
      ],
      pm2_5: [
        1,
      ],
      time: [
        "2026-11-21T00:00",
      ],
    },
  },
});
