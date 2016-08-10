/**
* @module Pipeline
* @desc 
*/

var async = require('async')
var helpers = require('./helpers')
var moment = require('moment')

// Define global indexes dictated by query to SF
var indexes = {
	STAGE: 0,
	OPPORTUNITY_NAME: 1,
	AMOUNT: 2,
	EXP_AMOUNT: 3,
	CLOSE_DATE: 4,
	START_DATE: 5,
	PROBABILITY: 6,
	CREATED_DATE: 7,
	ACCOUNT_NAME: 8
}
/**
* @function updateDatabase
* @desc Update sales_pipeline database with SF.
* @param {string} accessToken - oauth2 access token
* @param {string} path - Salesforce server url
* @param callback - callback function to handle google sheet sync
*/
var updateDatabase = function(accessToken, path, callback) {
	queryPipeline(accessToken, path, function handlePipelineData(pipelineData) {
		var today = moment().format("MM/DD/YYYY")
		var deleteQuery = "DELETE FROM sales_pipeline WHERE protected = FALSE OR start_date < " 
						+ "'" + today + "'"
		helpers.query(deleteQuery, null, function() {
			// For each row in pipelineData, insert accordingly
			async.eachSeries(pipelineData, insertRows, function() {
				console.log('ALL ROWS DONE')
				callback()
			})
		})
	})
}

module.exports.updateDatabase = updateDatabase
/**
* @function insertRows
* @desc Inserts rows into sales_pipeline for a specific opportunity. The number
of rows inserted is equal to forecast duration * roles in opportunity.
* @param row - 1D array of opportunity data
*/
function insertRows(row, callback) {
	var curRow = row
	helpers.query(
		"SELECT EXISTS (SELECT opportunity FROM sales_pipeline WHERE opportunity=$1)",
		[curRow[indexes.OPPORTUNITY_NAME]],
		function(results) {
			// If exists, the opportunity is protected, only update empty fields
			if(results[0].exists) {
				var updateQuery = "UPDATE sales_pipeline SET stage = $1, amount = $2, "
								+ "expected_revenue = $3, close_date = $4, start_date = $5, "
								+ "probability = $6, created_date = $7, account_name = $8 " 
								+ "WHERE opportunity = $9"

				var updateValues = [
					curRow[indexes.STAGE], 
					curRow[indexes.AMOUNT], 
					curRow[indexes.EXP_AMOUNT],
					curRow[indexes.CLOSE_DATE], 
					curRow[indexes.START_DATE], 
					curRow[indexes.PROBABILITY],
					curRow[indexes.CREATED_DATE], 
					curRow[indexes.ACCOUNT_NAME], 
					curRow[indexes.OPPORTUNITY_NAME]
				]
				helpers.query(updateQuery, updateValues, function() {
					callback(null)
				})
			} else {
				// The opportunity needs to be inserted for every role and week in the default project size
				var getDefaultSizeQuery = "SELECT sizeid, pricehigh, roles_allocations, numweeks " 
				  + "FROM project_size WHERE ABS($1 - pricehigh) = "
				  + "(SELECT MIN(ABS($1 - pricehigh)) FROM project_size)"
				
				helpers.query(
					getDefaultSizeQuery,
				  	[curRow[indexes.AMOUNT]],
				  	function(results) {
				  		// For each role, insert *role duration* rows
				  		// Check for missing amount in opportunity
				  		if(curRow[indexes.AMOUNT] != null) {
					  		var roleAllocations = results[0].roles_allocations
					  		async.eachOfSeries(
					  			roleAllocations, 
					  			function(roleValues, role, callback) {
					  				// Start the counter at a role offset and iterate for duration - offset
					  				var durationCounter = roleValues.offset
					  				var duration = roleValues.duration
					  				var roleStartDate = moment(new Date(curRow[indexes.START_DATE]))
					  				var hours = roleValues.allocation
					  				async.whilst(
					  					function() {return durationCounter <= duration},
					  					function(callback) {
					  						// Temp so roleStartDate is not mutated
					  						var temp = roleStartDate.clone()
					  						var date = temp.add(durationCounter, 'weeks').format('MM/DD/YYYY')
					  						var insertQuery = "INSERT INTO sales_pipeline (opportunity, stage, amount, expected_revenue, "
					  						  + "close_date, start_date, probability, created_date, account_name, role, week, allocation) "
					  						  + "values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)"

					  						var insertValues = [
					  							curRow[indexes.OPPORTUNITY_NAME],
					  						 	curRow[indexes.STAGE],
					  						 	curRow[indexes.AMOUNT],
					  						 	curRow[indexes.EXP_AMOUNT],
					  						 	curRow[indexes.CLOSE_DATE],
					  						 	curRow[indexes.START_DATE],
					  						 	curRow[indexes.PROBABILITY],
					  						 	curRow[indexes.CREATED_DATE],
					  						 	curRow[indexes.ACCOUNT_NAME],
					  						 	role,
					  						 	date,
					  						 	hours
					  						]

					  						helpers.query(
					  							insertQuery,
					  							insertValues,
					  							function() {
					  								durationCounter++
					  								callback(null)
					  							}
					  						)
					  					},
					  					function() {callback(null)}
					  				)
					  			},
					  			function() {callback(null)}
					  		)	
					  	} else {
					  		callback(null)
					  	}		  
				  	}
				)
			}
		}
	)
}

