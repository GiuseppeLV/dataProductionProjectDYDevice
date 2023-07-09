const { DefaultAzureCredential } = require("@azure/identity");
const { DigitalTwinsClient } = require("@azure/digital-twins-core");
const si = require('systeminformation');
const arp = require('node-arp');
const { inspect } = require("util");
const useragent = require('useragent');
const os = require('os');


const url = "https://GenericDTDevice.api.weu.digitaltwins.azure.net";
const credential = new DefaultAzureCredential();
const serviceClient = new DigitalTwinsClient(url, credential);


const { cpuUsage, memoryUsage } = require("process");
const { error } = require("console");

const pcTwinId = "pcId";  
const smartphoneTwinId="smartphoneId";

function convertToGB(bytes) {
  return (bytes / 1024 / 1024 / 1024).toFixed(2);
}
/*
function isMobile() {
  return /iPhone|Android/.test(navigator.userAgent);
}
*/
function isPC() {
  return !isMobile();
}
function getRam() {
  return new Promise((resolve, reject) => {
    si.mem()
      .then(data => {
        var ramTotal = convertToGB(data.total);
        var ramAvailable = convertToGB(data.available);
        var ramUsage = convertToGB(data.used);

        resolve({
          ramTotal: ramTotal,
          ramUsage: ramUsage,
          ramAvailable: ramAvailable
        });
      })
      .catch(error => {
        console.error("Errore durante il recupero delle informazioni sulla RAM:", error);
        reject(error);
      });
  });
}

function getMemory(){
  return new Promise((resolve, reject) => {
  si.fsSize()
  .then(data => {
    // Seleziona il primo disco nel caso ci siano più dischi
    const disk = data[0];
    const diskSizeGB = convertToGB(disk.size);
    let diskUsedGB = convertToGB(disk.used);
    // Stampa le informazioni sul disco totale e utilizzato
    resolve({
      diskUsedGB,
      diskSizeGB
    });

    return{diskSizeGB,diskUsedGB};
  })
  .catch(error => {
    console.error(error);
    reject(error);
  });

  });


}

function getCpu(){
  return new Promise((resolve, reject) => {
  si.cpu()
  .then(data => {
    const manufacturer=data.manufacturer;
    const brand=data.brand;
    const frequency= data.speed;
    const cores=data.cores;
    const physicalCores=data.physicalCores;
    resolve({
      manufacturer,
      brand,
      frequency,
      cores,
      physicalCores
    });
  })
  .catch(error => {
  console.error(error);
  reject(error);
  });
  });
  
}


  function getCpuTemperature(){
  return new Promise((resolve, reject) => {
  si.cpuTemperature()
  .then(data =>{ 
    var tempMax=data.max;
    resolve({
      tempMax
    });
  })
  .catch(error => {
  console.error(error);
  reject(error);
  });
  });
}

function getCpuLoad(){
  return new Promise((resolve, reject) => {
  si.currentLoad()
  .then(data =>{ 
    var load=data.currentLoad;
    resolve({
      load
    });
  })
  .catch(error => {
  console.error(error);
  reject(error);
  });
  });
}


function getGraphicCard(){
  return new Promise((resolve, reject) => {
  si.graphics()
  .then(data =>{ 
    const firstGraphicsCard = data.controllers[0];
    var model=firstGraphicsCard.model;
    var vendor=firstGraphicsCard.vendor;
    var memory= firstGraphicsCard.vram; //in MB
    resolve({
      model,
      vendor,
      memory
    });
  })
  .catch(error => {
  console.error(error);
  reject(error);
  });
  });
}


/*
async function sendTelemetry(TwinId, dataType, dataValue, telemetryName){
  console.log("TYPO DATAVALUE@@@@@@@@@@@"+typeof dataValue);
  const telemetryData = {
    [telemetryName]: dataValue,
  };

  console.log("telemetry data:"+JSON.stringify(telemetryData));

  let response=await serviceClient.publishComponentTelemetry(TwinId, dataType, JSON.stringify(telemetryData));
  console.log("sonoqui3")
  console.log(dataType+'telemetry sent successfully.');
  console.log('Publish Component ' +dataType+ ' response:');
  console.log(inspect(response));
  console.log("sonoqui2")
}
*/

