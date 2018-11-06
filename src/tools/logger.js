const path = require("path")
const { createLogger, format, transports } = require("winston");
require("winston-daily-rotate-file");

module.exports.getLogger = function setupLogger(environment) {
	const logDir = "logs";
    const temp_path = path.resolve(__dirname, "../", logDir) //Path to logDir where all logs will be saved

	switch(environment){
		case "dev":
			// Will add log file everytime you run the server
			return createLogger({
				// Setup for what the logger should recieve
				level: "silly",
				format: format.combine(
					format.colorize(),
					format.timestamp({
						format: "DD-MM-YYYY HH:mm:ss"
					}),
					format.json()
				),
				transports: [new transports.Console({
					// Setup for the console printing
					level: "silly",
					format: format.combine(
						format.colorize(),
						format.printf(
							info => `[${info.timestamp}] [${info.level}] ${info.message}`
						))
				}), new transports.DailyRotateFile({
					// Setup for log file
					filename: temp_path+`/dev-logs/%DATE%-devlog.json`,
					datePattern: "YYYY-MM-DD"
				})]
			});
		case "test":
			// Will add log file with information from a spesific test run
			return createLogger({
				// Setup for what the logger should recieve
				level: "silly",
				format: format.combine(
					format.colorize(),
					format.timestamp({
						format: "DD-MM-YYYY HH:mm:ss"
					}),
					format.json()
				),
				transports: [new transports.DailyRotateFile({
					// Setup for log file
					filename: temp_path+`/test-logs/%DATE%-testlog.json`,
					datePattern: "YYYY-MM-DD-HH-mm"
				})]
			});
		case "production":
			// Will add a log file every day
			return createLogger({
				// Setup for what the logger should recieve
				level: "silly",
				format: format.combine(
					format.colorize(),
					format.timestamp({
						format: "DD-MM-YYYY HH:mm:ss"
					}),
				  format.json()
			  ),
			  transports: [new transports.Console({
				  // Setup for the console printing
				  level: "silly",
				  format: format.combine(
						format.colorize(),
						format.printf(
						  info => `[${info.timestamp}] [${info.level}] ${info.message}`
						))
				}), new transports.DailyRotateFile({
					// Setup for log file
					filename: temp_path+`/production-logs/%DATE%-log.json`,
					datePattern: "YYYY-MM-DD",
					maxFiles: "31d"
				})]
			});
	}
}