const COUNTRY_ROWS = [
  ["PH", "PHL", "608", "Philippines", "Philippines", "Asia", "South-Eastern Asia", ["Republic of the Philippines"], [12.8797, 121.774], [[4.5, 116.5], [21.5, 127.5]], 117300000, 300000],
  ["JP", "JPN", "392", "Japan", "Japan", "Asia", "Eastern Asia", ["Nippon"], [36.2048, 138.2529], [[24, 122], [46, 146]], 123300000, 377975],
  ["ID", "IDN", "360", "Indonesia", "Indonesia", "Asia", "South-Eastern Asia", ["Republic of Indonesia"], [-0.7893, 113.9213], [[-11, 95], [6, 141]], 281200000, 1904569],
  ["US", "USA", "840", "United States", "United States", "North America", "Northern America", ["USA", "U.S.", "United States of America"], [39.8283, -98.5795], [[24.4, -124.8], [49.4, -66.9]], 341800000, 9833517],
  ["MX", "MEX", "484", "Mexico", "Mexico", "North America", "Central America", ["United Mexican States"], [23.6345, -102.5528], [[14.5, -118.5], [32.7, -86.7]], 129700000, 1964375],
  ["CL", "CHL", "152", "Chile", "Chile", "South America", "South America", ["Republic of Chile"], [-35.6751, -71.543], [[-56, -76], [-17.5, -66]], 19600000, 756102],
  ["TR", "TUR", "792", "Turkiye", "Turkiye", "Asia", "Western Asia", ["Turkey", "Türkiye"], [38.9637, 35.2433], [[35.8, 26], [42.2, 45]], 85300000, 783562],
  ["GR", "GRC", "300", "Greece", "Greece", "Europe", "Southern Europe", ["Hellenic Republic"], [39.0742, 21.8243], [[34.8, 19], [41.8, 29.7]], 10300000, 131957],
  ["IT", "ITA", "380", "Italy", "Italy", "Europe", "Southern Europe", ["Italian Republic"], [41.8719, 12.5674], [[35.5, 6.6], [47.1, 18.6]], 58900000, 301340],
  ["NZ", "NZL", "554", "New Zealand", "New Zealand", "Oceania", "Australia and New Zealand", ["Aotearoa"], [-40.9006, 174.886], [[-47.5, 166], [-34, 179.5]], 5200000, 268021],
  ["PG", "PNG", "598", "Papua New Guinea", "Papua New Guinea", "Oceania", "Melanesia", ["PNG"], [-6.315, 143.9555], [[-11.8, 140.8], [-1.3, 156]], 11700000, 462840],
  ["VU", "VUT", "548", "Vanuatu", "Vanuatu", "Oceania", "Melanesia", ["Republic of Vanuatu"], [-15.3767, 166.9592], [[-20.5, 166], [-13, 170.5]], 335000, 12189],
  ["IS", "ISL", "352", "Iceland", "Iceland", "Europe", "Northern Europe", ["Republic of Iceland"], [64.9631, -19.0208], [[63.1, -24.6], [66.6, -13.5]], 390000, 103000],
  ["CN", "CHN", "156", "China", "China", "Asia", "Eastern Asia", ["People's Republic of China", "PRC"], [35.8617, 104.1954], [[18, 73], [54, 135]], 1409700000, 9596961],
  ["IN", "IND", "356", "India", "India", "Asia", "Southern Asia", ["Republic of India"], [20.5937, 78.9629], [[6.7, 68.1], [35.7, 97.4]], 1428600000, 3287263],
  ["BR", "BRA", "076", "Brazil", "Brazil", "South America", "South America", ["Federative Republic of Brazil"], [-14.235, -51.9253], [[-33.8, -73.9], [5.3, -34.8]], 203100000, 8515767],
  ["GB", "GBR", "826", "United Kingdom", "UK", "Europe", "Northern Europe", ["Britain", "Great Britain", "UK", "U.K."], [55.3781, -3.436], [[49.9, -8.7], [60.9, 1.8]], 68350000, 243610],
  ["DE", "DEU", "276", "Germany", "Germany", "Europe", "Western Europe", ["Federal Republic of Germany"], [51.1657, 10.4515], [[47.2, 5.8], [55.1, 15.1]], 84600000, 357022],
  ["FR", "FRA", "250", "France", "France", "Europe", "Western Europe", ["French Republic"], [46.2276, 2.2137], [[41, -5.2], [51.1, 9.6]], 68200000, 551695],
  ["ZA", "ZAF", "710", "South Africa", "South Africa", "Africa", "Southern Africa", ["Republic of South Africa"], [-30.5595, 22.9375], [[-35, 16], [-22, 33]], 63000000, 1221037],
  ["UA", "UKR", "804", "Ukraine", "Ukraine", "Europe", "Eastern Europe", ["Ukraina"], [48.3794, 31.1656], [[44, 22], [52.5, 40.3]], 37000000, 603628],
  ["RU", "RUS", "643", "Russia", "Russia", "Europe/Asia", "Eastern Europe", ["Russian Federation"], [61.524, 105.3188], [[41, 19], [82, 180]], 143800000, 17098246],
  ["IL", "ISR", "376", "Israel", "Israel", "Asia", "Western Asia", ["State of Israel"], [31.0461, 34.8516], [[29.4, 34.2], [33.4, 35.9]], 9800000, 22072],
  ["PS", "PSE", "275", "Palestine", "Palestine", "Asia", "Western Asia", ["Palestinian territories", "West Bank", "Gaza"], [31.9522, 35.2332], [[31.2, 34.2], [32.6, 35.6]], 5500000, 6020],
  ["IR", "IRN", "364", "Iran", "Iran", "Asia", "Southern Asia", ["Islamic Republic of Iran"], [32.4279, 53.688], [[25, 44], [40, 63]], 89100000, 1648195],
  ["IQ", "IRQ", "368", "Iraq", "Iraq", "Asia", "Western Asia", ["Republic of Iraq"], [33.2232, 43.6793], [[29, 38.7], [37.5, 48.6]], 45500000, 438317],
  ["SY", "SYR", "760", "Syria", "Syria", "Asia", "Western Asia", ["Syrian Arab Republic"], [34.8021, 38.9968], [[32, 35.6], [37.4, 42.4]], 24600000, 185180],
  ["YE", "YEM", "887", "Yemen", "Yemen", "Asia", "Western Asia", ["Republic of Yemen"], [15.5527, 48.5164], [[12, 42.5], [19, 54.5]], 34400000, 527968],
  ["SD", "SDN", "729", "Sudan", "Sudan", "Africa", "Northern Africa", ["Republic of the Sudan"], [12.8628, 30.2176], [[8.5, 21.8], [22.2, 38.6]], 50000000, 1886068],
  ["SS", "SSD", "728", "South Sudan", "South Sudan", "Africa", "Eastern Africa", ["Republic of South Sudan"], [6.877, 31.307], [[3.5, 24], [12.3, 36]], 11000000, 619745],
  ["ET", "ETH", "231", "Ethiopia", "Ethiopia", "Africa", "Eastern Africa", ["Federal Democratic Republic of Ethiopia"], [9.145, 40.4897], [[3, 33], [15, 48]], 126500000, 1104300],
  ["SO", "SOM", "706", "Somalia", "Somalia", "Africa", "Eastern Africa", ["Federal Republic of Somalia"], [5.1521, 46.1996], [[-1.7, 41], [12.1, 51.5]], 18100000, 637657],
  ["KE", "KEN", "404", "Kenya", "Kenya", "Africa", "Eastern Africa", ["Republic of Kenya"], [-0.0236, 37.9062], [[-4.7, 33.9], [5.1, 41.9]], 55300000, 580367],
  ["NG", "NGA", "566", "Nigeria", "Nigeria", "Africa", "Western Africa", ["Federal Republic of Nigeria"], [9.082, 8.6753], [[4, 2.7], [13.9, 14.7]], 223800000, 923768],
  ["ML", "MLI", "466", "Mali", "Mali", "Africa", "Western Africa", ["Republic of Mali"], [17.5707, -3.9962], [[10, -12.5], [25, 4.5]], 23200000, 1240192],
  ["NE", "NER", "562", "Niger", "Niger", "Africa", "Western Africa", ["Republic of Niger"], [17.6078, 8.0817], [[11.7, 0], [23.5, 16]], 27200000, 1267000],
  ["CD", "COD", "180", "Democratic Republic of the Congo", "DR Congo", "Africa", "Middle Africa", ["DRC", "Congo-Kinshasa"], [-4.0383, 21.7587], [[-13.5, 12], [5.5, 31.5]], 102300000, 2344858],
  ["AF", "AFG", "004", "Afghanistan", "Afghanistan", "Asia", "Southern Asia", ["Islamic Emirate of Afghanistan"], [33.9391, 67.71], [[29, 60.5], [38.5, 75.2]], 41400000, 652230],
  ["PK", "PAK", "586", "Pakistan", "Pakistan", "Asia", "Southern Asia", ["Islamic Republic of Pakistan"], [30.3753, 69.3451], [[23.5, 60.8], [37.1, 77.1]], 241500000, 881913],
  ["BD", "BGD", "050", "Bangladesh", "Bangladesh", "Asia", "Southern Asia", ["People's Republic of Bangladesh"], [23.685, 90.3563], [[20.7, 88], [26.6, 92.7]], 173000000, 147570],
  ["MM", "MMR", "104", "Myanmar", "Myanmar", "Asia", "South-Eastern Asia", ["Burma"], [21.9162, 95.956], [[9.5, 92], [28.5, 101.2]], 54100000, 676578],
  ["TH", "THA", "764", "Thailand", "Thailand", "Asia", "South-Eastern Asia", ["Kingdom of Thailand"], [15.87, 100.9925], [[5.5, 97], [20.5, 106]], 71600000, 513120],
  ["VN", "VNM", "704", "Vietnam", "Vietnam", "Asia", "South-Eastern Asia", ["Viet Nam"], [14.0583, 108.2772], [[8, 102], [23.5, 110]], 100300000, 331212],
  ["KR", "KOR", "410", "South Korea", "South Korea", "Asia", "Eastern Asia", ["Republic of Korea", "Korea"], [35.9078, 127.7669], [[33, 124.5], [38.7, 131]], 51700000, 100210],
  ["KP", "PRK", "408", "North Korea", "North Korea", "Asia", "Eastern Asia", ["DPRK"], [40.3399, 127.5101], [[37.7, 124], [43.1, 130.8]], 26100000, 120538],
  ["CA", "CAN", "124", "Canada", "Canada", "North America", "Northern America", ["Dominion of Canada"], [56.1304, -106.3468], [[41.7, -141], [83.1, -52.6]], 40000000, 9984670],
  ["AR", "ARG", "032", "Argentina", "Argentina", "South America", "South America", ["Argentine Republic"], [-38.4161, -63.6167], [[-55, -73.6], [-21.8, -53.6]], 46600000, 2780400],
  ["CO", "COL", "170", "Colombia", "Colombia", "South America", "South America", ["Republic of Colombia"], [4.5709, -74.2973], [[-4.3, -79], [12.7, -66.8]], 52300000, 1141748],
  ["PE", "PER", "604", "Peru", "Peru", "South America", "South America", ["Republic of Peru"], [-9.19, -75.0152], [[-18.4, -81.4], [0.2, -68.7]], 34200000, 1285216],
  ["VE", "VEN", "862", "Venezuela", "Venezuela", "South America", "South America", ["Bolivarian Republic of Venezuela"], [6.4238, -66.5897], [[0.6, -73.4], [12.2, -59.8]], 28500000, 916445],
  ["ES", "ESP", "724", "Spain", "Spain", "Europe", "Southern Europe", ["Kingdom of Spain"], [40.4637, -3.7492], [[35.8, -9.4], [43.8, 4.4]], 48600000, 505990],
  ["PL", "POL", "616", "Poland", "Poland", "Europe", "Eastern Europe", ["Republic of Poland"], [51.9194, 19.1451], [[49, 14], [54.9, 24.2]], 37600000, 312696],
  ["RO", "ROU", "642", "Romania", "Romania", "Europe", "Eastern Europe", ["Rumania"], [45.9432, 24.9668], [[43.6, 20.2], [48.3, 29.7]], 19000000, 238397],
  ["SE", "SWE", "752", "Sweden", "Sweden", "Europe", "Northern Europe", ["Kingdom of Sweden"], [60.1282, 18.6435], [[55, 11], [69.1, 24.2]], 10500000, 450295],
  ["NO", "NOR", "578", "Norway", "Norway", "Europe", "Northern Europe", ["Kingdom of Norway"], [60.472, 8.4689], [[57.8, 4.5], [71.2, 31.1]], 5500000, 385207],
  ["AU", "AUS", "036", "Australia", "Australia", "Oceania", "Australia and New Zealand", ["Commonwealth of Australia"], [-25.2744, 133.7751], [[-44, 112], [-10, 154]], 26600000, 7692024],
  ["SA", "SAU", "682", "Saudi Arabia", "Saudi Arabia", "Asia", "Western Asia", ["Kingdom of Saudi Arabia"], [23.8859, 45.0792], [[16, 34.5], [32.5, 55.7]], 37000000, 2149690],
  ["AE", "ARE", "784", "United Arab Emirates", "UAE", "Asia", "Western Asia", ["UAE", "Emirates"], [23.4241, 53.8478], [[22.5, 51.5], [26.2, 56.4]], 9900000, 83600],
  ["EG", "EGY", "818", "Egypt", "Egypt", "Africa", "Northern Africa", ["Arab Republic of Egypt"], [26.8206, 30.8025], [[22, 24.7], [31.7, 36.9]], 112700000, 1002450],
  ["MA", "MAR", "504", "Morocco", "Morocco", "Africa", "Northern Africa", ["Kingdom of Morocco"], [31.7917, -7.0926], [[27.6, -13.2], [35.9, -1]], 37800000, 446550],
];

