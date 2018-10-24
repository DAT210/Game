/*jshint esversion: 6*/

var express = require("express");
var nunjucks = require("nunjucks");
var path = require("path");
var superAgent = require("superagent");
var cookie = require("cookie");
var app = express();
var server = app.listen(3000, function(){
	console.log("Game server listening on localhost:3000!\nUse ctrl + c to stop the server!");
});
var io = require("socket.io").listen(server);

var settings = {
	"minPoints":{
		"0": 0,
		"1": 1,
		"2": 1,
		"3": 5,
		"4": 10
	},
	"maxPoints":{
		"0": 0,
		"1": 5,
		"2": 10,
		"3": 15,
		"4": 25
	},
	"boardSize":{
		"0": "0X0",
		"1": "4X4",
		"2": "5X5",
		"3": "6X6",
		"4": "7X7"
	},
	"penalty": {
		"1": 2,
		"2": 3,
		"3": 4,
		"4": 5
	},
	"startTime":{
		"1": 30,
		"2": 45,
		"3": 60,
		"4": 90
	},
	"playInDays": {
		"1": 2,
		"2": 3,
		"3": 5,
		"4": 7
	},
	"allowedMoves": {
		"1": 16,
		"2": 32,
		"3": 42,
		"4": 60
	}
};

var users = new Map();

nunjucks.configure(__dirname, {
	autoescape: true,
	express: app
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/reward/game", function(req, res){
	res.render("template/game_template.html");
});

