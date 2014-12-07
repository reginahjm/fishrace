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
var allFish = [];
var appearance = [];
var io = require('socket.io').listen(httpServer);

var raceStarted = false;

io.sockets.on('connection',
  function(socket){

    socket.on('iamfish', function(){
      console.log("i am a fish: "+socket.id+". "+allFish.length);
      if (allFish.length < 4 && raceStarted == false){
        console.log("server: sure you are fish");
        allFish.push(socket);
        socket.totalDist = 0;
        var red = Math.floor(Math.random()*255);
        var green = Math.floor(Math.random()*255);
        var blue = Math.floor(Math.random()*255);
        var color = "rgba("+red+","+green+","+blue+",1)";
        console.log(color);
        appearance.push(color);
        socket.emit("appearance",color); //fish.html
        socket.broadcast.emit("enterRace", color,socket.id); //pool.html
      } else {
        console.log("actually you are not");
        socket.emit("younotfish");
      }

      if (allFish.length == 4){
        raceStarted = false;
      }
    });

    socket.on('move',
      function () {
        for (var i=0; i<allFish.length; i++){
          if (allFish[i]===socket){
            allFish[i].totalDist += 5;
            console.log(i+" "+allFish[i].totalDist);
            socket.broadcast.emit("updateRace",allFish[i].totalDist,allFish[i].id);
            break; 
          }
        }
      }
    );

// ask Shawn: at disconnect how to know which fish to take out??
    socket.on('disconnect',
      function () {
        for (var i=0; i<allFish.length; i++){
          if (allFish[i]===socket){
            // update fish count on server side.
            var howmanyleft = allFish.length-1;
            console.log("Disconnected " + socket.id + ". "+howmanyleft+" fish left.");
            // take out fish sprite in pool
            socket.broadcast.emit("takeoutFish",allFish[i].id);
            allFish.splice(i,1); 
            break; 
          }
        }
      }
    );

  }
);