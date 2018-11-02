var should = require("should");
var io = require("socket.io-client");
const env = require("../src/tools/environment.js")
const functions = require("../src/app.js")
if (!env.load()) { return; };
if (!env.validate()) { return; };

var socketURL = `http://localhost:${process.env.PORT}`;

var options ={
  	transports: ["websocket"],
  	"force new connection": true
};

describe("Testing", function(){
	describe("Testing single user connection", function(){
		describe("Testing settingRequest", function(){
			let validTests = {
				"request": [0, 1, 2, 3, 4],
				"response": [{
					"minPoints": 0,
					"maxPoints": 0,
					"boardSize": "0X0",
					"maxTokens": 4,
					"value": 0,
					"playInDays": true,
					"serverAvailable": true
				}, {
					"minPoints": 1,
					"maxPoints": 5,
					"boardSize": "4X4",
					"maxTokens": 4,
					"value": 1,
					"playInDays": true,
					"serverAvailable": true
				}, {
					"minPoints": 1,
					"maxPoints": 10,
					"boardSize": "5X5",
					"maxTokens": 4,
					"value": 2,
					"playInDays": true,
					"serverAvailable": true
				}, {
					"minPoints": 5,
					"maxPoints": 15,
					"boardSize": "6X6",
					"maxTokens": 4,
					"value": 3,
					"playInDays": true,
					"serverAvailable": true
				}, {
					"minPoints": 10,
					"maxPoints": 25,
					"boardSize": "7X7",
					"maxTokens": 4,
					"value": 4,
					"playInDays": true,
					"serverAvailable": true
				}]
			};
			let invalidTests = {
				"userSetup": [{
					"tokens": 0,
					"serverAvailable": true,
					"playInDays": true,
					"userID": "id1"
				}, {
					"tokens": 0,
					"serverAvailable": true,
					"playInDays": true,
					"userID": "id1"
				}, {
					"tokens": 0,
					"serverAvailable": true,
					"playInDays": true,
					"userID": "id1"
				}, {
					"tokens": 4,
					"serverAvailable": true,
					"playInDays": true,
					"userID": "id1"
				}, {
					"tokens": 4,
					"serverAvailable": true,
					"playInDays": true,
					"userID": "id1"
				}, {
					"tokens": 4,
					"serverAvailable": true,
					"playInDays": true,
					"userID": "id1"
				}],
				"request": [10, -5, "test", 10, -5, "test"],
				"response": {
					"minPoints": 0,
					"maxPoints": 0,
					"boardSize": "0X0",
					"maxTokens": 0,
					"value": 0,
					"playInDays": true,
					"serverAvailable": true
				}
			};
			describe("Sending valid setting request", function(){
				for(let i = 0; i < validTests.request.length; i++){
				it("Valid setting request test index " + i, function(done){
					let client = io.connect(socketURL, options);
			
					client.emit("testConfiguration", {"tokens": 10, "serverAvailable": true, "playInDays": true, "userID": "id"+i});
			
					client.emit("settingsRequest", validTests.request[i]);          
			
					client.on("settingsResponse", function(serversettings){
						serversettings.should.eql(validTests.response[i]);
						client.disconnect();
						done();
					});
				});
				}
			});
			describe("Sending invalid setting request", function(){
				for(let i = 0; i < invalidTests.request.length; i++){
					it("Invalid setting request test index " + i, function(done){
						var client = io.connect(socketURL, options);

						client.emit("testConfiguration", invalidTests.userSetup[i]);
				
						client.emit("settingsRequest", invalidTests.request[i]);
				
						client.on("settingsResponse", function(serversettings){
						serversettings.should.eql(invalidTests.response);
						client.disconnect();
						done();
						});
					});
				}
			});
		});
		describe("Testing startGameRequest", function(){
		describe("Testing valid start game request", function(){
			for(let i = 1; i < 5; i++){
			it("Sending valid start game request index " + i, function(done){
				let client = io.connect(socketURL, options);
				client.emit("testConfiguration", {"tokens": 10, "serverAvailable": true, "playInDays": true, "userID": "id1"});
				client.emit("startGameRequest", i);
		
				client.on("startGameRespons", function(clientboard){
				clientboard.length.should.eql(i + 3);
				client.disconnect();
				done();
				});
			});
			}
		});
		describe("Testing invalid start game request", function(){
			it("Sending invalid start game request, invalid argument", function(done){
			let client = io.connect(socketURL, options);
				client.emit("testConfiguration", {"tokens": 10, "serverAvailable": true, "playInDays": true, "userID": "id1"});
				client.emit("startGameRequest", "test");
		
				client.on("startGameRespons", function(clientboard){
				clientboard.length.should.eql(0);
				client.disconnect();
				done();
				});
			});
			it("Sending invalid start game request, user have 0 tokens and sending request using valid amount of tokens", function(done){
			let client = io.connect(socketURL, options);
				client.emit("testConfiguration", {"tokens": 0, "serverAvailable": true, "playInDays": true, "userID": "id1"});
				client.emit("startGameRequest", 3);
		
				client.on("startGameRespons", function(clientboard){
				clientboard.length.should.eql(0);
				client.disconnect();
				done();
				});
			});
		});
		});
		describe("Testing user making move requests", function(){
		describe("Testing user making valid moves", function(){
			let request = [
				{"x": 1, "y":1},
				{"x": 1, "y":2}
			];
	
			it("testing two valid moves", function(done){
			let client = io.connect(socketURL, options);
	
			client.emit("testConfiguration", {"tokens": 10, "userID": "user1", "serverAvailable": true, "playInDays": true});
			client.emit("startGameRequest", 1);
	
			for(let i = 0; i < request.length; i++){
				client.emit("userMadeMoveRequest", request[i].y, request[i].x);
			}
	
			let number = 0;
	
			client.on("updateBoard", function(clientboard){
				clientboard[request[number].y][request[number].x].value.should.be.aboveOrEqual(0);
				
				number++;
				if(number == request.length){
				client.disconnect();
				done();
				}
			});
			});
			
		});
		describe("Testing user making invalid moves", function(){
			it("testing invalid moves outside the board", function(done){
			requests = [
				{"y": -1, "x": 2},
				{"y": 2, "x": -1},
				{"y": -1, "x": 2},
				{"y": 8, "x": 8},
				{"y": 2, "x": 8},
				{"y": 8, "x": 2},
				{"y": "test", "x": 2},
				{"y": 2, "x": "test"},
				{"y": "test", "x": "test"},
				{"y": "test", "x": true}
			];
	
			client = io.connect(socketURL, options);
			client.emit("testConfiguration", {"tokens": 10, "userID": "user1", "serverAvailable": true, "playInDays": true});
			client.emit("startGameRequest", 1);
	
			for(let i = 0; i < requests.length; i++){
				client.emit("userMadeMoveRequest", requests[i].y, requests[i].x);
			}
			
			let number = 0;
	
			client.on("userMadeMoveResponseError", function(){
				number++;
				if(number == requests.length){
				client.disconnect();
				done();
				}
			});
	
			client.on("updateBoard", function(){
				done("One of the test got through and tried to update the board!");
			});
			});
		});
		});
	});
	describe("Testing multi user connection", function(){
		describe("Testing connecting n amount of clients and disconnecting them", function(){
		let numberOfClients = 15000;
		it(`Testing a server with ${numberOfClients} clients connected`, function(done){
			clients = new Array(numberOfClients);
			this.timeout(60000);
			for(var i = 0; i < numberOfClients; i++){
			let client = io.connect(socketURL, options);
			client.emit("firstConnection");
			clients[i] = client;
			}
			if(clients.length == numberOfClients){
			for(let i = 0; i < clients.length; i++){
				clients[i].disconnect();
			}
			done();
			}else{
			done(new Error("Fail"));
			}
		});
		});
	});
	describe("Testing functions on the server", function(){
		describe("Testing the getUserId function", function(){
			it("testing function", function(done){
				done();
			});
		});
		describe("Testing the getAvailableTokens function", function(){
			it("testing function", function(done){
				done();
			});
		});
		describe("Testing the removeTokensFromUser function", function(){
			it("testing function", function(done){
				done();
			});
		});
		describe("Testing the gameOver function", function(){
			it("testing function", function(done){
				done();
			});
		});
		describe("Testing the giveCoupon function", function(){
			it("testing function", function(done){
				done();
			});
		});
		describe("Testing the calculateScore function", function(){
			it("testing function", function(done){
				done();
			});
		});
		describe("Testing the createAndShuffleBoard function", function(){
			it("testing function", function(done){
				done();
			});
		});
		describe("Testing the shuffleServerBoard function", function(){
			it("testing function", function(done){
				done();
			});
		});
		describe("Testing the parseServerBoardToClientBoard function", function(){
			it("testing function", function(done){
				done();
			});
		});
	});
});