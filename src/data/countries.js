export const COUNTRIES = [
  { code: "PH", name: "Philippines", lat: 12.8797, lon: 121.774, region: "Asia" },
  { code: "JP", name: "Japan", lat: 36.2048, lon: 138.2529, region: "Asia" },
  { code: "ID", name: "Indonesia", lat: -0.7893, lon: 113.9213, region: "Asia" },
  { code: "US", name: "United States", lat: 39.8283, lon: -98.5795, region: "North America" },
  { code: "MX", name: "Mexico", lat: 23.6345, lon: -102.5528, region: "North America" },
  { code: "CL", name: "Chile", lat: -35.6751, lon: -71.543, region: "South America" },
  { code: "TR", name: "Turkey", lat: 38.9637, lon: 35.2433, region: "Europe/Asia" },
  { code: "GR", name: "Greece", lat: 39.0742, lon: 21.8243, region: "Europe" },
  { code: "IT", name: "Italy", lat: 41.8719, lon: 12.5674, region: "Europe" },
  { code: "NZ", name: "New Zealand", lat: -40.9006, lon: 174.886, region: "Oceania" },
  { code: "PG", name: "Papua New Guinea", lat: -6.315, lon: 143.9555, region: "Oceania" },
  { code: "VU", name: "Vanuatu", lat: -15.3767, lon: 166.9592, region: "Oceania" },
  { code: "IS", name: "Iceland", lat: 64.9631, lon: -19.0208, region: "Europe" },
  { code: "CN", name: "China", lat: 35.8617, lon: 104.1954, region: "Asia" },
  { code: "IN", name: "India", lat: 20.5937, lon: 78.9629, region: "Asia" },
  { code: "BR", name: "Brazil", lat: -14.235, lon: -51.9253, region: "South America" },
  { code: "GB", name: "United Kingdom", lat: 55.3781, lon: -3.436, region: "Europe" },
  { code: "DE", name: "Germany", lat: 51.1657, lon: 10.4515, region: "Europe" },
  { code: "FR", name: "France", lat: 46.2276, lon: 2.2137, region: "Europe" },
  { code: "ZA", name: "South Africa", lat: -30.5595, lon: 22.9375, region: "Africa" },
];

export function countryForEvent(event) {
  const text = `${event.country || ""} ${event.place || ""}`.toLowerCase();
  return COUNTRIES.find((country) => text.includes(country.name.toLowerCase()) || text.endsWith(country.code.toLowerCase()));
}
