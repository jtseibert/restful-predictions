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
module.exports = Forecast2

// module level variables
async = require('../node_modules/async')
moment = require('../node_modules/moment')

/**
* Creates an Forecast object with the allocation data as sheetsData, the Sum of Sales Pipeline data as sumSalesPipeline,
* the Sum of Capacity Estimated Hours as capacity, and the 2D array to be returned as returnData
* @function Forecast
* @param pg - the PostgreSQL database object
* @param data - the 2 part JSON received from Google Sheets containing Allocations and sum of Sales Pipeline Estimated Hours
* @param callback - callback function to return the constructed object
*/
function Forecast2(pg, data, callback) {

	this.allocatedHours			= data[0]
	this.forecastedHours 		= data[1]
	this.returnData 			= [['ROLE',
									'WEEK_DATE',
									'ALLOCATED_HOURS',
									'FORECASTED_HOURS',
									'CAPACITY']]
	this.roleCapacities
	this.weeks

	objInstance = this

	var one = function(callback){
		pg.connect(process.env.DATABASE_URL, function(err, client, done) {
			roleCapacities = {}
			if (err)
				console.log(err)
			var query = client.query('SELECT * FROM roles_capacities')
			query.on("row", function (row, result) {
				roleCapacities[row.role] = row.capacity
			})
			query.on("end", function (result) {
				process.nextTick(function(){callback(null, roleCapacities)})
			})
		})
	},
	two = function(callback){
		var today = moment(new Date()).day(-1),
			forecastedWeeks = 26,
			weeks = []

		async.times(forecastedWeeks, function(n,next){
			weeks.push(today.format('L'))
			today = today.add(7,'d')
			process.nextTick(function(){next()})
		}, function(){
			process.nextTick(function(){callback(null, weeks)})
		})
	}

	async.parallel({
	 	'one': one,
	 	'two': two
	}, function(err, results){
	 	objInstance.roleCapacities = results.one
	 	objInstance.weeks = results.two
	 	process.nextTick(callback)
	})
} 

/**
* Adds all of allocation data and Sum of Capacity Estimated Hours and Sum of Sales Pipeline Estimated hours
to the same 2D array to send to Google Sheets. Create is executed asyncronously on every role.
* @function create
* @param callback - callback function to return final array
*/
Forecast2.prototype.create = function(callback) {

	var objInstance = this

	async.eachOf(objInstance.roleCapacities, function(capacity, role, callback){
		var role = role,
			capacity = capacity
		console.log('outerCap: '+capacity)
		async.each(objInstance.weeks, function(week,callback){
			cosole.log('innerCap: '+capacity)
			var tempRow = []

			tempRow.push(role)
			tempRow.push(week)

			if (objInstance.allocatedHours[role]){
				if (objInstance.allocatedHours[role][week]){
					tempRow.push(objInstance.allocatedHours[role][week])
				} else { tempRow.push(0) }
			} else { tempRow.push(0) }

			if (objInstance.forecastedHours[role]){
				if (objInstance.forecastedHours[role][week]){
					tempRow.push(objInstance.forecastedHours[role][week])
				} else { tempRow.push(0) }
			} else { tempRow.push(0) }

			tempRow.push(objInstance.capacity)
			objInstance.returnData.push(tempRow)
			process.nextTick(callback)
		}, function(){
			process.nextTick(callback)
		})
	}, function(){
		process.nextTick(callback)
	})
}

