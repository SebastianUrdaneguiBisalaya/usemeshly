import { describeWeatherResource } from "../weather/resource";

describeWeatherResource("marine", {
  call: (client, params) => client.marine(params),
  commercial: "https://customer-marine-api.open-meteo.com",
  free: "https://marine-api.open-meteo.com",
  params: {
    hourly: [
      "wave_height",
    ],
    latitude: 52.52,
    length_unit: "imperial",
    longitude: 13.41,
  },
  path: "/v1/marine",
  sections: {
    hourly: {
      time: [
        "2026-11-21T00:00",
      ],
      wave_height: [
        1,
      ],
    },
  },
});