/**
* @function exportToSheets
* @desc Query sales_pipeline database and return all non omitted opportunities
for Google Sheets.
*/
function exportToSheets(callback) {
	// Set up the headers
	var pipelineData = []

	var headers = [[
		"OPPORTUNITY",
		"STAGE",
		"AMOUNT",
		"EXPECTED_AMOUNT",
		"CLOSE_DATE",
		"START_DATE",
		"PROBABILITY",
		"CREATED_DATE",
		"ACCOUNT_NAME",
		"ROLE",
		"WEEK",
		"HOURS"
	]]

	var sheetQuery = 
		"SELECT opportunity, stage, amount, expected_revenue, "
	  + "close_date, start_date, probability, created_date, account_name, "
	  + "role, week, allocation FROM sales_pipeline WHERE omitted = FALSE"

	helpers.query(
		sheetQuery,
		null,
		function(queryData) {
			var values = []
			// Asyncronusly concert result to 2D array
			async.eachOf(queryData, function(opportunity, key, callback) {
				var temp = []
				async.eachOfSeries(opportunity, function(opportunityData, key, callback) {
					// Convert dates for consistency
					if(key == "close_date" || key == "start_date" || key == "created_date" || key == "week") {
						temp.push(moment(new Date(opportunityData)).format("MM/DD/YYYY"))
						process.nextTick(callback)
					} else {
						temp.push(opportunityData)
						process.nextTick(callback)
					}
				},
				 function() {
					values.push(temp)
					process.nextTick(callback)
				})
			},
			function() {
				pipelineData = headers.concat(values)
				process.nextTick(function() {callback(pipelineData)})
			})
		}
	)
}

module.exports.exportToSheets = exportToSheets
/**
* @function queryPipeline
* @params {string} accessToken - oauth2 access token
* @params {string} path - salesforce server url
* @params callback - callback function to handle pipeline data
*/
function queryPipeline(accessToken, path, callback) {
	var sf = require('node-salesforce')
	var moment = require('moment')
	// Set up the sheet headers
	var pipelineData = []

	// Connect to SF
	var conn = new sf.Connection({
	instanceUrl: "https://" + path,
	accessToken: accessToken
	})

	// Execute SOQL query to populate allocationData
	conn.query("SELECT StageName, Name, Amount, ExpectedRevenue, CloseDate, Probability, CreatedDate, Account.Name FROM Opportunity WHERE CloseDate>=2016-08-03")
		.on("record", function(record) {
			var recordData = []
			// Format the date with Moment library for sheet consistency
			recordData.push(
			record.StageName,
			record.Name,
			record.Amount,
			record.ExpectedRevenue,
			moment(new Date(record.CloseDate)).format("MM/DD/YYYY"),
			moment(new Date(record.CloseDate)).day(6).format("MM/DD/YYYY"),
			record.Probability/100,
			moment(new Date(record.CreatedDate)).format("MM/DD/YYYY"),
			record.Account.Name
			)
			pipelineData.push(recordData)
		})
		.on("end", function(query) {
			console.log("total in database : " + query.totalSize);
			console.log("total fetched : " + query.totalFetched);
			process.nextTick(function() {callback(pipelineData)})
		})
		.on("error", function(err) {
			console.log(err);
		})
		.run({ autoFetch : true, maxFetch : 4000 });
}

