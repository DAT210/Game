var should = require("should");
var io = require("socket.io-client");
const env = require('../src/tools/environment.js')
if (!env.load()) { return; };
if (!env.validate()) { return; };

var socketURL = `http://localhost:${process.env.PORT}`;

var options ={
  transports: ["websocket"],
  "force new connection": true
};

describe("Testing normal functions", function(){
	it("testing", function(done){
		let i = 1;
		i.should.eql(1);
		done();
	})
});