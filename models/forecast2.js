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

/**
* Creates an Forecast object with the allocation data as sheetsData, the Sum of Sales Pipeline data as sumSalesPipeline,
* the Sum of Capacity Estimated Hours as capacity, and the 2D array to be returned as returnData
* @function Forecast
* @param pg - the PostgreSQL database object
* @param data - the 2 part JSON received from Google Sheets containing Allocations and sum of Sales Pipeline Estimated Hours
* @param callback - callback function to return the constructed object
*/
function Forecast2(pg, data, callback) {

	this.allocatedData			= data[0]
	this.forecastedData 		= data[1]
	this.numberRolesAllocated 	= data[2]
	this.numberRolesForecasted	= data[3]
	this.allocatedHours 		= data[4]
	this.returnData 			= [['PROJECT',
									'WEEK_DATE',
									'ROLE',
									'ESTIMATED_HOURS',
									'CAPACITY',
									'TYPE']]
	this.capacity

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
	 	objInstance.capacity = roles_hours
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
	objInstance = this

	console.log(this.allocatedData)
	console.log(this.forecastedData)

	// Handle all allocatedData and push to returnData for output
	var prepareAllocated = function(allocatedData, callback){
		async.each(allocatedData, function(row,callback){
			var tempRow = []

			tempRow.push(row.PROJECT)
			tempRow.push(row.WEEK_DATE)
			tempRow.push(row.ROLE)
			tempRow.push(row.ESTIMATED_HOURS)
			tempRow.push('')
			tempRow.push('ALLOCATED')

			if (objInstance.numberRolesForecasted[row.WEEK_DATE]){
				if (objInstance.numberRolesForecasted[row.WEEK_DATE][row.ROLE]){
					if (objInstance.allocatedHours[row.ROLE][row.WEEK_DATE] < objInstance.capacity[row.ROLE].sum)
						tempRow[4] = row.ESTIMATED_HOURS
					else
						tempRow[4] = objInstance.capacity[row.ROLE].sum/objInstance.numberRolesAllocated[row.WEEK_DATE][row.ROLE]
				} else {
					tempRow[4] = objInstance.capacity[row.ROLE].sum/objInstance.numberRolesAllocated[row.WEEK_DATE][row.ROLE]
				}
			} else {
				tempRow[4] = objInstance.capacity[row.ROLE].sum/objInstance.numberRolesAllocated[row.WEEK_DATE][row.ROLE]
			}
			
			objInstance.returnData.push(tempRow)
			process.nextTick(callback)
		},function(){
			process.nextTick(callback)
		})
	}

	// Handle all forecastedData and push to returnData for output
	var prepareForecasted = function(forecastedData, callback){
		async.each(forecastedData, function(row,callback){
			var tempRow = []

			tempRow.push(row.OPPORTUNITY_NAME)
			tempRow.push(row.WEEK_DATE)
			tempRow.push(row.ROLE)
			tempRow.push(row.ESTIMATED_HOURS)
			tempRow.push('')
			tempRow.push('FORECASTED')

			if (objInstance.allocatedHours[row.ROLE]) {
				if (objInstance.allocatedHours[row.ROLE][row.WEEK_DATE]) {
					if ((objInstance.capacity[row.ROLE].sum-objInstance.allocatedHours[row.ROLE][row.WEEK_DATE]) > 0) {
						tempRow[4] = ((objInstance.capacity[row.ROLE].sum
							-objInstance.allocatedHours[row.ROLE][row.WEEK_DATE])
							/objInstance.numberRolesForecasted[row.WEEK_DATE][row.ROLE])
					} else {
						tempRow[4] = 0
					}
				} else {
					tempRow[4] = objInstance.capacity[row.ROLE].sum/objInstance.numberRolesForecasted[row.WEEK_DATE][row.ROLE]
				}
			} else {
				tempRow[4] = objInstance.capacity[row.ROLE].sum/objInstance.numberRolesForecasted[row.WEEK_DATE][row.ROLE]
			}

			objInstance.returnData.push(tempRow)
			process.nextTick(callback)
		},function(){
			process.nextTick(callback)
		})
	}

	async.parallel({
	 	'allocated': prepareAllocated.bind(null, objInstance.allocatedData),
	 	'forecasted': prepareForecasted.bind(null, objInstance.forecastedData)
	}, function(err){
		if(err)
			throw err
	 	process.nextTick(callback)
	})
}

