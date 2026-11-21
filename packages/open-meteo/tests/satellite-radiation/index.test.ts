import { describeWeatherResource } from "../weather/resource";

describeWeatherResource("satelliteRadiation", {
  call: (client, params) => client.satelliteRadiation(params),
  commercial: "https://customer-satellite-api.open-meteo.com",
  free: "https://satellite-api.open-meteo.com",
  params: {
    hourly: [
      "shortwave_radiation",
    ],
    latitude: 52.52,
    longitude: 13.41,
  },
  path: "/v1/archive",
  sections: {
    hourly: {
      shortwave_radiation: [
        1,
      ],
      time: [
        "2026-11-21T00:00",
      ],
    },
  },
});
