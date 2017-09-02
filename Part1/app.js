var express = require('express');

var app = express();
var serv = require('http').Server(app);


app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(process.env.PORT || 2000);
console.log("Server started.");

//this is where we will store all the players in the client,
// which is connected to the server
var player_lst = [];

// A player “class”, which will be stored inside player list 
var Player = function (startX, startY, startAngle) {
  var x = startX
  var y = startY
  var angle = startAngle
}

//onNewplayer function is called whenever a server gets a message “new_player” from the client
function onNewplayer (data) {
	//form a new player object 
	var newPlayer = new Player(data.x, data.y, data.angle);
	console.log("created new player with id " + this.id);
	player_lst.push(newPlayer); 

}


 // io connection 
var io = require('socket.io')(serv,{});

io.sockets.on('connection', function(socket){
	console.log("socket connected"); 

	//Listen to the message “new_player’ from the client
	socket.on("new_player", onNewplayer);
});