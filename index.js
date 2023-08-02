const { DefaultAzureCredential } = require("@azure/identity");
const { DigitalTwinsClient } = require("@azure/digital-twins-core");
const si = require('systeminformation');
const { inspect } = require("util");
const useragent = require('useragent');
const os = require('os');

const network = require('network');
const getmac = require('getmac');

function getDeviceNetInfo() {
  return new Promise((resolve, reject) => {
    network.get_private_ip((err, ip) => {
      if (err) {
        reject(err);
      } else {
        getmac.getMac((err, mac) => {
          if (err) {
            reject(err);
          } else {
            resolve({ ip, mac });
          }
        });
      }
    });
  });
}



const url = "https://GenericDTDevice.api.weu.digitaltwins.azure.net";
const credential = new DefaultAzureCredential();
const serviceClient = new DigitalTwinsClient(url, credential);

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


async function upsertDigitalTwinFunc(deviceType){
  'use strict';

const Protocol = require('azure-iot-device-mqtt').Mqtt;
const Client = require('azure-iot-device').Client;
var Message = require('azure-iot-device').Message;
//var deviceIpInfo= getDeviceNetInfo()
var connectionString = "HostName=hubIndustrialInfProjectDTDevice.azure-devices.net;DeviceId="+"pcId"+";SharedAccessKey=YVX111rYT/iNQsZz8a532IhQT9sOy+hzAnQTpmgxnyw=";

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
     // var deviceIpInfo= getDeviceNetInfo()
      //var graphiccard= await getGraphicCard()
      var modelName= await getModel()
      var operatingSystem = os.platform();



      console.log("MEMORYDISKSIZE################"+deviceType);
     // const idTwin=calculateHash(deviceIpInfo.deviceMAC);
      
     // console.log("dentroPCTwin+"+idTwin)
      const MyPCTwin = {
        $dtId: "smartphone",
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
        }/*
        GenericGraphicCard:{
          $metadata: {},
          size:graphiccard.memory,
          name:graphiccard.model
        }
        GenericNetworkInfo:{
          $metadata: {},
          ipAddress:deviceIpInfo.deviceIP,
          MacAddress:deviceIpInfo.deviceMAC,
          connectedDevices:JSON.stringify(network.devices),
        }
        */
    };
  
   
    console.log("twinid:"+JSON.stringify(MyPCTwin))
    const createdTwinPC = await serviceClient.upsertDigitalTwin("smartphone", JSON.stringify(MyPCTwin));
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

/*
function getDeviceNetInfo(){

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

*/

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
*/
/*
  const newModels = [battery,cpu,device,graphiccard,pc,memory,ram,smartphone,networkinfo,gyroscope];
  const model = await serviceClient.createModels(newModels);
  console.log("Created Model:");
  console.log(inspect(model));
*/
//upsertDigitalTwinFunc("pcId");

// Esegui la scansione ARP
// Using a transpiler
// Esempio di utilizzo
getDeviceNetInfo()
  .then((data) => {
    console.log('IP Address:', data.ip);
    console.log('MAC Address:', data.mac);
  })
  .catch((error) => {
    console.error('Error:', error.message);
  });


sendHttpRequest()
  .then(async (data) => {
    await upsertDigitalTwinFunc(data); //qui dentro
  })
  .catch((error) => {
    console.error(error.message);
  });

}


const express = require('express');


const app = express();
const port = 3000;
const axios = require('axios');
const { createHash } = require("crypto");

app.get('/', (req, res) => {
  const userAgentString = req.headers['user-agent'];
  const userAgent = useragent.parse(userAgentString);

  const isAndroid = userAgent.os.family === 'Android';
  const isIPhone = userAgent.device.family === 'iPhone';
  const isWindowsPhone = userAgent.os.family === 'Windows Phone';
  const isDesktop = !isAndroid && !isIPhone && !isWindowsPhone;

  // Aggiungi condizioni per il riconoscimento di tablet e iPad
  const isTablet = userAgent.device.family === 'iPad' || userAgent.device.family === 'tablet';

  if (isAndroid) {
    res.send('Android');
  } else if (isIPhone) {
    res.send('iPhone');
  } else if (isWindowsPhone) {
    res.send('WindowsPhone');
  } else if (isDesktop) {
    res.send('PC');
  } else if (isTablet) {
    res.send('Tablet');
  } else {
    res.send('sconosciuto');
  }
});

app.listen(port, () => {
  console.log(`Server in ascolto sulla porta ${port}`);
});

// Funzione per inviare una richiesta HTTP al server Express.js
function sendHttpRequest() {
  return axios.get('http://localhost:3000')
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      throw new Error('Errore nella richiesta:' + error.message);
    });
}

function calculateHash(input) {
  const crypto = require('crypto');
  const sha256Hash = crypto.createHash('sha256');
  sha256Hash.update(input);
  return sha256Hash.digest('hex');
}


main()