import { describeWeatherResource } from "../weather/resource";

describeWeatherResource("flood", {
  call: (client, params) => client.flood(params),
  commercial: "https://customer-flood-api.open-meteo.com",
  free: "https://flood-api.open-meteo.com",
  params: {
    daily: [
      "river_discharge",
    ],
    ensemble: true,
    latitude: 52.52,
    longitude: 13.41,
  },
  path: "/v1/flood",
  sections: {
    daily: {
      river_discharge: [
        1,
      ],
      river_discharge_member01: [
        1,
      ],
      time: [
        "2026-11-21T00:00",
      ],
    },
  },
});