async function upsertDigitalTwinFunc(idDevice){
  'use strict';

const Protocol = require('azure-iot-device-mqtt').Mqtt;
const Client = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;

var connectionString = "HostName=hubIndustrialInfProjectDTDevice.azure-devices.net;DeviceId="+idDevice+";SharedAccessKey=YVX111rYT/iNQsZz8a532IhQT9sOy+hzAnQTpmgxnyw=";

var client = Client.fromConnectionString(connectionString, Protocol);

function printResultFor(op) {
    return function printResult(err, res) {
      if (err) console.log(op + ' error: ' + err.toString());
      if (res) console.log(op + ' status: ' + res.constructor.name);
    };
  }


  var connectCallback = function (err) {
    if (err) {
      console.log('Could not connect: ' + err);
    } else {
      console.log('Client connected');
  
      // Create a message and send it to the IoT Hub every second
      setInterval(async function(){
      try{
      var ram=await getRam(); 
      var cpu=await getCpu();
      var cpuTemp=await getCpuTemperature();
      var cpuLoad=await getCpuLoad();
      var memory=await getMemory();
      var network=await getDevicesConnected()
      var deviceIpInfo= getDeviceNetInfo()
      var graphiccard= await getGraphicCard()
      var modelName= await getModel()
      var operatingSystem = os.type();
for (let i = 0; i < network.devices.length; i++) {
  console.log(network.devices[i].mac);
  console.log(network.devices[i].ip);
}
      console.log("MEMORYDISKSIZE################"+memory.diskSizeGB+typeof memory.diskSizeGB);

      const MyPCTwin = {
        $dtId: pcTwinId,
        $metadata: {
          $model: "dtmi:com:example:GenericPC;1"
        },
        name: modelName.model,
        os: operatingSystem,
        GenericRam:{
          $metadata: {},
          size:parseInt(ram.ramTotal),
          ramUsage:parseFloat(ram.ramUsage)
        },
        GenericMemory:{
          $metadata: {},
          diskSpace:parseInt(memory.diskSizeGB),
          memoryUsage:parseFloat(memory.diskUsedGB)
        },
        GenericCpu:{
          $metadata: {},
          frequency:cpu.frequency,
          coreNumber:cpu.cores,
          physicalCoreNumber: cpu.physicalCores,
          manufacturer: cpu.manufacturer,
          brand: cpu.brand,
          cpuUsage: cpuLoad.load,
          temperature: parseInt(cpuTemp.tempMax)
        },
        GenericGraphicCard:{
          $metadata: {},
          size:graphiccard.memory,
          name:graphiccard.model
        },
        GenericNetworkInfo:{
          $metadata: {},
          ipAddress:deviceIpInfo.deviceIP,
          MacAddress:deviceIpInfo.deviceMAC,
          connectedDevices:JSON.stringify(network.devices),
        }
        
    };
      console.log("twinid:"+JSON.stringify(network.devices))
    const createdTwinPC = await serviceClient.upsertDigitalTwin(pcTwinId, JSON.stringify(MyPCTwin));
    console.log("Created Digital Twin:");
    console.log(inspect(createdTwinPC));
          console.log("Telemetry updated in Azure Digital Twin successfully.");
        } catch (error) {
          console.error("Failed to update telemetry in Azure Digital Twin:", error);
        }

        
          
          var data = JSON.stringify({ "pcId": pcTwinId});
          var message = new Message(data=data);
          message.contentType="application/json",
          message.contentEncoding="utf-8",
          console.log("Sending message: " + message.getData());
          client.sendEvent(message, printResultFor('send'));
      }, 5000);
    }
  };

  client.open(connectCallback);
}

/*
async function updateRamUsageInDigitalTwin() {
  // ... codice per ottenere il DigitalTwinsClient e impostare il componentePath e le altre variabili ...

  const updateIntervalMs = 5000; // Intervallo di aggiornamento in millisecondi

  setInterval(async () => {
    const newRamUsage = Math.random() * 100; // Generazione di un nuovo valore casuale per la telemetria ramUsage

    try {
      const twinPatch = {
        op: "replace",
        path: "/GenericRam/ramUsage",
        value: newRamUsage
        };

    const updatedTwin = await serviceClient.updateDigitalTwin("pcId", [twinPatch]);
    console.log(`Updated Digital Twin:`);
    console.log(inspect(updatedTwin));
      console.log("Telemetry updated in Azure Digital Twin successfully.");
    } catch (error) {
      console.error("Failed to update telemetry in Azure Digital Twin:", error);
    }
  }, updateIntervalMs);
}

// Esempio di utilizzo
updateRamUsageInDigitalTwin();
*/
async function createDTMobile(){
  const MySmartphoneTwin = {
    $dtId: smartphoneTwinId,
    $metadata: {
      $model: "dtmi:com:example:GenericSmartphone;1"
    },
    GenericBattery:{
      $metadata: {},
      batteryLevel:0
    },
    GenericRam:{
      $metadata: {},
      size:8
    },
    GenericMemory:{
      $metadata: {},
      diskSpace:32
    },
    GenericCpu:{
      $metadata: {},
      frequency:4.5
    }

    };


    const createdTwinSmartphone = await serviceClient.upsertDigitalTwin(smartphoneTwinId, JSON.stringify(MySmartphoneTwin));
    console.log("Created Digital Twin:");
    console.log(inspect(createdTwinSmartphone));
}

