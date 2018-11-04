var socket = io("http://localhost:" + getPort());
var settings = {
  	"minPoints": 1,
  	"maxPoints": 5,
	"boardSize": "4X4",
	"penalty": 2,
	"allowedMoves": 16,
	"startTime": 30
};

socket.on("settingsResponse", function(serverSettings){
	settings = serverSettings;
	$("#infocontainer").html(serverSettings.message);
	$("#settingscontainer h2").html("Tokens to use: " + settings.value);
  	$("#tokenSlider").prop({
    	"max": settings.maxTokens
  	});
  	$("#tokenSlider").val(settings.value);
  	if($("#tokenSlider").val() == 0){
		$("#btncontainer").hide();
  	}else{
    	$("#btncontainer").show();
  	}
});

socket.on("startGameRespons", function(clientBoard){
  	if(clientBoard.length != 0){
    	clearMenu();
    	addGameContent(clientBoard);
    	$("#minPoints").html("<p id=\"minPoints\">Min points you can earn: " + settings.minPoints + " </p>");
    	$("#maxPoints").html("<p id=\"maxPoints\">Max points you can earn: " + settings.maxPoints + "</p>");
    	$("#currentPoints").html("<p id=\"currentPoints\">Current points: </p>");
  	}
});

socket.on("updateBoard", function(clientBoard){
  	updateBoard(clientBoard);
});

socket.on("scoreUpdate", function(currentPoints){
  	$("#currentPoints").html("<p id=\"currentPoints\">Current points: " + currentPoints + "</p>");
});

socket.on("timerUpdate", function(timeLeft){
  	$("#gameTimeLeft").html("<h3>Time Left: " + timeLeft + "</h3>");
});

socket.on("gameOver", function(currentPoints){
	if(currentPoints = settings.maxPoints){
		$("#gameContent").html("<h1>Congratulation!</h1><h1>You won a coupon worth " + currentPoints + "% on your next purchase!</h1>");
	}else{
		$("#gameContent").html("<h1>Game over!</h1><h1>You won a coupon worth " + currentPoints + "% on your next purchase!</h1>");
	}
});

socket.on("firstConnectionResponse", function(userInformation){
	$("#userInfo").html(`<p>User id: ${userInformation.userID}</p><p>Available tokens: ${userInformation.availableTokens}</p>`)
});

function updateBoard(clientBoard){
	for (var y = 0; y < clientBoard.length; y++) {
		for (var x = 0; x < clientBoard.length; x++) {
		var currentValue = $("#" + y + "-" + x).html();
		if(clientBoard[y][x] == undefined){
			continue;
		}
		var value = clientBoard[y][x].value;

		if(currentValue != value){
			if(value == -1){
			// fra face up til down
			$("#" + y + "-" + x).html("<img src=\"/images/icons/logo.png\" style=\"width:100\%; height: 100\%\">");
			}else if(value == -2){
			// fra face up til cleared
			$("#" + y + "-" + x).attr("style", "visibility: hidden");
			}else{
			//fra face down til face up
			$("#" + y + "-" + x).html("<img src=\"/images/cards/" + value + ".jpg\" style=\"width:100\%; height: 100\%\">");
			}
		}else{
			continue;
		}
		}
	}
}

function addStartMenuEvents(){
	$("#btn_start").click(function() {
		socket.emit("startGameRequest", $("#tokenSlider").val());
	});

	$("#tokenSlider").on("change", function(){
		var tokens = $("#tokenSlider").val();
		socket.emit("settingsRequest", tokens);
	});
}

function addGameContent(clientBoard){
	console.log(clientBoard);
	$("#gameContent").append($("<div></div>").attr("id", "board"));
	var card;
	for (var y = 0; y < clientBoard.length; y++) {
		for (var x = 0; x < clientBoard.length; x++) {
		if(clientBoard[y][x] == undefined){
			card = $("<div></div>").addClass("nocard");
			card.attr("id", (y + "-" + x));
			$("#board").append(card);
			$("#" + y + "-" + x).html("<img src=\"/images/icons/logo2.png\" style=\"width:100\%; height: 100\%\">");
			continue;
		}
		card = $("<div></div>").addClass("card");
		card.attr("id", (y + "-" + x));
		card.html("Value: " + clientBoard[y][x].value);
		if (x == 0) {
			card.addClass("clearleft");
		}
		$("#board").append(card);
		$("#" + y + "-" + x).html("<img src=\"/images/icons/logo.png\" style=\"width:100\%; height: 100\%\">");
		}
	}
	$(".card").click(function(){
		var cardId = this.id;
		var yx = cardId.split("-");
		socket.emit("userMadeMoveRequest", yx[0], yx[1]);
	});

	

	var cardWidth = 100;
	var cardHeight = 150;

	var size = parseInt(settings.boardSize[0]);
	$("#board").width(size * cardWidth * 1.2);
	$("#board").height(size * cardHeight * 1.2);
}

function clearMenu(){
	$("#gameMenu").empty();
	$("#gameMenu").attr("id", "gameContent");
}

$(document).ready(function () {
	socket.emit("firstConnection");
	socket.emit("settingsRequest", "1");

	addStartMenuEvents();
});