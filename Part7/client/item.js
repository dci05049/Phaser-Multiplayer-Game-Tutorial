//the food list
var food_pickup = [];

// search through food list to find the food object
function finditembyid (id) {
	
	for (var i = 0; i < food_pickup.length; i++) {

		if (food_pickup[i].id == id) {
			return food_pickup[i]; 
		}
	}
	
	return false; 
}

// function called when new food is added in the server.
function onitemUpdate (data) {
	food_pickup.push(new food_object(data.id, data.type, data.x, data.y)); 
}

// function called when food needs to be removed in the client. 
function onitemremove (data) {
	
	var removeItem; 
	removeItem = finditembyid(data.id);
	food_pickup.splice(food_pickup.indexOf(removeItem), 1); 
	
	//destroy the phaser object 
	removeItem.item.destroy(true,false);
	
}

// the food class
var food_object = function (id, type, startx, starty, value) {
	// unique id for the food.
	//generated in the server with node-uuid
	this.id = id; 
	
	//positinon of the food
	this.posx = startx;  
	this.posy = starty; 
	this.powerup = value;
	
	//create a circulr phaser object for food
	this.item = game.add.graphics(this.posx, this.posy);
	this.item.beginFill(0xFF0000);
	this.item.lineStyle(2, 0xFF0000, 1);
	this.item.drawCircle(0, 0, 20);

	this.item.type = 'food_body';
	this.item.id = id;
	
	game.physics.p2.enableBody(this.item, true);
	this.item.body.clearShapes();
	this.item.body_size = 10; 
	this.item.body.addCircle(this.item.body_size, 0, 0);
	this.item.body.data.gravityScale = 0;
	this.item.body.data.shapes[0].sensor = true;

}