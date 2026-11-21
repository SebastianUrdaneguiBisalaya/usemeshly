import { describeWeatherResource } from "../weather/resource";

describeWeatherResource("historicalForecast", {
  call: (client, params) => client.historicalForecast(params),
  commercial: "https://customer-historical-forecast-api.open-meteo.com",
  free: "https://historical-forecast-api.open-meteo.com",
  params: {
    end_date: "2024-01-02",
    hourly: [
      "temperature_2m",
    ],
    latitude: 52.52,
    longitude: 13.41,
    start_date: "2024-01-01",
  },
  path: "/v1/forecast",
  sections: {
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
