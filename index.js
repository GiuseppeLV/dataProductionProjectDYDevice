const batteryLevel = require('battery-level');

(async () => {
	console.log(await batteryLevel());
	//=> 0.55
})();
