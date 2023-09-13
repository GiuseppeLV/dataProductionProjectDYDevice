const batteryLevel = require('battery-level');

batteryLevel()
  .then(level => {
    console.log('Livello della batteria:', level);
  })
  .catch(error => {
    console.error('Errore nel recupero del livello della batteria:', error);
  });
