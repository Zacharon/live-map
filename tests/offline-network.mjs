// Explicit test preload. Never imported by application code; no outbound requests.
globalThis.fetch=async function(input) {
  const url=String(input instanceof Request?input.url:input);
  if(url.includes('earthquake.usgs.gov')) return Response.json({type:'FeatureCollection',features:[{id:'offline-test',type:'Feature',geometry:{type:'Point',coordinates:[140,35,10]},properties:{mag:6.2,title:'Synthetic validator earthquake',place:'Synthetic fixture',time:Date.now()-60000,updated:Date.now(),status:'reviewed',url:'https://example.com/synthetic-validator'}}]});
  if(url.includes('eonet.gsfc.nasa.gov')) return Response.json({events:[]});
  if(url.includes('api.weather.gov')) return Response.json({features:[]});
  return new Response('Offline test: upstream unavailable',{status:503});
};
