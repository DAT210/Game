const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

const values = [
    { "promt": "Port number", "value": "27000", "file": "port"},
    { "promt": "Game address", "value": "/rewards/game", "file": "GAME_SERVICE"},
    { "promt": "Environment", "value": "dev", "file": "ENVIRONMENT"},
    { "promt": "Get available tokens api", "value": "/", "file": "GET_AVAILABLE_TOKENS_API"},
    { "promt": "Remove tokens from user api", "value": "/", "file": "REMOVE_TOKENS_FROM_USER_API"},
    { "promt": "Give coupon api", "value": "/", "file": "GIVE_COUPON_API"}
];

let q = 0;

rl.setPrompt(`Enter ${values[q].prompt}: (${values[q].value}) `);
rl.prompt();

rl.on('line', (line) => {
	if (line !== '') {
		values[q].value = line;
	}

	q++;
	if (q < values.length) {
		rl.setPrompt(`Enter ${values[q].prompt}: (${values[q].value}) `);
		rl.prompt();
	} else {
		rl.close();
	}
}).on('close', () => { 
	createEnvironmentFile();
});

function createEnvironmentFile() {
	let fileName = values[0].value + '.env';
	let filePath = path.resolve(__dirname, `../../env/${fileName}`);
	
	let fileContent = '';
	for (let i = 0; i < values.length; i++) {
		if (values[i].file === '') { continue; }

		fileContent += `${values[i].file} = ${values[i].value} \n`;
	}

	fs.writeFile(filePath, fileContent, function(err) {
		if (err) { throw err; }
	});
}
