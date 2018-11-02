const path = require("path")
const { createLogger, format, transports } = require("winston");
require("winston-daily-rotate-file");

module.exports.getLogger = function setupLogger() {
	const logDir = "logs";
    const temp_path = path.resolve(__dirname, "../tools/", logDir) //Path to logDir where all logs will be saved

 	const dailyRotateFileTransport = new transports.DailyRotateFile({ //Makes a new log document every day
    		filename: temp_path+`/%DATE%-log.json`,
    		datePattern: "YYYY-MM-DD"
  	});

	const logger = createLogger({
  		level: "info",  //Level is set to info, can change levels if you want to use it to something different feks debug
  		format: format.combine(
      		format.colorize(),
      		format.timestamp({
          		format: "DD-MM-YYYY HH:mm:ss" //Date and time
      		}),
      		format.json()),
		transports: [ new transports.Console({
    		level: "info",
    		format: format.combine(
      		format.colorize(),
      		format.printf(
        		info => `${info.timestamp} : ${info.message}`//How it should look in the log document
      		))
  		}),dailyRotateFileTransport] //Transport command to send it tot the chosen log fil
	});

	return logger;
}