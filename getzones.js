const fs = require('fs');
let finalData = {};
let checks = [];

fetch("https://api.weather.gov/zones")
  .then(response => response.json())
  .then(data => {
    data.features.forEach(feature => {
        let zonename = (feature.properties.state ? feature.properties.name.trim().replace(/\s+/g, ' ') + ", " + feature.properties.state : feature.properties.name.trim().replace(/\s+/g, ' '));
        if (!checks.includes(feature.properties.id)) {
            finalData[feature.properties.id] = zonename;
            checks.push(feature.properties.id);
        }
    });
    fs.writeFileSync('data/zones.json', JSON.stringify(finalData));


  })
  .catch(error => {
    console.error("Error fetching zones:", error);
  });
