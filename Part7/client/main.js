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

function onsocketConnected (data) {
	console.log("connected to server"); 
	gameProperties.in_game = true;
	var username = data.username;
	// send the server our initial position and tell it we are connected
	socket.emit('new_player', {username: data.username, x: 0, y: 0, angle: 0});
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

function createPlayer (data) {
	player = game.add.graphics(0, 0);
	player.radius = data.size;

	// set a fill and line style
	player.beginFill(0xffd900);
	player.lineStyle(2, 0xffd900, 1);
	player.drawCircle(0, 0, player.radius * 2);
	player.endFill();
	player.anchor.setTo(0.5,0.5);
	player.body_size = player.radius; 
	//set the initial size;
	player.initial_size = player.radius;
	var style = {fill: "black", align: "center"};
	player.type = "player_body"; 

	// draw a shape
	game.physics.p2.enableBody(player, true);
	player.body.clearShapes();
	player.body.addCircle(player.body_size, 0 , 0); 
	player.body.data.shapes[0].sensor = true;
	//enable collision and when it makes a contact with another body, call player_coll
	player.body.onBeginContact.add(player_coll, this); 
	//player follow text
	player.playertext = game.add.text(0, 0, data.username , style);
	player.addChild(player.playertext);
	
	//camera follow
	game.camera.follow(player, Phaser.Camera.FOLLOW_LOCKON, 0.5, 0.5);
}

//get random intenger
function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1) ) + min;
}

// this is the enemy class. 
var remote_player = function (id, startx, starty, startSize, start_angle) {
	this.x = startx;
	this.y = starty;
	//this is the unique socket id. We use it as a unique name for enemy
	this.id = id;
	this.angle = start_angle;
	
	this.player = game.add.graphics(this.x , this.y);
	//intialize the size with the server value
	this.player.radius = startSize

	// set a fill and line style
	this.player.beginFill(0xffd900);
	this.player.lineStyle(2, 0xffd900, 1);
	this.player.drawCircle(0, 0, this.player.radius * 2);
	this.player.endFill();
	this.player.anchor.setTo(0.5,0.5);
	//we set the initial size;
	this.initial_size = startSize;
	this.player.body_size = this.player.radius; 
	this.player.type = "player_body";
	this.player.id = this.id;

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
	console.log(data);
	var new_enemy = new remote_player(data.id, data.x, data.y, data.size, data.angle); 
	enemies.push(new_enemy);
}

//Server tells us there is a new enemy movement. We find the moved enemy
//and sync the enemy movement with the server
function onEnemyMove (data) {
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
	
	
	//check if the server enemy size is not equivalent to the client
	if (data.size != movePlayer.player.body_size) {
		movePlayer.player.body_size = data.size; 
		var new_scale = movePlayer.player.body_size / movePlayer.initial_size; 
		movePlayer.player.scale.set(new_scale);
		movePlayer.player.body.clearShapes();
		movePlayer.player.body.addCircle(movePlayer.player.body_size, 0 , 0); 
		movePlayer.player.body.data.shapes[0].sensor = true;
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
	
	player.rotation = movetoPointer(player, speed, newPointer);

}

function onGained (data) {
	player.body_size = data.new_size;
	var new_scale = data.new_size/player.initial_size;
	player.scale.set(new_scale);
	//create new body
	player.body.clearShapes();
	player.body.addCircle(player.body_size, 0 , 0); 
	player.body.data.shapes[0].sensor = true;
}

function onKilled (data) {
	player.destroy();
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

//create leader board in here.
function createLeaderBoard() {
	var leaderBox = game.add.graphics(game.width * 0.81, game.height * 0.05);
	leaderBox.fixedToCamera = true;
	// draw a rectangle
	leaderBox.beginFill(0xD3D3D3, 0.3);
    leaderBox.lineStyle(2, 0x202226, 1);
    leaderBox.drawRect(0, 0, 300, 400);
	
	var style = { font: "13px Press Start 2P", fill: "black", align: "left", fontSize: '22px'};
	
	leader_text = game.add.text(10, 10, "", style);
	leader_text.anchor.set(0);

	leaderBox.addChild(leader_text);
}

//leader board
function lbupdate (data) {
	//this is the final board string.
	var board_string = ""; 
	var maxlen = 10;
	var maxPlayerDisplay = 10;
	var mainPlayerShown = false;
	
	for (var i = 0;  i < data.length; i++) {
		//if the mainplayer is shown along the iteration, set it to true
	
		if (mainPlayerShown && i >= maxPlayerDisplay) {
			break;
		}
		
		//if the player's rank is very low, we display maxPlayerDisplay - 1 names in the leaderboard
		// and then add three dots at the end, and show player's rank.
		if (!mainPlayerShown && i >= maxPlayerDisplay - 1 && socket.id == data[i].id) {
			board_string = board_string.concat(".\n");
			board_string = board_string.concat(".\n");
			board_string = board_string.concat(".\n");
			mainPlayerShown = true;
		}
		
		//here we are checking if user id is greater than 10 characters, if it is 
		//it is too long, so we're going to trim it.
		if (data[i].username.length >= 10) {
			var username = data[i].username;
			var temp = ""; 
			for (var j = 0; j < maxlen; j++) {
				temp += username[j];
			}
			
			temp += "...";
			username = temp;
		
			board_string = board_string.concat(i + 1,": ");
			board_string = board_string.concat(username," ",(data[i].size).toString() + "\n");
		
		} else {
			board_string = board_string.concat(i + 1,": ");
			board_string = board_string.concat(data[i].username," ",(data[i].size).toString() + "\n");
		}
		
	}
	
	console.log(board_string);
	leader_text.setText(board_string); 
}

main.prototype = {
	init: function(username) {
		// when the socket connects, call the onsocketconnected and send its information to the server 
		socket.emit('logged_in', {username: username}); 
		
		// when the player enters the game 
		socket.on('enter_game', onsocketConnected); 
	},
	
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
		game.stage.backgroundColor = 0xE1A193;
		
		console.log("client started"); 
		
		//listen for main player creation
		socket.on("create_player", createPlayer);
		//listen to new enemy connections
		socket.on("new_enemyPlayer", onNewPlayer);
		//listen to enemy movement 
		socket.on("enemy_move", onEnemyMove);
		//when received remove_player, remove the player passed; 
		socket.on('remove_player', onRemovePlayer); 
		//when the player receives the new input
		socket.on('input_recieved', onInputRecieved);
		//when the player gets killed
		socket.on('killed', onKilled);
		//when the player gains in size
		socket.on('gained', onGained);
		// check for item removal
		socket.on ('itemremove', onitemremove); 
		// check for item update
		socket.on('item_update', onitemUpdate); 
		// check for leaderboard
		socket.on ('leader_board', lbupdate); 
		
		createLeaderBoard();
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
		game.state.add('login', login);
		game.state.start('login'); 
    }
};;

gameBootstrapper.init("gameDiv");