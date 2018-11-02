/*jshint esversion: 6*/

var express = require("express");
var nunjucks = require("nunjucks");
var path = require("path");
var superAgent = require("superagent");
var logger = require('./logger/logger.js').getLogger();
const env = require('./server/environment.js')
if (!env.load()) { return; };
if (!env.validate()) { return; };
var cookie = require("cookie");
var argv = handleCommandLineArguments();
var app = express();
var server = app.listen(process.env.PORT, function(){
	console.log(`Game server listening on localhost:${process.env.PORT}!\nUse ctrl + c to stop the server!`);
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

this.logger.info(orderid + ' stripe ');

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
	
	socket.on("firstConnection", function(){
		// TODO handle server down or not allowed to play yet
		user.userID = getUserId(socket);
		getTokensResp = getAvailableTokens(user);
		user.availableTokens = getTokensResp.tokens;
		user.serverAvailable = getTokensResp.serverAvailable;
		user.playInDays = getTokensResp.playInDays;

		logger.info("User connected with socketID: " + user.socketID + "\nUser have userID: " + user.userID + "\nAvailable tokens: " + user.availableTokens + "\n");
	});

	socket.on("testConfiguration", function(usersetup){
		user.userID = usersetup.userID;
		user.availableTokens = usersetup.tokens;
		user.serverAvailable = usersetup.serverAvailable;
		user.playInDays = usersetup.playInDays;

		console.log("User connected with socketID: " + user.socketID + "\nUser have userID: " + user.userID + "\nAvailable tokens: " + user.availableTokens + "\n");
	});

	socket.on("settingsRequest", function(tokens){
        try {
			tokens = parseInt(tokens);
		} catch (error) {
			logger.error("User ", socket.id, "got this error while getting settings information: ", error);
			tokens = 0;
		}
		var clientSettings = {};
		if(tokens >= 0 && tokens < 5){
			if(user.availableTokens >= 4){
				clientSettings.minPoints = settings.minPoints[tokens];
				clientSettings.maxPoints = settings.maxPoints[tokens];
				clientSettings.boardSize = settings.boardSize[tokens];
				clientSettings.maxTokens = 4;
				clientSettings.value = tokens;
				clientSettings.playInDays = user.playInDays;
				clientSettings.serverAvailable = user.serverAvailable;
			}else{
				clientSettings.maxTokens = user.availableTokens;
				if(tokens <= user.availableTokens){
					clientSettings.minPoints = settings.minPoints[tokens];
					clientSettings.maxPoints = settings.maxPoints[tokens];
					clientSettings.boardSize = settings.boardSize[tokens];
					clientSettings.value = tokens;
					clientSettings.playInDays = user.playInDays;
					clientSettings.serverAvailable = user.serverAvailable;
				}else{
					clientSettings.minPoints = settings.minPoints[user.availableTokens];
					clientSettings.maxPoints = settings.maxPoints[user.availableTokens];
					clientSettings.boardSize = settings.boardSize[user.availableTokens];
					clientSettings.value = user.availableTokens;
					clientSettings.playInDays = user.playInDays;
					clientSettings.serverAvailable = user.serverAvailable;
				}
			}
		}else{
			clientSettings.minPoints = settings.minPoints[0];
			clientSettings.maxPoints = settings.maxPoints[0];
			clientSettings.boardSize = settings.boardSize[0];
			clientSettings.maxTokens = 0;
			clientSettings.value = 0;
			clientSettings.playInDays = user.playInDays;
			clientSettings.serverAvailable = user.serverAvailable;
		}
		socket.emit("settingsResponse", clientSettings);
	});

	socket.on("startGameRequest", function(tokens){
		if(user.availableTokens > 0 && tokens <= user.availableTokens && user.serverAvailable){
			try {
				tokens = parseInt(tokens);
			} catch (error) {
				logger.error("User ", socket.id, "got this error while starting the game: ", error);
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
			logger.info("Client connected and started the game with session id:", socket.id);
	
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
		}else{
			socket.emit("startGameRespons", []);
		}
	});

	socket.on("userMadeMoveRequest", function(y, x){
		if(user == undefined){
			socket.emit("userMadeMoveResponseError");
			return;
		}
		try {
			card = user.boards.serverBoard[parseInt(y)][parseInt(x)];
		} catch (error) {
			socket.emit("userMadeMoveResponseError");
			return;
		}

		if(card != undefined && !card.frontUp && !card.cleared && user.timer != undefined){	
			if(user.firstCard == undefined){
				user.boards.serverBoard[y][x].frontUp = !user.boards.serverBoard[y][x].frontUp;
				
				user.firstCard = {
					x: x,
					y: y
				};
	
				socket.emit("updateBoard", user.getClientBoard());
				user.movesUsed += 1;
				logger.info("user with id:", socket.id, " made an move on x:", x, "y:", y);
			}else if(user.secondCard == undefined){
				user.boards.serverBoard[y][x].frontUp = !user.boards.serverBoard[y][x].frontUp;
				
				user.secondCard = {
					x: x,
					y: y
				};
	
				socket.emit("updateBoard", user.getClientBoard());
				logger.info("user with id:", socket.id, " made an move on x:", x, "y:", y);

				setTimeout(function(user){	
					firstCard = user.firstCard;
					secondCard = user.secondCard;
					serverBoard = user.boards.serverBoard;
					firstCardValue = serverBoard[firstCard.y][firstCard.x].value;
					secondcardValue = serverBoard[secondCard.y][secondCard.x].value;

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
				}.bind(null, user), 1000);
			}
		}else{
			socket.emit("userMadeMoveResponseError");
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
	if (!process.env.ENVIRONMENT == "production") {
		return socket.id;
	}

	// TODO write stuff to fetch userid
    //var cookies = cookie.parse(socket.handshake.headers.cookie);
    //return cookies.userID;
}

function getAvailableTokens(user){
	// TODO find how many tokens the user has.
	/*
	JSON format from reward server:
	{
		UserID: int
		Tokens: int
		nextPlayDate: string	dd-mm-yyyy
	}
	*/
	if(!process.env.ENVIRONMENT == "production") {
		return {
			"tokens": 10,
			"playInDays": true,
			"serverAvailable": true
		};
	}

	superAgent
		.get(process.env.GET_AVAILABLE_TOKENS + user.userID + "?page=tokens")
		.then(res => {
			let json = JSON.parse(res.text);
			if(json.nextPlayDate == ""){
				return {
					"tokens": parseInt(json.tokens),
					"playInDays": true,
					"serverAvailable": true
				}
			}
			date = json.nextPlayDate;
			date = date.split("-");
			userDate = new Date();
			userDate.setDate(date[0]);
			userDate.setMonth(date[1]);
			userDate.setFullYear(date[2]);
			currentDate = new Date();
			if(userDate.getTime() > currentDate.getTime()){
				return {
					"tokens": parseInt(json.tokens),
					"playInDays": false,
					"serverAvailable": true
				}
			}else{
				return {
					"tokens": 0,
					"playInDays": true,
					"serverAvailable": true
				};
			}
		})
		.catch(err => {
			if(err){
				logger.info("\nUser with session id: " + user.socketID + 
					"\nGot this error message when trying to remove tokens:\n" +
					err + "\nWill try again soon.\n");
				return {
					"tokens": 0,
					"serverAvailable": false,
					"playInDays": false,
				};
			}
		})
}

function removeTokensFromUser(user){
	// TODO send request to reward server to remove tokens from user
	/*
	Json format to reward server:
	{
		userID: int
		tokens: int
		nextPlayDate: string	dd-mm-yyyy
	}
	*/
	if(!process.env.ENVIRONMENT == "production") {
		return;
	}

	userID = user.userID;
	tokens = user.tokensUsed;
	currentTime = new Date();
	currentTime = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
	nextPlayDate = currentTime.setDate(currentTime.getDate() + settings.playInDays[user.tokensUsed]);


	const http = new XMLHttpRequest();
	const url = process.env.REMOVE_TOKENS_FROM_USER;
	http.open('PATCH', url);
	http.setRequestHeader('Content-type', 'application/json; charset=utf-8');
	let json = JSON.parse('{}');
	json.userID = userID;
	json.tokens = -tokens;
	json.nextPlayDate = nextPlayDate;
	http.send(JSON.stringify(json));
	http.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			// TODO add code that will handle if the http patch request succeeds
		}else if(this.readyState == 4){
			// TODO add code that will handle if the http patch request fail
		}
	}
}

function gameOver(user){
	logger.info("Game over for user with userID: " + user.userID);
	clearInterval(user.timer);
	calculateScore(user);
	giveCupon(user);
	delete user.timer;
	user.socket.emit("gameOver", user.currentPoints);
}

function giveCupon(user){
	/*
	Json format to reward server:
	{
		UserId: int
		Value: int
		Type: int
	}
	*/

	if (argv.test) {
		return;
	}

	userID = user.userID;
	value = user.currentPoints;
	type = 0;

	const http = new XMLHttpRequest();
	const url = process.env.GIVE_COUPON; // TODO add url for cupon server
	http.open('PATCH', url);
	http.setRequestHeader('Content-type', 'application/json; charset=utf-8');
	let json = JSON.parse('{}');
	json.userID = userID;
	json.value = value;
	json.type = type;
	http.send(JSON.stringify(json));
	http.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) {
			// TODO add code that will handle if the http patch request succeeds
		}else if(this.readyState == 4){
			// TODO add code that will handle if the http patch request fail
		}
	}
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

function handleCommandLineArguments() {
	let argv = require('minimist')(process.argv.slice(2));


	if (argv.redirect_console_log) {
		console.log = function(v) {
			return;
		};
	}
	

	return argv;
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