async function createDTPC(){
  var ram=await getRam(); 
  var cpu=await getCpu();
  var memory=await getMemory();
  
  console.log("MEMORYDISKSIZE################"+memory.diskSizeGB+typeof memory.diskSizeGB);

  const MyPCTwin = {
    $dtId: pcTwinId,
    $metadata: {
      $model: "dtmi:com:example:GenericPC;1"
    },
    GenericRam:{
      $metadata: {},
      size:parseInt(ram.ramTotal),
      ramUsage:parseFloat(ram.ramUsage)
    },
    GenericMemory:{
      $metadata: {},
      diskSpace:parseInt(memory.diskSizeGB),
      memoryUsage:parseFloat(memory.diskUsedGB)
    },
    GenericCpu:{
      $metadata: {},
      frequency:cpu.frequency,
      coreNumber:cpu.cores,
      physicalCoreNumber: cpu.physicalCores,
      manufacturer: cpu.manufacturer,
      brand: cpu.brand,
      cpuUsage: parseFloat(cpu.cpuUsage),
      cpuTemperature: 0
    },
    GenericGraphicCard:{
      $metadata: {},
      size:6
    },
    GenericNetworkInfo:{
      $metadata: {},
    }
    
};

const createdTwinPC = await serviceClient.upsertDigitalTwin(pcTwinId, JSON.stringify(MyPCTwin));
console.log("Created Digital Twin:");
console.log(inspect(createdTwinPC));
/*await sendTelemetry(pcTwinId,"GenericRam",ram.ramUsed,"ramUsage");
await sendTelemetry(pcTwinId,"GenericMemory",memory.diskUsedGB,"memoryUsage");*/
/*await sendTelemetryFunc();*/
await sendTelemetryFunc();

}


function getDevicesConnected(){
  const find= require('local-devices');
  return new Promise((resolve, reject) => {
  find()
  .then(devices =>{ 
    devices
    resolve({
      devices
    });
  })
  .catch(error => {
  console.error(error);
  reject(error);
  });
  });
}

function getModel(){
  return new Promise((resolve, reject) => {
  si.system()
  .then(data =>{ 
    const model = data.model;
    resolve({
      model
    });
  })
  .catch(error => {
  console.error(error);
  reject(error);
  });
  });
}


function getDeviceNetInfo(){
  const os = require('os');

  const networkInterfaces = os.networkInterfaces();
  
  let deviceIP, deviceMAC;
  
  // Itera sulle interfacce di rete per trovare l'indirizzo IP e l'indirizzo MAC del dispositivo
  Object.keys(networkInterfaces).forEach((interfaceName) => {
    networkInterfaces[interfaceName].forEach((interface) => {
      if (interface.family === 'IPv4' && !interface.internal) {
        deviceIP = interface.address;
        deviceMAC = interface.mac;
      }
    });
  });
  
  return{deviceIP,deviceMAC}
}


