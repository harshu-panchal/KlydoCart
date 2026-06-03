const https = require('https');

function testNominatim() {
  const lat = 22.7175995;
  const lng = 75.8719802;
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
  
  https.get(url, { headers: { 'User-Agent': 'KlydoCart-Test' } }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        console.log(JSON.stringify(json, null, 2));
      } catch (e) {
        console.error('Parse error:', e);
        console.log('Raw data:', data);
      }
    });
  }).on('error', e => console.error(e));
}
testNominatim();
