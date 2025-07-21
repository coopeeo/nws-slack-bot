const fs = require('fs');
let finalData = {};
let checks = [];
let checks2 = []

fetch("https://api.weather.gov/zones")
  .then(response => response.json())
  .then(data => {
    data.features.forEach(feature => {
        let zonename = (feature.properties.state ? feature.properties.name.trim().replace(/\s+/g, ' ') + ", " + feature.properties.state : feature.properties.name.trim().replace(/\s+/g, ' '));
        if (!checks.includes(feature.properties.id) || !checks2.includes(zonename.toLowerCase())) {
            finalData[feature.properties.id] = zonename;
            checks.push(feature.properties.id);
            checks2.push(zonename.toLowerCase());
        } else if (checks2.includes(zonename.toLowerCase()) && !checks.includes(feature.properties.id)) {
            console.warn(`Duplicate zone found: ${zonename} (${feature.properties.id})`);
            i = 2;
            while (checks2.includes(zonename.toLowerCase() + ` (${i})`)) {
                i++;
            }
            finalData[feature.properties.id] = zonename + ` (${i})`;
            console.warn(`Renamed to: ${zonename} (${i})`);
            checks.push(feature.properties.id);
            checks2.push(zonename.toLowerCase() + ` (${i})`);
        }
    });
    fs.writeFileSync('data/zones.json', JSON.stringify(finalData));


  })
  .catch(error => {
    console.error("Error fetching zones:", error);
  });
