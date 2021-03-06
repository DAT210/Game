var should = require("should");
var io = require("socket.io-client");
const env = require("../src/tools/environment.js")
if (!env.load()) { return; };
if (!env.validate()) { return; };

var socketURL = `http://localhost:${process.env.PORT}`;

var options ={
  	transports: ["websocket"],
  	"force new connection": true
};

describe("Testing Socket.io functions", function(){
	describe("Testing single user connection", function(){
		describe("Testing settingRequest", function(){
			let validSettingTests = {
				"request": [0, 1, 2, 3, 4],
				"response": [{
					"minPoints": 0,
					"maxPoints": 0,
					"boardSize": "0X0",
					"maxTokens": 4,
					"value": 0,
					"playInDays": true,
					"serverAvailable": true,
					"message": "<p>You have selected 0 tokens!</p>"
				}, {
					"minPoints": 1,
					"maxPoints": 5,
					"boardSize": "4X4",
					"maxTokens": 4,
					"value": 1,
					"playInDays": true,
					"serverAvailable": true,
					"message": "<p>This will start a game using 1 token. You will have 30 seconds to clear out a board with a size of 4X4. After the game has ended you will be rewarded with a discount coupon worth between 1% and 5% on your next purchase. If you use more than 16 flips you will lose 2%. If you use up 80% of the time you will lose 2%. If you use up all the time you will get the minimum reward. Increasing the amount of tokens you use will increase the board size but also increase the reward.</p></br><p>Good luck!</p>"
				}, {
					"minPoints": 1,
					"maxPoints": 10,
					"boardSize": "5X5",
					"maxTokens": 4,
					"value": 2,
					"playInDays": true,
					"serverAvailable": true,
					"message": "<p>This will start a game using 2 tokens. You will have 60 seconds to clear out a board with a size of 5X5. After the game has ended you will be rewarded with a discount coupon worth between 1% and 10% on your next purchase. If you use more than 32 flips you will lose 3%. If you use up 80% of the time you will lose 3%. If you use up all the time you will get the minimum reward. Increasing the amount of tokens you use will increase the board size but also increase the reward.</p></br><p>Good luck!</p>"
				}, {
					"minPoints": 5,
					"maxPoints": 15,
					"boardSize": "6X6",
					"maxTokens": 4,
					"value": 3,
					"playInDays": true,
					"serverAvailable": true,
					"message": "<p>This will start a game using 3 tokens. You will have 120 seconds to clear out a board with a size of 6X6. After the game has ended you will be rewarded with a discount coupon worth between 5% and 15% on your next purchase. If you use more than 52 flips you will lose 4%. If you use up 80% of the time you will lose 4%. If you use up all the time you will get the minimum reward. Increasing the amount of tokens you use will increase the board size but also increase the reward.</p></br><p>Good luck!</p>"
				}, {
					"minPoints": 10,
					"maxPoints": 25,
					"boardSize": "7X7",
					"maxTokens": 4,
					"value": 4,
					"playInDays": true,
					"serverAvailable": true,
					"message": "<p>This will start a game using 4 tokens. You will have 150 seconds to clear out a board with a size of 7X7. After the game has ended you will be rewarded with a discount coupon worth between 10% and 25% on your next purchase. If you use more than 80 flips you will lose 5%. If you use up 80% of the time you will lose 5%. If you use up all the time you will get the minimum reward. Increasing the amount of tokens you use will increase the board size but also increase the reward.</p></br><p>Good luck!</p>"
				}]
			};
			let invalidSettingTests = {
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
					"serverAvailable": true,
					"message": "<p>You have selected 0 tokens!</p>"
				}
			};
			describe("Sending valid setting request", function(){
				for(let i = 0; i < validSettingTests.request.length; i++){
					it("Valid setting request test index " + i, function(done){
						let client = io.connect(socketURL, options);
				
						client.emit("testConfiguration", {"tokens": 10, "serverAvailable": true, "playInDays": true, "userID": "id"+i});
				
						client.emit("settingsRequest", validSettingTests.request[i]);          
				
						client.on("settingsResponse", function(serversettings){
							serversettings.should.eql(validSettingTests.response[i]);
							client.disconnect();
							done();
						});
					});
				}
			});
			describe("Sending invalid setting request", function(){
				for(let i = 0; i < invalidSettingTests.request.length; i++){
					it("Invalid setting request test index " + i, function(done){
						let client = io.connect(socketURL, options);

						client.emit("testConfiguration", invalidSettingTests.userSetup[i]);
				
						client.emit("settingsRequest", invalidSettingTests.request[i]);
				
						client.on("settingsResponse", function(serversettings){
							serversettings.should.eql(invalidSettingTests.response);
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
				
						client.on("startGameResponse", function(clientboard){
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

					client.on("connect", function(){
						client.emit("testConfiguration", {"tokens": 10, "serverAvailable": true, "playInDays": true, "userID": "id1"});
						client.emit("startGameRequest", "test");
					});
			
					client.on("startGameResponse", function(clientboard){
						clientboard.length.should.eql(0);
						client.disconnect();
						done();
					});
				});
				it("Sending invalid start game request, user have 0 tokens and sending request using valid amount of tokens", function(done){
					let client = io.connect(socketURL, options);

					client.on("connect", function(){
						client.emit("testConfiguration", {"tokens": 0, "serverAvailable": true, "playInDays": true, "userID": "id1"});
						client.emit("startGameRequest", 3);
					});
			
					client.on("startGameResponse", function(clientboard){
						clientboard.length.should.eql(0);
						client.disconnect();
						done();
					});
				});
			});
		});
		describe("Testing user making move requests", function(){
			describe("Testing user making valid moves", function(){
				let validMoveRequestTest = [
					{"x": 1, "y":1},
					{"x": 1, "y":2}
				];
		
				it("testing two valid moves", function(done){
					let client = io.connect(socketURL, options);
			
					client.emit("testConfiguration", {"tokens": 10, "userID": "user1", "serverAvailable": true, "playInDays": true});
					client.emit("startGameRequest", 1);
			
					for(let i = 0; i < validMoveRequestTest.length; i++){
						client.emit("userMadeMoveRequest", validMoveRequestTest[i].y, validMoveRequestTest[i].x);
					}
			
					let testsDone = 0;
			
					client.on("updateBoard", function(clientboard){
						clientboard[validMoveRequestTest[testsDone].y][validMoveRequestTest[testsDone].x].value.should.be.aboveOrEqual(0);
						
						testsDone++;
						if(testsDone == validMoveRequestTest.length){
							client.disconnect();
							done();
						}
					});
				});
				
			});
			describe("Testing user making invalid moves", function(){
				it("testing invalid moves outside the board and with non int values", function(done){
					invalidMoveRequestTest = [
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
			
					for(let i = 0; i < invalidMoveRequestTest.length; i++){
						client.emit("userMadeMoveRequest", invalidMoveRequestTest[i].y, invalidMoveRequestTest[i].x);
					}
					
					let testsDone = 0;
			
					client.on("userMadeMoveResponseError", function(){
						testsDone++;
						if(testsDone == invalidMoveRequestTest.length){
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
			let numberOfClients = 500;
			it(`Testing a server with ${numberOfClients} clients connected`, function(done){
				this.timeout(0);

				let clients = [];

				for(let i = 0; i < numberOfClients; i++){
					let client = io.connect(socketURL, options);
					client.on("connect", function(){
						clients.push(client)
						process.stdout.write('Connecting: ' + parseInt(clients.length / numberOfClients * 100) + '\r');
						if(clients.length == numberOfClients){
							for(let i = 0; i < clients.length; i++){
								process.stdout.write('Disconnecting: ' + parseInt(i / numberOfClients * 100) + '\r');
								if(clients[i].connected != true){
									done("user not connected");
								}
								clients[i].disconnect();
							}
							done();
						}
					});
				}
			});
		});
	});
});