# Game service
> Made by group 7 ([Payment](https://github.com/DAT210/Payment), [Rewards](https://github.com/DAT210/Rewards), [Game](https://github.com/DAT210/Game))

The game service is used for customers to earn coupons using game tokens that they recieve after a purchase.

## Installing / Getting started

You can run the Game service with Docker or Node.

This service depends on environment variables found in the default.env file.

Copy and rename the /env/default.env file and fill in your variables.
The service determines which .env file to use based on your NODE_ENV environment variable.

Docker
```shell
# Navigate to project directory
cd project_directory
# Modify environment variables in the Dockerfile
vi Dockerfile
# Create a Docker image called gameservice
docker build -t gameservice --build-arg Port <port> .
# Run the image in detached mode
docker run -p <running_port>:<port> -d paymentservice
```

Node
```shell
# Navigate to project directory
cd project_directory
# Install dependencies
npm install
# Create .env file
node tools/setup_env.js
# Set environment variable
	# Windows Powershell
    	$env:NODE_ENV = "<name>"
	# Windows CMD
	SET NODE_ENV=<name>
# Run the server
node src/app.js

# If you're using a linux terminal you run
# it when you set the environment variable
NODE_ENV=<name> node src/app.js
```

If you don't have the reward and user info service running you will need to use the "production" as the value for the "ENVIRONMENT" variable in the .env file. The server will give back a user that can play and has 10 game tokens so that you can test the game when running with "dev" and "test" as value for the "ENVIRONMENT" variable. At the moment the game service has not been tested with the user and reward service. Code has been written to talk to the reward service but haven't been tested

You can now connect to the service at localhost:port/"gameservice address set in env file".


## Developing

### Built With

Javascript  
NodeJS 11.3.0  
dotenv: 6.1.0  
expressjs: 4.16.3  
minimist: 1.2.0  
mocha: 5.2.0  
nunjucks: 3.1.3  
should: 13.2.3  
socket.io: 2.1.1  
superagent: 3.8.3  
winston: 3.1.0  
winston-daily-rotate-file: 3.4.1  
concurrently: 4.0.1  

### Prerequisites

You need [NodeJS](https://nodejs.org) to develop this service.


### Setting up Dev

```shell
# Clone repository from github
git clone https://github.com/DAT210/Game.git
# Navigate to it
cd Game/
# Install dependencies
npm install
# Create dev environment file
	cp ./env/default.dev ./env/dev.env
	vi ./env/dev.env
# Or
	node tools/setup_env.js
```

### Building

Use the steps from installing / getting started 

### Deploying / Publishing

```shell
packagemanager deploy your-project -s server.com -u username -p password
```

## Tests

Before running any tests you need to set up a /env/test.env file with test environment variables.

Windows users have to use PowerShell and run it using `$env:NODE_ENV = "test" ; npm run-script test-win`

Tests are written using the [mocha](https://mochajs.org/) and [should](https://github.com/shouldjs/should.js) framework.

## Style guide

Explain your code style and show how to check it.

## Licensing

State what the license is and how to find the text version of the license.