async function main(){
 /* if(isMobile()){
    createDTMobile();
  }*/  

/*
serviceClient.deleteModel("dtmi:com:example:GenericSmartphone;1");
serviceClient.deleteModel( "dtmi:com:example:GenericCpu;1");
serviceClient.deleteModel("dtmi:com:example:GenericBattery;1");
serviceClient.deleteModel("dtmi:com:example:GenericMemory;1");
serviceClient.deleteModel("dtmi:com:example:GenericGraphicCard;1");

serviceClient.deleteModel("dtmi:com:example:GenericRam;1");

serviceClient.deleteModel("dtmi:com:example:GenericDevice;1");
serviceClient.deleteModel( "dtmi:com:example:GenericPC;1");

serviceClient.deleteModel( "dtmi:com:example:GenericNetworkInfo;1");
serviceClient.deleteModel( "dtmi:com:example:GenericGyroscope;1");
*/

  const battery=require("./modelli/GenericBattery.json")
const cpu=require("./modelli/GenericCpu.json")
const device=require("./modelli/GenericDevice.json")
const graphiccard=require("./modelli/GenericGraphicCard.json")
const memory=require("./modelli/GenericMemory.json")
const pc=require("./modelli/GenericPC.json")
const ram=require("./modelli/GenericRam.json")
const smartphone=require("./modelli/GenericSmartphone.json");
const networkinfo=require("./modelli/GenericNetworkInfo.json");
const gyroscope=require("./modelli/GenericGyroscope.json");
/*
  const newModels = [battery,cpu,device,graphiccard,pc,memory,ram,smartphone,networkinfo,gyroscope];
  const model = await serviceClient.createModels(newModels);
  console.log("Created Model:");
  console.log(inspect(model));
*/
//upsertDigitalTwinFunc("pcId");

// Esegui la scansione ARP
// Using a transpiler

// Without using a transpiler


// Find all local network devices.


await upsertDigitalTwinFunc("pcId")
}
/*


*/

 
  /*
// Create Digital Twins
async function main(){
const model1 = await serviceClient.getModel("dtmi:com:example:GenericDevice;1");
console.log("Model exists:", model1);
const model2 =await serviceClient.getModel("dtmi:com:example:GenericSmartphone;1");
console.log("Model exists:", model2);
const model3 =await serviceClient.getModel("dtmi:com:example:GenericRam;1");
console.log("Model exists:", model3);
const model4 =await serviceClient.getModel( "dtmi:com:example:GenericPC;1");
console.log("Model exists:", model4);
const model5 =await serviceClient.getModel( "dtmi:com:example:GenericCpu;1");
console.log("Model exists:", model5);
const model6 =await serviceClient.getModel("dtmi:com:example:GenericBattery;1");
console.log("Model exists:", model6);
const model7 =await serviceClient.getModel("dtmi:com:example:GenericMemory;1");
console.log("Model exists:", model7);
const model8 =await serviceClient.getModel("dtmi:com:example:GenericGraphicCard;1");
console.log("Model exists:", model8);
si.cpu()
.then(data => {
  const manufacturer=data.manufacturer;
  const brand=data.brand;
  const frequency= data.speed;
  const cores=data.cores;
  const physicalCores=data.physicalCores;
  console.log('- manufacturer: ' + data.manufacturer);
  console.log('- brand: ' + data.brand);
  console.log('- speed: ' + data.speed);
  console.log('- cores: ' + data.cores);
  console.log('- physical cores: ' + data.physicalCores);
  console.log('...');
})
.catch(error => console.error(error));

  si.cpuTemperature().then(data =>{ 
    const tempMax=data.max;
    console.log("temperatura massima:"+data.max)});

    
si.fsSize()
  .then(data => {
    // Seleziona il primo disco nel caso ci siano più dischi
    const disk = data[0];

    // Stampa le informazioni sul disco totale e utilizzato
    const diskSizeGB = convertToGB(disk.size);
    const diskUsedGB = convertToGB(disk.used);

    console.log(`Dimensione totale del disco: ${diskSizeGB} GB`);
    console.log(`Spazio utilizzato sul disco: ${diskUsedGB} GB`);
  })
  .catch(error => {
    console.error(error);
  });

  si.mem()
  .then(data => {
    const ramTotal=convertToGB(data.total);
    const ramAvailable=convertToGB(data.available);
    const ramUsed=convertToGB(data.used);
  })
  .catch(error => {
    console.error("Errore durante il recupero delle informazioni sulla RAM:", error);
  });


const MySmartphoneTwin = {
    $dtId: smartphoneTwinId,
    $metadata: {
      $model: "dtmi:com:example:GenericSmartphone;1"
    },
    GenericBattery:{
      $metadata: {},
      batteryLevel:0
    },
    GenericRam:{
      $metadata: {},
      size:8
    },
    GenericMemory:{
      $metadata: {},
      diskSpace:32
    },
    GenericCpu:{
      $metadata: {},
      frequency:4.5
    }
};

const createdTwinSmartphone = await serviceClient.upsertDigitalTwin(smartphoneTwinId, JSON.stringify(MySmartphoneTwin));
console.log("Created Digital Twin:");
console.log(inspect(createdTwinSmartphone));

const MyPCTwin = {
    $dtId: pcTwinId,
    $metadata: {
      $model: "dtmi:com:example:GenericPC;1"
    },
    GenericRam:{
      $metadata: {},
      size:16
    },
    GenericMemory:{
      $metadata: {},
      diskSpace:128
    },
    GenericCpu:{
      $metadata: {},
      frequency:5.5
    },
    GenericGraphicCard:{
      $metadata: {},
      size:6
    }
};

const createdTwinPC = await serviceClient.upsertDigitalTwin(pcTwinId, JSON.stringify(MyPCTwin));
console.log("Created Digital Twin:");
console.log(inspect(createdTwinPC));



}
*/
main()