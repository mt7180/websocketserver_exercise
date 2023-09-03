// Node-Server serverseitig starten mit: node index.js

const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const mongoose = require('mongoose');

const config = require('./config');

const { mongo: { hoststring, user, db, mongoPassword } } = config;
const COLLECTION = "ip-adresses";
const uri = `mongodb://${user}:${encodeURIComponent(mongoPassword)}@${hostString}`;

//###########################
// globale vars:
const MESSAGE_TYPES = {
  TIME: 0,
  GLOBAL_COUNTER: 1,
  IP_ADDRESSES: 2,
};
var globalCounter = 0;
var numberOfStoredIPs = 0;
var ipCollection;

//###########################

const EntrySchema = new mongoose.Schema({
  ipId: Number,
  socketId: String, 
  ip: String,
  start: String,
  end: String,
}, {collection: COLLECTION});

const Entry = mongoose.model('Entry', EntrySchema);
// Connect to mongoDB
db = mongoose.connect(uri);
ipCollection = mongoose.connection.collection(COLLECTION);

mongoose.connection.once('open', async () => {
  console.log('DB connected!');

  await Entry.countDocuments({}).then(function (count) {
    console.log("Count :", count);
    numberOfStoredIPs = count;
  });

});

app.use(express.static('public'));

io.on('connection', async (socket) => {
  let now = new Date();
  console.log("client connected... " + socket.handshake.address + ' ' + now );
    
  await saveToDB({
    socketId: socket.id,
    ip: socket.handshake.address, 
    start: new Date().toISOString(),
    end: null,
  });
  
  const results = await getAllIPs();
  io.emit('message',{
    type: MESSAGE_TYPES.IP_ADDRESSES,
    data: results
  })
  
  socket.on('message', (message) => {
      switch (message.type) {
        case MESSAGE_TYPES.TIME:
          handleTimeButtonClick(socket);
          break;
        case MESSAGE_TYPES.GLOBAL_COUNTER:
          handleIncrementCounter()
          break;
        default:
          console.error(`Unrecognized message type 1: ${parsedMessage.type}`);
      }
  });

  socket.emit('message',{
    type: MESSAGE_TYPES.GLOBAL_COUNTER,
    data: globalCounter 
  });

  socket.on('disconnect', async () => {
    //  console.log('in disconnect');
      await updateRecordLeavingTime(socket.id, new Date());
      let updatedIpList = await getAllIPs();
      io.emit('message',{
          type: MESSAGE_TYPES.IP_ADDRESSES,
          data: updatedIpList,
      })
  });

});
     
const port = process.env.PORT || 3000;
server.listen(port, async () => {
  console.log(`Server listening at ${port}`);
});

function handleTimeButtonClick(socket){
  let timestamp = new Date();
  const response = {
      type: MESSAGE_TYPES.TIME,
      data: timestamp.toLocaleTimeString("de-DE", {timeZone:'Europe/Berlin'})
  };
  socket.emit('message',(response));
}

function handleIncrementCounter(){
  globalCounter++;
  io.emit('message',{
      type: MESSAGE_TYPES.GLOBAL_COUNTER,
      data: globalCounter
  })
}

async function saveToDB(obj){
  // console.log('in saveToDB '+numberOfStoredIPs);
  
  if(numberOfStoredIPs >= 10){
    if (numberOfStoredIPs === 20) numberOfStoredIPs = 10;
    let id = numberOfStoredIPs % 10;
    console.log("id " + id);
    await Entry.updateOne(
      {ipId: id},
      {$set:{
        socketId: obj.socketId,
        ip: obj.ip.slice(0,-1) + 'X',
        start: obj.start,
        end: obj.end,
      }
    });
  } else {
    const entry = new Entry({
      ipId: numberOfStoredIPs,
      socketId: obj.socketId,
      ip: obj.ip.slice(0,-1) + 'X', 
      start: obj.start, 
      end:obj.end,
    });
    await entry.save();
  }
  numberOfStoredIPs++;
 }

 async function getAllIPs(){
  // console.log('in getAllIps ');
  const results = await Entry.find({});
  for(let res of results) console.log('result: '+JSON.stringify(res));
  return results;  
 }

async function updateRecordLeavingTime(leavingSocketId, now){
  // console.log('in update ');
  await Entry.updateOne(
    {socketId: leavingSocketId,},
    {$set:{
      end: now.toISOString()}
  }).catch(function (err) {
    console.log(err);
  });
}