io.on("connection", function(socket){
	users.set(socket.id, new User(socket));
	var user = users.get(socket.id);
	user.socketID = socket.id;
	user.userID = getUserId(socket);
	getTokensResp = getAvailableTokens(user);
	user.availableTokens = getTokensResp.tokens;
	console.log("User connected with socketID: " + user.socketID + "\nUser have userID: " + user.userID + "\nAvailable tokens: " + user.availableTokens + "\n");

	socket.on("settingsRequest", function(tokens){
        try {
			tokens = parseInt(tokens);
		} catch (error) {
			console.log("User ", socket.id, "got this error while getting settings information: ", error);
		}
		var clientSettings = {};
		if(tokens >= 0 && tokens < 5){
			if(user.availableTokens >= 4){
				clientSettings.minPoints = settings.minPoints[tokens];
				clientSettings.maxPoints = settings.maxPoints[tokens];
				clientSettings.boardSize = settings.boardSize[tokens];
				clientSettings.maxTokens = 4;
				clientSettings.value = tokens;
				clientSettings.timer = getTokensResp.timer;
				clientSettings.serverAvailable = getTokensResp.serverAvailable
			}else{
				clientSettings.maxTokens = user.availableTokens;
				if(tokens <= user.availableTokens){
					clientSettings.minPoints = settings.minPoints[tokens];
					clientSettings.maxPoints = settings.maxPoints[tokens];
					clientSettings.boardSize = settings.boardSize[tokens];
					clientSettings.value = tokens;
					clientSettings.timer = getTokensResp.timer;
					clientSettings.serverAvailable = getTokensResp.serverAvailable
				}else{
					clientSettings.minPoints = settings.minPoints[user.availableTokens];
					clientSettings.maxPoints = settings.maxPoints[user.availableTokens];
					clientSettings.boardSize = settings.boardSize[user.availableTokens];
					clientSettings.value = user.availableTokens;
					clientSettings.timer = getTokensResp.timer;
					clientSettings.serverAvailable = getTokensResp.serverAvailable
				}
			}
            socket.emit("settingsResponse", clientSettings);
        }
	});

	socket.on("startGameRequest", function(tokens){
		if(user.availableTokens > 0 && get.getTokensResp.serverAvailable){
			try {
				tokens = parseInt(tokens);
			} catch (error) {
				console.log("User ", socket.id, "got this error while starting the game: ", error);
			}
			user.boards = new Board(parseInt(settings.boardSize[tokens][0]));
			user.numberOfCardSetsLeft = Math.floor(user.boards.boardSize * user.boards.boardSize / 2);
			user.numberOfCardSets = user.numberOfCardSetsLeft;
			user.movesUsed = 0;
			user.currentPoints = settings.maxPoints[tokens];
			user.tokensUsed = tokens;
			user.penaltyTime = false;
			user.penaltyMoves = false;
	
			socket.emit("startGameRespons", user.getClientBoard());
			console.log("Client connected and started the game with session id:", socket.id);
	
			user.timeLeft = settings.startTime[user.tokensUsed];
			socket.emit("startTimer", user.timeLeft);
			
			timer = setInterval(function(){
				if(user.timeLeft == 0){
					gameOver(user);
				}
	
				socket.emit("timerUpdate", user.timeLeft);		
				user.timeLeft = user.timeLeft - 1;
				calculateScore(user);
				socket.emit("scoreUpdate", user.currentPoints);
			}, 1000);
	
			user.timer = timer;
			
			removeTokensFromUser(user);
		}
	});

	socket.on("userMadeMoveRequest", function(y, x){
		if(user == undefined){
			return;
		}
		card = user.boards.serverBoard[y][x];

		if(!card.frontUp && !card.cleared && user.timer != undefined){	
			if(user.firstCard == undefined){
				user.boards.serverBoard[y][x].frontUp = !user.boards.serverBoard[y][x].frontUp;
				
				user.firstCard = {
					x: x,
					y: y
				};
	
				socket.emit("updateBoard", user.getClientBoard());
				user.movesUsed += 1;
				console.log("user with id:", socket.id, " made an move on x:", x, "y:", y);
			}else if(user.secondCard == undefined){
				user.boards.serverBoard[y][x].frontUp = !user.boards.serverBoard[y][x].frontUp;
				
				user.secondCard = {
					x: x,
					y: y
				};
	
				firstCard = user.firstCard;
				secondCard = user.secondCard;
				serverBoard = user.boards.serverBoard;
				firstCardValue = serverBoard[firstCard.y][firstCard.x].value;
				secondcardValue = serverBoard[secondCard.y][secondCard.x].value;
	
				socket.emit("updateBoard", user.getClientBoard());
				console.log("user with id:", socket.id, " made an move on x:", x, "y:", y);
	
				setTimeout(function(){
					if(firstCardValue == secondcardValue){
						serverBoard[firstCard.y][firstCard.x].cleared = true;
						serverBoard[secondCard.y][secondCard.x].cleared = true;
						user.numberOfCardSetsLeft -= 1;
						if(user.numberOfCardSetsLeft == 0){
							gameOver(user);
						}
					}else{
						serverBoard[firstCard.y][firstCard.x].frontUp = !serverBoard[firstCard.y][firstCard.x].frontUp;
						serverBoard[secondCard.y][secondCard.x].frontUp = !serverBoard[secondCard.y][secondCard.x].frontUp;
					}
	
					socket.emit("updateBoard", user.getClientBoard());
					delete user.firstCard;
					delete user.secondCard;
				}, 1000);
			}
		}
	});

	socket.on("disconnect", function(){
		if(user.timer){
			clearInterval(user.timer);
		}
		users.delete(user.socketID);
	});
});

function getUserId(socket){
    //var cookies = cookie.parse(socket.handshake.headers.cookie);
    //return cookies.userID;
    return 1;
}

