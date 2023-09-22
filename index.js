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
 
const smartphoneTwinId="smartphoneId";

function convertToGB(bytes) {
  return (bytes / 1024 / 1024 / 1024).toFixed(2);
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
     
      if(idMobile!=""){

      MyTwinObject = {
        $dtId: idMobile,
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
  
   
    console.log("twinid:"+JSON.stringify(MyTwinObject))

      console.log("twinidddd:"+idMobile)
    const createdTwin = await serviceClient.upsertDigitalTwin(idMobile, JSON.stringify(MyTwinObject));
    console.log("Created Digital Twin:");
    console.log(inspect(createdTwin));
          console.log("Telemetry updated in Azure Digital Twin successfully.");
      
        }} catch (error) {
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



await upsertDigitalTwinFunc(); //qui dentro

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
        

     
    });

    // Gestisci la chiusura della connessione
    socket.on('close', () => {
        console.log('Client disconnected');
    });
});

main()
