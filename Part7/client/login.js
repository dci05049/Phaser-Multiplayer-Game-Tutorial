entername.onclick = function () {
	if (!gameProperties.in_game) {
		gameProperties.in_game = true; 
		//player_properties.username = signdivusername.value; 
		signDiv.style.display = 'none'; 
		socket.emit('enter_name', {username: signdivusername.value}); 
	}
}

function join_game (data) {
	game.state.start(
        'main', true, false, data.username
      );
}

var login = function(game){
};

login.prototype = {
	
	create: function () {
		game.stage.backgroundColor = "#AFF7F0";
		socket = io({transports: ['websocket'], upgrade: false});
		socket.on('join_game', join_game);
	}
}