function getAvailableTokens(user){
	// TODO find how many tokens the user has.
	/*
	JSON format from reward server:
	{
		UserId: int
		Tokens: int
		GameTime: string	dd-mm-yyyy
	}
	*/
	superAgent
		.get("localhost:32100/reward-pages/" + user.userID + "?page=tokens")
		.then(res => {
			let json = JSON.parse(res.text);
			date = json.GameTime;
			date = date.split("-");
			userDate = new Date();
			userDate.setDate(date[0]);
			userDate.setMonth(date[1]);
			userDate.setFullYear(date[2]);
			currentDate = new Date();
			if(userDate.getTime() > currentDate.getTime()){
				return {
					"tokens": json.Tokens,
					"timer": false,
					"serverAvailable": true
				}
			}else{
				return {
					"tokens": 0,
					"timer": true,
					"serverAvailable": true
				};
			}
		})
		.catch(err => {
			if(err){
				console.log("\nUser with session id: " + user.socketID + 
					"\nGot this error message when trying to remove tokens:\n" +
					err + "\nWill try again soon.\n");
				return {
					"tokens": 0,
					"serverAvailable": false,
					"timer": false,
				};
			}
		})
}

function removeTokensFromUser(user){
	// TODO send request to reward server to remove tokens from user
	/*
	Json format to reward server:
	{
		UserId: int
		Tokens: int
		GameTime: string
	}
	*/
	userID = user.userID;
	tokens = user.tokensUsed;
	gameTime = settings.playInDays[tokens];

	message = {
		"UserId": userID,
		"Tokens": tokens,
		"GameTime": gameTime
	}
	
	superAgent
		.get("localhost:32100/subTokens")
		.then(res => {
			if(res){
				return true;
			}
		})
		.catch(err => {
			if(err){
				console.log("\nUser with session id: " + user.socketID + 
					"\nGot this error message when trying to remove tokens:\n" +
					err + "\nWill try again soon.\n");
				return false;
			}
		})
}

function gameOver(user){
	console.log("Game over for user with userID: " + user.userID);
	clearInterval(user.timer);
	calculateScore(user);
	delete user.timer;
	user.socket.emit("gameOver", user.currentPoints);
}

function calculateScore(user){
	if(user.timeLeft < Math.floor(settings.startTime[user.tokensUsed] * 0.2) &&
		!user.penaltyTime){
		user.currentPoints -= settings.penalty[user.tokensUsed];
		user.penaltyTime = true;
	}
	if(user.movesUsed > settings.allowedMoves[user.boards.boardSize] &&
		!user.penaltyMoves){
		user.currentPoints -= settings.penalty[user.tokensUsed];
		user.penaltyMoves = true;
	}
	if(user.timeLeft <= 0){
		user.currentPoints = settings.minPoints[user.tokensUsed];
	}
}

function createAndShuffleBoard(boardSize){
	var serverBoard = [];
	var clientBoard = [];

  	for (var i = 0; i < boardSize; i++) {
		serverBoard[i] = [];
		clientBoard[i] = [];
  	}

	var middleCardMissing = false;
	var pastmiddlecard = false;
	var numberOfCardSets = boardSize * boardSize;
	var pastvalue = 0;
	if(numberOfCardSets % 2 != 0){
		middleCardMissing = true;
	}

	for(var y = 0; y < boardSize; y++){
		for(var x = 0; x < boardSize; x++){
			if(middleCardMissing && (Math.floor(boardSize / 2) == x && Math.floor(boardSize / 2) == y)){
				serverBoard[y][x] = undefined;
				clientBoard[y][x] = undefined;
				pastmiddlecard = true;
				pastvalue = parseInt(((y*boardSize) + x) / 2);
				continue;
			}
			var value = parseInt(((y*boardSize) + x) / 2);
			if(pastmiddlecard){
				value = pastvalue;
				pastvalue = parseInt(((y*boardSize) + x) / 2);
			}
			serverBoard[y][x] = new ServerCard(value);
			clientBoard[y][x] = new ClientCard(value);
			numberOfCardSets -= 1;
		}
		if(numberOfCardSets <= 0){
			break;
		}
	}

	serverBoard = shuffleServerBoard(serverBoard, boardSize);

	var boards = [];
	boards[0] = serverBoard;
	boards[1] = parseServerBoardToClientBoard(serverBoard, clientBoard, boardSize);

	return boards;
}

