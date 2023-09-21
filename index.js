const { DefaultAzureCredential } = require("@azure/identity");
const { DigitalTwinsClient } = require("@azure/digital-twins-core");
const si = require('systeminformation');
const { inspect } = require("util");
const useragent = require('useragent');
const os = require('os');


const gyroscopeValues = [];
const batteryPerc=0;
const proximityValue="";

const url = "https://GenericDTDevice.api.weu.digitaltwins.azure.net";
const credential = new DefaultAzureCredential();
const serviceClient = new DigitalTwinsClient(url, credential);
 
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







async function upsertDigitalTwinFunc(){
  'use strict';

let idTwin;
let MyTwinObject;
 
      
      setInterval(async function(){
      try{
      var ram=await getRam(); 
      var cpu=await getCpu();
      var cpuTemp=await getCpuTemperature();
      var cpuLoad=await getCpuLoad();
      var memory=await getMemory();
      var modelName= await getModel()
      var operatingSystem = os.platform();
     

      idTwin=calculateHash(deviceIpInfo.deviceMAC);

      MyTwinObject = {
        $dtId: idTwin,
        $metadata: {
          $model: "dtmi:com:example:GenericPC;1"
        },
        idDevice: idTwin,
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
        GenericBattery:{
         $metadata: {},
         batteryLevel: batteryPerc
        },
        GenericGyroscope:{
        $metadata:{},
        xPosition:gyroscopeValues[0],
        yPosition:gyroscopeValues[1],
        zPosition:gyroscopeValues[2]
        },
        GenericProximitySensor:{
        $metadata:{},
        DevicePosition:proximityValue
        }
         
  
      
    
        
    };
  
   
    console.log("twinid:"+JSON.stringify(MyTwinObject))
    const createdTwin = await serviceClient.upsertDigitalTwin(idTwin, JSON.stringify(MyTwinObject));
    console.log("Created Digital Twin:");
    console.log(inspect(createdTwin));
          console.log("Telemetry updated in Azure Digital Twin successfully.");

        } catch (error) {
          console.error("Failed to update telemetry in Azure Digital Twin:", error);
        }

      }, 5000);
    }
  //};

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
/*
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



//await upsertDigitalTwinFunc(); //qui dentro

}



function calculateHash(input) {
  const crypto = require('crypto');
  const sha256Hash = crypto.createHash('sha256');
  sha256Hash.update(input);
  return sha256Hash.digest('hex');
}
const WebSocket = require('ws');

// Crea un server WebSocket sulla porta desiderata
const server = new WebSocket.Server({ port: 8080 });

// Gestisci la connessione dei client
server.on('connection', (socket) => {
    console.log('Client connected');

    // Gestisci i messaggi in arrivo dal client
    socket.on('message', (message) => {
        const parsedMessage = JSON.parse(message);
        
        // Ora puoi accedere ai dati all'interno del messaggio come oggetto JavaScript
        console.log("ID:", parsedMessage.id);
        idMobile=parsedMessage.id
        gyroscopeValues = [
          parsedMessage.gyroscope.r0,
          parsedMessage.gyroscope.r1,
          parsedMessage.gyroscope.r2
        ];
        console.log("Gyroscope r0:", parsedMessage.gyroscope.r0);
        console.log("Gyroscope r1:", parsedMessage.gyroscope.r1);
        console.log("Gyroscope r2:", parsedMessage.gyroscope.r2);
        proximityValue=parsedMessage.proximityValue;
        console.log("Proximity Value:", parsedMessage.proximityValue);
        batteryPerc=parsedMessage.battery;
        console.log("Battery:", parsedMessage.battery);
        float 

     
    });

    // Gestisci la chiusura della connessione
    socket.on('close', () => {
        console.log('Client disconnected');
    });
});

main()
