const { DefaultAzureCredential } = require("@azure/identity");
const { DigitalTwinsClient } = require("@azure/digital-twins-core");
const si = require('systeminformation');
const { inspect } = require("util");
const useragent = require('useragent');
const os = require('os');

let idMobile="";
let gyroscopeValues = [];
let batteryPerc=0;
let proximityValue="";

const url = "https://GenericDTDevice.api.weu.digitaltwins.azure.net";
const credential = new DefaultAzureCredential();
const serviceClient = new DigitalTwinsClient(url, credential);
 

function convertToGB(bytes) { //funzione di conversione in GB per la memoria
  return (bytes / 1024 / 1024 / 1024).toFixed(2);
}


function getRam() { //funzione per ram totale e disponibile
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

function getMemory(){ //funzione per ritornare valori della memoria
  return new Promise((resolve, reject) => {
  si.fsSize()
  .then(data => {
    const disk = data[0]; // Seleziona il primo disco nel caso ci siano più dischi
    const diskSizeGB = convertToGB(disk.size);
    let diskUsedGB = convertToGB(disk.used);
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

function getCpu(){ //funzione per ritornare vari campi della cpu
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

function getCpuLoad(){ //funzione per ritornare l'attuale carico della cpu (potrebbe non funzionare su tutti gli smartphone)
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
     
      if(idMobile!=""){

      MyTwinObject = {
        $dtId: idMobile, //è univoco per ogni dispositivo
        $metadata: {
          $model: "dtmi:com:example:GenericSmartphone;1"
        },
        idDevice: idMobile,
        name: modelName.model,
        os: operatingSystem,
        GenericRam:{
          $metadata: {},
          size:parseInt(ram.ramTotal)!= null ?parseInt(ram.ramTotal) : 0,
          ramUsage:parseFloat(ram.ramUsage)!=null?parseFloat(ram.ramUsage):0
        },
        GenericMemory:{
          $metadata: {},
          diskSpace:parseInt(memory.diskSizeGB)!=null?parseInt(memory.diskSizeGB):0,
          memoryUsage:parseFloat(memory.diskUsedGB)!=null?parseFloat(memory.diskUsedGB):0
        },
        GenericCpu:{
          $metadata: {},
          frequency:cpu.frequency!= null ?cpu.frequency : 0,
          coreNumber:cpu.cores!= null ?cpu.cores : 0,
          physicalCoreNumber: cpu.physicalCores!= null ?cpu.physicalCores : 0 ,
          manufacturer: cpu.manufacturer,
          brand: cpu.brand,
          cpuUsage: cpuLoad.load (cpuLoad.load !== null && cpuLoad.load !== "") ? cpuLoad.load : 0,  
          temperature: parseInt(cpuTemp.tempMax) != null ? parseInt(cpuTemp.tempMax) : 0
        },
        GenericBattery:{
         $metadata: {},
         batteryLevel: batteryPerc != null ?batteryPerc : 0
        },
        GenericGyroscope:{
        $metadata:{},
        xPosition:gyroscopeValues[0], 
        yPosition:gyroscopeValues[1],
        zPosition:gyroscopeValues[2]
        },
        GenericProximitySensor:{
        $metadata:{},
        DevicePosition:proximityValue!= null ? proximityValue : ""
        }       
    };
  
   
    console.log("DigitalTwin da inviare:"+JSON.stringify(MyTwinObject))
    const createdTwin = await serviceClient.upsertDigitalTwin(idMobile, JSON.stringify(MyTwinObject));//upsert del DT
    console.log("Created Digital Twin:");
    console.log(inspect(createdTwin));
          console.log("Telemetry updated in Azure Digital Twin successfully.");
      
        }} catch (error) {
          console.error("Failed to update telemetry in Azure Digital Twin:", error);
        }

      }, 5000);
    }
  //};

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

async function main(){
await upsertDigitalTwinFunc(); 
}


const WebSocket = require('ws'); //creazione server websocket per ricevere dati inviati da Android Studio relativi a sensore di prossimità, giroscopio e livello di batteria
const server = new WebSocket.Server({ port: 8080 });

server.on('connection', (socket) => {
    console.log('Client connected');

    socket.on('message', (message) => {
        const parsedMessage = JSON.parse(message);
        
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
    });
    socket.on('close', () => {
        console.log('Client disconnected');
    });
});

main()
