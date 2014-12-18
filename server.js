var http = require('http');
var fs = require('fs');
var httpServer = http.createServer(requestHandler);
var url = require('url');

httpServer.listen(3000);
console.log("Listening on 3000");

var fishModel=[];
var currFishModel;
var IPHONE_FISH = 0;
var ANDROID_FISH = 1;

// =================== HTTP SERVER ====================
function requestHandler(req,res){

  var parsedUrl = url.parse(req.url);
  console.log("The request is " + parsedUrl.pathname);

  var readUrl = parsedUrl.pathname;
  if (readUrl == '/'){
    readUrl = '/fish.html';
  }

  fs.readFile(__dirname + readUrl, 
    function (err, data){
      if (err){
        res.writeHead(500);
        return res.end('Error loading '+parsedUrl.pathname);
      }
      res.writeHead(200);
      res.end(data);
    }
  );

  if (readUrl == '/fish.html'){
    if (req.headers['user-agent'].match(/iphone/i)) {
      console.log("It's an iphone"); 
      currFishModel = IPHONE_FISH;
    } else if (req.headers['user-agent'].match(/android/i)) {
      console.log("It's an android");
      currFishModel = ANDROID_FISH;
    } else if (req.headers['user-agent'].match(/windows/i)) {
      console.log("It's a windows phone! Probably won't work...");
      currFishModel = ANDROID_FISH;
    } else {
      console.log("It's probably a mac. Should use a mobile device!");
    }    
  }

}

// ==================== SOCKET.IO =====================
var allFish = [];
var io = require('socket.io').listen(httpServer);

// GAME FLOW
var GAME_WAIT = 0;
var GAME_CANSTART = 1;
var GAME_RUNNING = 2;
var GAME_END = 3;
var gameState = 99999999;

var controllerLocked = false;
var controller;

io.sockets.on('connection',
  function(socket){

    /*----------- Confirm identity from pool page--------*/
    socket.on('iamcontroller',function(){
      console.log("iamcontroller run");
      if (controllerLocked == false){
        console.log(allFish.length+" fish to be annihilated... :( ");
        controllerLocked = true;
        controller = socket;
        //Game flow
        gameState = GAME_WAIT;
        socket.emit("newgamestate",GAME_WAIT);
        //DISCONNECT ALL FISH AT START OF CONTROLLER
        for (i=allFish.length;i>0;i--){
          allFish[i-1].disconnect();
        }
      } else {
        socket.emit("duplicateController");
      }
      // if pool page disconnects, all fish disconnect
    });
    /*---------------------------------------------------*/

    /*----------- Confirm identity from fish page--------*/
    socket.on('iamfish', function(){    
      console.log("i am a fish: "+socket.id+". "+allFish.length);

      if (allFish.length < 4 && controllerLocked && (gameState == GAME_WAIT || gameState == GAME_CANSTART)){
        // Add to players array
        socket.totalDist = 0;
        allFish.push(socket);
        fishModel.push(currFishModel);
        console.log("server: sure you are fish. "+allFish.length);

        /*check game state FOR SOME REASON IT"S NOT EMITTING EVEN THO IT"S RUNNING THIS SNIPPET D: D:
        if (allFish.length == 4){
          gameState = GAME_CANSTART;
          console.log(gameState);          
          socket.emit("newgamestate",gameState);
        } */

        // Assign color
        var red = Math.floor(Math.random()*155)+100;
        var green = Math.floor(Math.random()*155)+100;
        var blue = Math.floor(Math.random()*155)+100;
        var color = "rgba("+red+","+green+","+blue+",1)";
        socket.emit("appearance",color); //fish.html
        socket.emit("whichPhone",fishModel[fishModel.length-1]); // 1=ANDROID; 0=IPHONE
        socket.broadcast.emit("enterRace", color,socket.id); //pool.html
      } else {
        console.log("actually you are not");
        socket.emit("younotfish");
      }      
    });

    socket.on('iamphone',function(msg) {
      console.log(msg);
    });

    socket.on("newgamestate", function(newGameState){
      gameState = newGameState;
      console.log("new game state received! "+newGameState);
      console.log("allFish counts "+allFish.length+" fish");
    });
    /*----------------------------------------------------*/

    socket.on('move',
      function (send) {
        for (var i=0; i<allFish.length; i++){
          if (allFish[i]===socket && gameState == GAME_RUNNING){
            allFish[i].totalDist += 7*send;
            // console.log(i+" "+allFish[i].totalDist);
            socket.broadcast.emit("updateRace",allFish[i].totalDist,allFish[i].id);
            break; 
          }
        }
      }
    );

    socket.on('pivot',function(pivotval){
      // console.log('sending pivot '+pivotval);
      controller.emit("pivotpool",socket.id, pivotval);
    });

    socket.on('fishrank',function(socketid,rank){
      for (var i=0;i<allFish.length;i++){
        if (allFish[i].id == socketid){
          allFish[i].emit('fishrankfish',rank);
        }
      }
    });

// ask Shawn: at disconnect how to know which fish to take out??
    socket.on('disconnect',
      function () {
        console.log(socket.id+" disconnected");
        // check if need another controller
        if (controller==socket){
          controllerLocked = false;
        }

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