function shuffleServerBoard(serverBoard, boardSize){
	length = boardSize * boardSize;
	
	var startPosition = length - 1;

	for(var i = startPosition; i > 0; i--){	
		j = Math.floor(Math.random() * (i-1));

		i_y = parseInt(i / boardSize);
		i_x = parseInt(i - i_y * boardSize);

		j_y = parseInt(j / boardSize);
		j_x = parseInt(j - j_y * boardSize);

		if(serverBoard[j_y][j_x] == undefined || serverBoard[i_y][i_x] == undefined){
			continue;
		}

		temp = serverBoard[j_y][j_x];
		serverBoard[j_y][j_x] = serverBoard[i_y][i_x];
		serverBoard[i_y][i_x] = temp;
	}

	return serverBoard;
}

function parseServerBoardToClientBoard(serverBoard, clientBoard, boardSize){
	var numberOfCardSets = boardSize * boardSize;

	var numberOfCardSetsLeft = numberOfCardSets;

	for(var y = 0; y < boardSize; y++){
		for(var x = 0; x < boardSize; x++){
			if(numberOfCardSetsLeft <= 0){
				break;
			}
			if(serverBoard[y][x] == undefined){
				clientBoard[y][x] = undefined;
				continue;
			}
			clientBoard[y][x].setValue(serverBoard[y][x]);
			numberOfCardSetsLeft -= 1;
		}
		if(numberOfCardSetsLeft <= 0){
			break;
		}
	}

	return clientBoard;
}

class Board{
    constructor(boardSize){
		this.boardSize = boardSize;

		var boards = createAndShuffleBoard(boardSize);
		this.serverBoard = boards[0];
		this.clientBoard = boards[1];
	}

	printBoard(){
		var y;
		var x;
		for(y = 0; y < this.boardSize; y++){
			var clientBoardRow = "";
			for(x = 0; x < this.boardSize; x++){
				clientBoardRow += " ";
				if(this.clientBoard[y][x] != undefined){
					clientBoardRow += this.clientBoard[y][x].value;
				}else{
					clientBoardRow += "x";
				}
			}
			console.log(clientBoardRow);
		}

		console.log("");
		
		for(y = 0; y < this.boardSize; y++){
			var serverBoardRow = "";
			for(x = 0; x < this.boardSize; x++){
				serverBoardRow += " ";
				if(this.serverBoard[y][x] != undefined){
					serverBoardRow += this.serverBoard[y][x].value;
				}else{
					serverBoardRow += "x";
				}
			}
			console.log(serverBoardRow);
		}

		console.log("");
	}
}

class ServerCard{
	constructor(value){
        this.value = value;
        this.frontUp = false;
		this.cleared = false;
    }
}

class ClientCard{
    constructor(value){
        this.value = value;
    }
	//This method is used to hide value of cards that are not face up for the client.
	//Server has the original board with the card values.
	setValue(serverCard){
		if(serverCard.cleared){
			this.value = -2;
		}else if(!serverCard.frontUp){
			this.value = -1;
		}else{
			this.value = serverCard.value;
		}
		return;
	}
}

class User{
	constructor(socket){
		this.socket = socket;
		/*
		this.socketID = undefined;
        this.userID = undefined;
		this.movesUsed = undefined;
		this.numberOfSets = undefined;
		this.numberOfClearedSets = undefined;
        this.currentPoints = undefined;
        this.timerID = undefined;
        this.timeLeft = undefined;
        this.boards = undefined;
        this.firstCard = undefined;
        this.secondCard = undefined;
		this.numberOfAvailableTokens = undefined;
		*/
	}
	getClientBoard(){
		this.boards.clientBoard = parseServerBoardToClientBoard(this.boards.serverBoard, 
											this.boards.clientBoard, 
											this.boards.boardSize);
		return this.boards.clientBoard;
	}
}