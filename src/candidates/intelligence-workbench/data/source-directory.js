// Primary-source links. External references do not imply collection or corroboration.
export const SOURCE_DIRECTORY = Object.freeze([
  {id:'usgs',name:'USGS',scope:'Worldwide M2.5+ earthquakes · 7 days',url:'https://earthquake.usgs.gov/',docs:'https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php'},
  {id:'nws',name:'NWS',scope:'United States · active actual weather alert areas',url:'https://www.weather.gov/alerts',docs:'https://www.weather.gov/documentation/services-web-api'},
  {id:'eonet',name:'NASA EONET',scope:'Worldwide open natural events · recent 30 days',url:'https://eonet.gsfc.nasa.gov/',docs:'https://eonet.gsfc.nasa.gov/docs/v3'},
  {id:'gdacs',name:'GDACS',scope:'Worldwide disasters · latest 100 app-feed reports',url:'https://www.gdacs.org/',docs:'https://www.gdacs.org/gdacsapi/swagger/index.html'},
  {id:'swpc',name:'NOAA SWPC',scope:'Space-weather notices · no geographic point',url:'https://www.swpc.noaa.gov/products/notifications-timeline',docs:'https://www.spaceweather.gov/content/data-access'},
  {id:'celestrak',name:'CelesTrak',scope:'Stations group · calculated SGP4 orbital positions',url:'https://celestrak.org/NORAD/elements/',docs:'https://celestrak.org/NORAD/documentation/gp-data-formats.php'},
  {name:'WMO Severe Weather',scope:'Warnings from national meteorological services worldwide',url:'https://severeweather.wmo.int/index.html',external:true},
  {name:'EMSC earthquakes',scope:'Worldwide earthquake parameters and original event reports',url:'https://www.emsc-csem.org/?page=current',external:true},
  {name:'Smithsonian volcano reports',scope:'Weekly volcanic activity reports worldwide',url:'https://volcano.si.edu/reports_weekly.cfm',external:true},
  {name:'Copernicus Emergency Mapping',scope:'Worldwide emergency mapping activations and products',url:'https://mapping.emergency.copernicus.eu/',external:true},
  {name:'NASA FIRMS',scope:'Worldwide satellite fire detections · original public map',url:'https://firms.modaps.eosdis.nasa.gov/map/',external:true},
  {name:'Australia Bureau of Meteorology',scope:'Australian weather warnings and observations',url:'https://www.bom.gov.au/',external:true},
]);
