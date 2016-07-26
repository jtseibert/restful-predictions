/**
* Forecast
* @module Forecast
* @desc The forecast module is responsible for receiving the allocation data from Google Sheets and creating
the final forecasting sheet.
The forecast data is organized into a 2D array and passed down to Google Sheets.
Role, Week Date, Name, Contact ID, Project, Allocated Estimated Hours, Sum of Allocated Estimated Hours,
and Sum of Sales Pipeline Estimated Hours are received from Google Sheets.
Sum of Capacity Estimated Hours is queried from the PostgreSQL database and appended along with
Sum of Allocated Estimated Hours to the original Allocation report recieved and sent back to Google Sheets
*/	
module.exports = Forecast

// module level variables
async = require('../node_modules/async')

/**
* Creates an Forecast object with the allocation data as sheetsData, the Sum of Sales Pipeline data as sumSalesPipeline,
* the Sum of Capacity Estimated Hours as sumCapacity, and the 2D array to be returned as returnData
* @function Forecast
* @param pg - the PostgreSQL database object
* @param data - the 2 part JSON received from Google Sheets containing Allocations and sum of Sales Pipeline Estimated Hours
* @param callback - callback function to return the constructed object
*/
function Forecast(pg, data, callback) {

	this.sheetsData 		= data[0]
	this.sumSalesPipeline 	= data[1]
	this.returnData 		= [['ROLE',
								'WEEK_DATE',
								'NAME',
								'CONTACT_ID',
								'PROJECT',
								'ALLOCATED_ESTIMATED_HOURS',
								'SUM_AEH',
								'SUM_SALES_PIPELINE_ESTIMATED_HOURS',
								'SUM_CAPACTIY_ESTIMATED_HOURS']]
	this.sumCapacity
	objInstance = this

	var one = function(callback){
		pg.connect(process.env.DATABASE_URL, function(err, client, done) {
			roles_hours = {}
			if (err)
				console.log(err)
			var query = client.query('SELECT * FROM roles_hours')
			query.on("row", function (row, result) {
				roles_hours[row.role] = {'reports_to': row.reports_to, 'sum': row.sum}
			})
			query.on("end", function (result) {
				process.nextTick(function(){callback(null, roles_hours)})
			})
		})
	}

	async.parallel({
	 	'one': one
	}, function(err, results){
	 	objInstance.sumCapacity = roles_hours
	 	process.nextTick(callback)
	})
} 

/**
* Adds all of allocation data and Sum of Capacity Estimated Hours and Sum of Sales Pipeline Estimated hours
to the same 2D array to send to Google Sheets. Create is executed asyncronously on every role.
* @function create
* @param callback - callback function to return final array
*/
Forecast.prototype.create = function(callback) {
	objInstance = this

	console.log(objInstance.sumSalesPipeline)

	async.each(objInstance.sheetsData, function(row, callback){
		var tempRow = []
		var newData = []
		async.eachOfSeries(row, function(value, valueKey, callback){
			if (valueKey == 5 || valueKey == 6)
				tempRow.push(value*-1)
			else
				tempRow.push(value)
			process.nextTick(callback)
		}, function(){
			//if(!objInstance.sumSalesPipeline[row[0]][row[1]])
			console.log('role: '+row[0]+'\t\tweek: '+row[1])
			tempRow.push(((objInstance.sumSalesPipeline[row[0]][row[1]]) || 0)* -1)
			tempRow.push(objInstance.sumCapacity[row[0]].sum)
			objInstance.returnData.push(tempRow)
			process.nextTick(callback)
		})
	}, function(err){
		if (err)
			console.log(err)
		process.nextTick(callback)
	})
}

