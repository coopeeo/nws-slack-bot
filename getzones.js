const fs = require('fs');
let finalData = {};

fetch("https://api.weather.gov/zones")
  .then(response => response.json())
  .then(data => {
    data.features.forEach(feature => {
      finalData[feature.properties.id] = feature.properties.name + ", " + feature.properties.state;
    });
    fs.writeFileSync('data/zones.json', JSON.stringify(finalData));


  })
  .catch(error => {
    console.error("Error fetching zones:", error);
  });
