//forecast.js
//output:
	//forecast report as a 2D array
	
module.exports = Forecast

async = require('../node_modules/async')

function Forecast(data) {
	this.rowData 	= data[1]
	this.dataToAdd 	= data[2]
	this.returnData = []
} 

Forecast.prototype.get = function(oauth2, callback) {
	
}

