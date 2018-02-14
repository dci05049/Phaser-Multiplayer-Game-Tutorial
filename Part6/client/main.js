var socket = io({transports: ['websocket'], upgrade: false});


canvas_width = window.innerWidth * window.devicePixelRatio;
canvas_height = window.innerHeight * window.devicePixelRatio;

game = new Phaser.Game(canvas_width,canvas_height, Phaser.CANVAS, 'gameDiv');

//the enemy player list 
var enemies = [];

var gameProperties = { 
	gameWidth: 4000,
	gameHeight: 4000,
	game_elemnt: "gameDiv",
	in_game: false,
};

var main = function(game){
};

function onsocketConnected () {
	console.log("connected to server"); 
	createPlayer();
	gameProperties.in_game = true;
	// send the server our initial position and tell it we are connected
	socket.emit('new_player', {x: 0, y: 0, angle: 0});
}

// When the server notifies us of client disconnection, we find the disconnected
// enemy and remove from our game
function onRemovePlayer (data) {
	var removePlayer = findplayerbyid(data.id);
	// Player not found
	if (!removePlayer) {
		console.log('Player not found: ', data.id)
		return;
	}
	
	removePlayer.player.destroy();
	enemies.splice(enemies.indexOf(removePlayer), 1);
}

function createPlayer () {
	player = game.add.graphics(0, 0);
	player.radius = 100;
	console.log("player");

	// set a fill and line style
	player.beginFill(0xffd900);
	player.lineStyle(2, 0xffd900, 1);
	player.drawCircle(0, 0, player.radius * 2);
	player.endFill();
	player.anchor.setTo(0.5,0.5);
	player.body_size = player.radius; 

	// draw a shape
	game.physics.p2.enableBody(player, true);
	player.body.clearShapes();
	player.body.addCircle(player.body_size, 0 , 0); 
	player.body.data.shapes[0].sensor = true;
}

// this is the enemy class. 
var remote_player = function (id, startx, starty, start_angle) {
	console.log("remote player");
	console.log(startx);
	console.log(starty);
	this.x = startx;
	this.y = starty;
	//this is the unique socket id. We use it as a unique name for enemy
	this.id = id;
	this.angle = start_angle;
	
	this.player = game.add.graphics(this.x , this.y);
	this.player.radius = 100;

	// set a fill and line style
	this.player.beginFill(0xffd900);
	this.player.lineStyle(2, 0xffd900, 1);
	this.player.drawCircle(0, 0, this.player.radius * 2);
	this.player.endFill();
	this.player.anchor.setTo(0.5,0.5);
	this.player.body_size = this.player.radius; 

	// draw a shape
	game.physics.p2.enableBody(this.player, true);
	this.player.body.clearShapes();
	this.player.body.addCircle(this.player.body_size, 0 , 0); 
	this.player.body.data.shapes[0].sensor = true;
}

//Server will tell us when a new enemy player connects to the server.
//We create a new enemy in our game.
function onNewPlayer (data) {
	//enemy object 
	var new_enemy = new remote_player(data.id, data.x, data.y, data.angle); 
	enemies.push(new_enemy);
}

//Server tells us there is a new enemy movement. We find the moved enemy
//and sync the enemy movement with the server
function onEnemyMove (data) {
	console.log("moving enemy");
	
	var movePlayer = findplayerbyid (data.id); 
	
	if (!movePlayer) {
		return;
	}
	
	var newPointer = {
		x: data.x,
		y: data.y, 
		worldX: data.x,
		worldY: data.y, 
	}
	
	var distance = distanceToPointer(movePlayer.player, newPointer);
	speed = distance/0.05;
	
	movePlayer.rotation = movetoPointer(movePlayer.player, speed, newPointer);
}

//we're receiving the calculated position from the server and changing the player position
function onInputRecieved (data) {
	
	//we're forming a new pointer with the new position
	var newPointer = {
		x: data.x,
		y: data.y, 
		worldX: data.x,
		worldY: data.y, 
	}
	
	var distance = distanceToPointer(player, newPointer);
	//we're receiving player position every 50ms. We're interpolating 
	//between the current position and the new position so that player
	//does jerk. 
	speed = distance/0.05;
	
	//move to the new position. 
	player.rotation = movetoPointer(player, speed, newPointer);

}

//This is where we use the socket id. 
//Search through enemies list to find the right enemy of the id.
function findplayerbyid (id) {
	for (var i = 0; i < enemies.length; i++) {
		if (enemies[i].id == id) {
			return enemies[i]; 
		}
	}
}

main.prototype = {
	preload: function() {
		game.stage.disableVisibilityChange = true;
		game.scale.scaleMode = Phaser.ScaleManager.RESIZE;
		game.world.setBounds(0, 0, gameProperties.gameWidth, gameProperties.gameHeight, false, false, false, false);
		game.physics.startSystem(Phaser.Physics.P2JS);
		game.physics.p2.setBoundsToWorld(false, false, false, false, false)
		game.physics.p2.gravity.y = 0;
		game.physics.p2.applyGravity = false; 
		game.physics.p2.enableBody(game.physics.p2.walls, false); 
		// physics start system
		//game.physics.p2.setImpactEvents(true);

    },
	
	create: function () {
		game.stage.backgroundColor = 0xE1A193;;
		console.log("client started");
		socket.on("connect", onsocketConnected); 
		
		//listen to new enemy connections
		socket.on("new_enemyPlayer", onNewPlayer);
		//listen to enemy movement 
		socket.on("enemy_move", onEnemyMove);
		//when received remove_player, remove the player passed; 
		socket.on('remove_player', onRemovePlayer); 
		//when the player receives the new input
		socket.on('input_recieved', onInputRecieved);
	},
	
	update: function () {
		// emit the player input
		
		//move the player when the player is made 
		if (gameProperties.in_game) {
		
			//we're making a new mouse pointer and sending this input to 
			//the server.
			var pointer = game.input.mousePointer;
					
			//Send a new position data to the server 
			socket.emit('input_fired', {
				pointer_x: pointer.x, 
				pointer_y: pointer.y, 
				pointer_worldx: pointer.worldX, 
				pointer_worldy: pointer.worldY, 
			});
		}
	}
}

var gameBootstrapper = {
    init: function(gameContainerElementId){
		game.state.add('main', main);
		game.state.start('main'); 
    }
};;

gameBootstrapper.init("gameDiv");