var http = require('http');
var fs = require('fs');
var httpServer = http.createServer(requestHandler);
var url = require('url');

httpServer.listen(3000);
console.log("Listening on 3000");

// =================== HTTP SERVER ====================
function requestHandler(req,res){
  
  var parsedUrl = url.parse(req.url);
  console.log("The request is " + parsedUrl.pathname);

  var readUrl = parsedUrl.pathname;
  if (readUrl == '/'){
    readUrl = '/index.html';
  }

  fs.readFile(__dirname + parsedUrl.pathname, 
    function (err, data){
      if (err){
        res.writeHead(500);
        return res.end('Error loading '+parsedUrl.pathname);
      }
      res.writeHead(200);
      res.end(data);
    }
  );
}

// ==================== SOCKET.IO =====================
var allSockets = [];
var appearance = [];
var io = require('socket.io').listen(httpServer);

io.sockets.on('connection',
  function(socket){
    console.log("New client. " + socket.id);
    socket.totalDist = 0;
    allSockets.push(socket);
    var red = Math.floor(Math.random()*255);
    var green = Math.floor(Math.random()*255);
    var blue = Math.floor(Math.random()*255);
    var color = "rgba("+red+","+green+","+blue+",1)";
    console.log(color);
    appearance.push(color);
    allSockets[allSockets.length-1].emit("appearance",color);

    socket.broadcast.emit("enterRace", color,socket.id);

    socket.on('numbers',
      function (currDist) {
        console.log("currDist: "+currDist);
        for (var i=0; i<allSockets.length; i++){
          if (allSockets[i]===socket){
            allSockets[i].totalDist += currDist;
            socket.broadcast.emit("updateRace",totalDist,allSockets[i].id);
            break; // leave for the for loop
          }
        }
      }
    );

    socket.on('disconnect',
      function (socket) {
        console.log("Disconnected " + socket.id);
        for (var i=0; i<allSockets.length; i++){
          if (allSockets[i]===socket){
            allSockets.splice(i,1); //splice = the javascript way of erasing things from an array
            break; // leave for the for loop
          }
        }
      }
    );

  }
);