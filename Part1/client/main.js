var socket; 
socket = io.connect();


canvas_width = window.innerWidth * window.devicePixelRatio;
canvas_height = window.innerHeight * window.devicePixelRatio;

game = new Phaser.Game(canvas_width,canvas_height, Phaser.CANVAS, 'gameDiv');

var gameProperties = { 
	gameWidth: 4000,
	gameHeight: 4000,
	game_elemnt: "gameDiv",
	in_game: false,
};

var main = function(game){
};

//call this function when the player connects to the server.
function onsocketConnected () {
	//create a main player object for the connected user to control
	createPlayer();
	gameProperties.in_game = true;
	// send to the server a "new_player" message so that the server knows
	// a new player object has been created
	socket.emit('new_player', {x: 0, y: 0, angle: 0});
}

//the “main” player class in the CLIENT. This player is what the user controls. 
//look at this example on how to draw using graphics https://phaser.io/examples/v2/display/graphics
// documenation here: https://phaser.io/docs/2.6.2/Phaser.Graphics.html

function createPlayer () {
	//uses Phaser’s graphics to draw a circle
	player = game.add.graphics(0, 0);
	player.radius = 100;

	// set a fill and line style
	player.beginFill(0xffd900);
	player.lineStyle(2, 0xffd900, 1);
	player.drawCircle(0, 0, player.radius * 2);
	player.endFill();
	player.anchor.setTo(0.5,0.5);
	player.body_size = player.radius; 

	// draw a shape
	game.physics.p2.enableBody(player, true);
	player.body.addCircle(player.body_size, 0 , 0); 
}

main.prototype = {
	preload: function() {
		game.scale.scaleMode = Phaser.ScaleManager.RESIZE;
		game.world.setBounds(0, 0, gameProperties.gameWidth, 
		gameProperties.gameHeight, false, false, false, false);
		//I’m using P2JS for physics system. You can choose others if you want
		game.physics.startSystem(Phaser.Physics.P2JS);
		game.physics.p2.setBoundsToWorld(false, false, false, false, false)
		//sets the y gravity to 0. This means players won’t fall down by gravity
		game.physics.p2.gravity.y = 0;
		// turn gravity off
		game.physics.p2.applyGravity = false; 
		game.physics.p2.enableBody(game.physics.p2.walls, false); 
		// turn on collision detection
		game.physics.p2.setImpactEvents(true);

    },
	
	create: function () {
		game.stage.backgroundColor = 0xE1A193;;
		console.log("client started");
		//listen if a client successfully makes a connection to the server,
		//and call onsocketConnected 
		socket.on("connect", onsocketConnected); 
	},
	
	update: function () {
		// emit the player input
		
		//move the player when he is in game
		if (gameProperties.in_game) {
			// we're using phaser's mouse pointer to keep track of 
			// user's mouse position
			var pointer = game.input.mousePointer;
			
			// distanceToPointer allows us to measure the distance between the 
			// mouse pointer and the player object
			if (distanceToPointer(player, pointer) <= 50) {
				//The player can move to mouse pointer at a certain speed. 
				//look at player.js on how this is implemented.
				movetoPointer(player, 0, pointer, 100);
			} else {
				movetoPointer(player, 500, pointer);
			}	
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