function country(row) {
  const [iso2, iso3, numericCode, name, shortName, region, subregion, aliases, centroid, bounds, population, areaKm2] = row;
  return {
    code: iso2,
    iso2,
    iso3,
    numericCode,
    name,
    shortName,
    region,
    subregion,
    aliases,
    centroid: { lat: centroid[0], lon: centroid[1] },
    lat: centroid[0],
    lon: centroid[1],
    bounds: { south: bounds[0][0], west: bounds[0][1], north: bounds[1][0], east: bounds[1][1] },
    geometryId: `ne-admin0-${iso3.toLowerCase()}`,
    population,
    areaKm2,
  };
}

export const COUNTRIES = COUNTRY_ROWS.map(country).sort((a, b) => a.name.localeCompare(b.name));

const COUNTRY_LOOKUP = new Map();
for (const item of COUNTRIES) {
  for (const value of [item.iso2, item.iso3, item.numericCode, item.name, item.shortName, ...(item.aliases || [])]) {
    COUNTRY_LOOKUP.set(String(value).toLowerCase(), item);
  }
}

export function countryByCode(value) {
  if (!value) return null;
  return COUNTRY_LOOKUP.get(String(value).trim().toLowerCase()) || null;
}

export function countryForEvent(event = {}) {
  for (const value of [event.countryCode, event.iso2, event.iso3, event.country, event.countryName]) {
    const direct = countryByCode(value);
    if (direct) return direct;
  }
  const text = `${event.country || ""} ${event.countryName || ""} ${event.place || ""} ${event.location || ""}`.toLowerCase();
  const tokens = new Set(text.split(/[^a-z0-9]+/i).filter(Boolean));
  return COUNTRIES.find((item) =>
    [item.iso2, item.iso3, item.name, item.shortName, ...(item.aliases || [])]
      .filter(Boolean)
      .some((value) => {
        const normalized = String(value).toLowerCase();
        if (normalized.length <= 3) return tokens.has(normalized);
        const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return text === normalized || new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(text);
      })
  ) || null;
}

export function countryBoundsArray(countryRecord) {
  if (!countryRecord?.bounds) return null;
  return [
    [countryRecord.bounds.south, countryRecord.bounds.west],
    [countryRecord.bounds.north, countryRecord.bounds.east],
  ];
}

export function countryFlag(countryRecord) {
  const code = countryRecord?.iso2 || countryRecord?.code;
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(...code.toUpperCase().split("").map((char) => 127397 + char.charCodeAt(0)));
}
