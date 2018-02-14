var express = require('express');
//require p2 physics library in the server.
var p2 = require('p2'); 
//get the node-uuid package for creating unique id
var unique = require('node-uuid')

var app = express();
var serv = require('http').Server(app);
//get the functions required to move players in the server.
var physicsPlayer = require('./server/physics/playermovement.js');

app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));

serv.listen(process.env.PORT || 2000);
console.log("Server started.");

var room_List = {};

function game() {
	this.room_id;
	this.player_lst = [];
	this.max_num = 2;
}

//needed for physics update 
var startTime = (new Date).getTime();
var lastTime;
var timeStep= 1/70; 

//the physics world in the server. This is where all the physics happens. 
//we set gravity to 0 since we are just following mouse pointers.
var world = new p2.World({
  gravity : [0,0]
});

//a player class in the server
var Player = function (startX, startY, startAngle) {
  this.x = startX
  this.y = startY
  this.angle = startAngle
  this.speed = 500;
  //We need to intilaize with true.
  this.sendData = true;
}

//We call physics handler 60fps. The physics is calculated here. 
setInterval(heartbeat, 1000/60);

//Steps the physics world. 
function physics_hanlder() {
	var currentTime = (new Date).getTime();
	timeElapsed = currentTime - startTime;
	var dt = lastTime ? (timeElapsed - lastTime) / 1000 : 0;
    dt = Math.min(1 / 10, dt);
    world.step(timeStep);
}


function heartbeat () {
	
	for (var key in room_List) {
		var room = room_List[key];
	}
	//physics stepping. We moved this into heartbeat
	physics_hanlder();
}


// when a new player connects, we make a new instance of the player object,
// and send a new player message to the client. 
function onNewplayer (data) {
	//new player instance
	var newPlayer = new Player(data.x, data.y, data.angle);
	var room_id = find_Roomid(); 
	var room = room_List[room_id]; 
	
	//join the room; 
	this.room_id = room_id;
	//join the room
	this.join(this.room_id);
	
	//create an instance of player body 
	playerBody = new p2.Body ({
		mass: 0,
		position: [0,0],
		fixedRotation: true
	});
	
	//add the playerbody into the player object 
	newPlayer.playerBody = playerBody;
	world.addBody(newPlayer.playerBody);
	
	console.log("created new player with id " + this.id);
	newPlayer.id = this.id; 	
	
	//information to be sent to all clients except sender
	var current_info = {
		id: newPlayer.id, 
		x: newPlayer.x,
		y: newPlayer.y,
		angle: newPlayer.angle,
	}; 
	
	var player_lst = room_List[this.room_id].player_lst;
	console.log(player_lst);
	//send to the new player about everyone who is already connected. 	
	for (i = 0; i < player_lst.length; i++) {
		existingPlayer = player_lst[i];
		var player_info = {
			id: existingPlayer.id,
			x: existingPlayer.x,
			y: existingPlayer.y, 
			angle: existingPlayer.angle,			
		};
		console.log("pushing player");
		console.log(player_info);
		//send message to the sender-client only
		this.emit("new_enemyPlayer", player_info);
	}
	
	//send message to every connected client except the sender
	this.broadcast.to(room_id).emit('new_enemyPlayer', current_info);
	room.player_lst.push(newPlayer);
}

//instead of listening to player positions, we listen to user inputs 
function onInputFired (data) {
	var movePlayer = find_playerid(this.room_id, this.id); 
	
	
	if (!movePlayer || movePlayer.dead) {
		return;
		console.log('no player'); 
	}

	//when sendData is true, we send the data back to client. 
	if (!movePlayer.sendData) {
		return;
	}
	
	//every 50ms, we send the data. 
	setTimeout(function() {movePlayer.sendData = true}, 50);
	//we set sendData to false when we send the data. 
	movePlayer.sendData = false;
	
	//Make a new pointer with the new inputs from the client. 
	//contains player positions in server
	var serverPointer = {
		x: data.pointer_x,
		y: data.pointer_y,
		worldX: data.pointer_worldx, 		
		worldY: data.pointer_worldy
	}
	
	//moving the player to the new inputs from the player
	if (physicsPlayer.distanceToPointer(movePlayer, serverPointer) <= 30) {
		movePlayer.playerBody.angle = physicsPlayer.movetoPointer(movePlayer, 0, serverPointer, 1000);
	} else {
		movePlayer.playerBody.angle = physicsPlayer.movetoPointer(movePlayer, movePlayer.speed, serverPointer);	
	}
	
	movePlayer.x = movePlayer.playerBody.position[0]; 
	movePlayer.y = movePlayer.playerBody.position[1];
	
	//new player position to be sent back to client. 
	var info = {
		x: movePlayer.playerBody.position[0],
		y: movePlayer.playerBody.position[1],
		angle: movePlayer.playerBody.angle
	}

	//send to sender (not to every clients). 
	this.emit('input_recieved', info);
	
	//data to be sent back to everyone except sender 
	var moveplayerData = {
		id: movePlayer.id, 
		x: movePlayer.playerBody.position[0],
		y: movePlayer.playerBody.position[1],
		angle: movePlayer.playerBody.angle,
		size: movePlayer.size
	}
	
	//send to everyone except sender 
	this.broadcast.to(this.room_id).emit('enemy_move', moveplayerData);
}

//call when a client disconnects and tell the clients except sender to remove the disconnected player
function onClientdisconnect() {
	var removePlayer = find_playerid(this.room_id, this.id); 
	
	var player_lst = room_List[this.room_id].player_lst;
	if (removePlayer) {
		player_lst.splice(player_lst.indexOf(removePlayer), 1);
	}
	
	//delete the room if there is no player.
	if (player_lst.length <= 0) {
		delete room_List[this.room_id];
	}
	
	
	//send message to every connected client except the sender
	this.broadcast.to(this.room_id).emit('remove_player', {id: this.id});
	
}

// find player by the the unique socket id 
//we need the room id to find the player
function find_playerid(room_id, id) {
	var player_lst = room_List[room_id].player_lst;
	for (var i = 0; i < player_lst.length; i++) {

		if (player_lst[i].id == id) {
			return player_lst[i]; 
		}
	}
	
	return false; 
}

function find_Roomid() {
	for (var key in room_List) {
		var room = room_List[key];
		if (room.player_lst.length < room.max_num) {
			console.log(room.max_num);
			console.log(room.player_lst.length);
			return key;
		}
	}
	
	//did not find a room. create an extra room;
	var room_id = create_Room();
	return room_id;
}

function create_Room() {
	//create new room id;
	var new_roomid = unique.v4();
	//create a new room object
	var new_game = new game();
	new_game.room_id = new_roomid;
	
	room_List[new_roomid] = new_game; 
	return new_roomid;
}


 // io connection 
var io = require('socket.io')(serv,{});

io.sockets.on('connection', function(socket){
	console.log("socket connected"); 
	
	// listen for disconnection; 
	socket.on('disconnect', onClientdisconnect); 
	
	// listen for new player
	socket.on("new_player", onNewplayer);
	/*
	//we dont need this anymore
	socket.on("move_player", onMovePlayer);
	*/
	//listen for new player inputs. 
	socket.on("input_fired", onInputFired);
});