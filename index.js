const { DefaultAzureCredential } = require("@azure/identity");
const { DigitalTwinsClient } = require("@azure/digital-twins-core");
const si = require('systeminformation');
const { inspect } = require("util");
const useragent = require('useragent');
const os = require('os');




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



async function upsertDigitalTwinFunc(){
  'use strict';

const Protocol = require('azure-iot-device-mqtt').Mqtt;
const Client = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;
//var deviceIpInfo= getDeviceNetInfo()
var connectionString = "HostName=hubIndustrialInfProjectDTDevice.azure-devices.net;DeviceId="+"pcId"+";SharedAccessKey=YVX111rYT/iNQsZz8a532IhQT9sOy+hzAnQTpmgxnyw=";
let idTwin;
let MyTwinObject;
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
      var modelName= await getModel()
      var operatingSystem = os.platform();
     // var deviceIpInfo= getDeviceNetInfo()

      //var network=await getDevicesConnected()
 
      //var graphiccard= await getGraphicCard()
      idTwin="test"


      //idTwin=calculateHash(deviceIpInfo.deviceMAC);
      const iothub = require('azure-iothub');

    
      const connectionString = 'HostName=hubIndustrialInfProjectDTDevice.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=LZYmO5wFi/VWV1R/Vi7JWd+oDo1mcAdBAQmSChPwmp4=';

      // Crea un nuovo dispositivo IoT
      const registry = iothub.Registry.fromConnectionString(connectionString);

      var device = {
        deviceId: idTwin
        
        };

      registry.create(device, function(err, deviceInfo, res) {
        if (err) console.log(' error: ' + err.toString());
        if (res) console.log(' status: ' + res.statusCode + ' ' + res.statusMessage);
        if (deviceInfo) console.log(' device info: ' + JSON.stringify(deviceInfo));
    });

      console.log("dentroPCTwin+"+idTwin)
      MyTwinObject = {
        $dtId: idTwin,
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
          size:0,
          name:""
        },
        GenericNetworkInfo:{
          $metadata: {},
          ipAddress:"",
          MacAddress:"",
          connectedDevices:"",
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

        
          
          var data = JSON.stringify({ "Id": idTwin});
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



await upsertDigitalTwinFunc(); //qui dentro

}


function calculateHash(input) {
  const crypto = require('crypto');
  const sha256Hash = crypto.createHash('sha256');
  sha256Hash.update(input);
  return sha256Hash.digest('hex');
}


main()
