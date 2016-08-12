//*************************************
/**
* @module Pipeline
* @desc Contains methods to:
	*Sync pipeline table with salesforce:
		*Grab sales pipeline data from salesforce,
		*Update protected opportunities,
		*Insert new opportunities with default sizes.
	*Handle user adding and updating opportunities.
	*Handle user adding and updating default project sizes.
	*Export pipeline table information to Google Sheets.
*/
//*************************************
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
	ACCOUNT_NAME: 8,
	PROJECT_SIZE: 9
}
/*************************************
* @function syncPipelineWithSalesforce
* @desc Syncs the sales_pipeline database with salesforce.
    *All non-protected opportunities are deleted from the database.
    *All opportunities that are now projects are deleted from the database.
    *Protected opportunities are updated.
    *New opportunities are inserted with default project sizes.
* @param {string} accessToken - oauth2 access token
* @param {string} path - Salesforce server url
* @param callback - callback function to handle google sheet sync
*/
function syncPipelineWithSalesforce(accessToken, path, callback) {
	queryPipeline(accessToken, path, function queryPipelineCallback(pipelineData) {
		var today = moment().format("MM/DD/YYYY")
		var deleteQuery = "DELETE FROM sales_pipeline WHERE protected = FALSE OR start_date < " 
						+ "'" + today + "'"
		helpers.query(deleteQuery, null, function queryCallback() {
			// For each row in pipelineData, sync accordingly
			async.eachSeries(pipelineData, syncRows, function syncRowsCallback() {
				console.log('ALL ROWS DONE')
				callback(null)
			})
		})
	})
}

module.exports.syncPipelineWithSalesforce = syncPipelineWithSalesforce
//*************************************

/**
* @function syncRows
* @desc Inserts or updates rows of sales_pipeline for a specific opportunity.
    *Updates when opportunity exists (opportunity is protected).
    *Inserts with default project size when opportunity does not exist.
* @param row - 1D array of opportunity data
*/
function syncRows(row, callback) {
	var curRow = row
	console.log('anme is ' + curRow[indexes.OPPORTUNITY_NAME])
	if(curRow[indexes.OPPORTUNITY_NAME] != null || curRow[indexes.OPPORTUNITY_NAME != ""]) {
		helpers.opportunityCheck(curRow[indexes.OPPORTUNITY_NAME], function opportunityCheckCallback(exists) {
			if(exists) {
				updateProtectedOpportunity(curRow, function updateProtectedOpportunityCallback() {
					callback(null)
				})
			} else {
				insertWithDefaultSize(curRow, function insertWithDefaultSizeCallback() {
					callback(null)
				})
			}
		})
	} else {
		callback(null)
	}
}
//*************************************

/**
* @function updateProtectedOpportunity
* @desc Updates opportunity without mutating role or week fields set by 
	the xlsx attachment from a opportunity object in salesforce.
* @param opportunityData - 1D array of opportunity data queried from salesforce
*/
function updateProtectedOpportunity(opportunityData, callback) {
	var updateQuery = "UPDATE sales_pipeline SET stage = $1, amount = $2, "
		+ "expected_revenue = $3, close_date = $4, start_date = $5, "
		+ "probability = $6, created_date = $7, account_name = $8 " 
		+ "WHERE opportunity = $9"

	var updateValues = [
		opportunityData[indexes.STAGE], 
		opportunityData[indexes.AMOUNT], 
		opportunityData[indexes.EXP_AMOUNT],
		opportunityData[indexes.CLOSE_DATE], 
		opportunityData[indexes.START_DATE], 
		opportunityData[indexes.PROBABILITY],
		opportunityData[indexes.CREATED_DATE], 
		opportunityData[indexes.ACCOUNT_NAME], 
		opportunityData[indexes.OPPORTUNITY_NAME]
	]
	helpers.query(updateQuery, updateValues, function queryCallback() {
		callback(null)
	})
}
//*************************************

/** 
* @function insertWithDefaultSize
* @desc Inserts (#roles * #weeks) rows for an opportunity determined from its default project size.
	*The default project size is determined either:
		*The opportunity amount field from salesforce (if syncing).
		*Determined by the user when manually adding an opportunity from google sheets.
* @param opportunityData - 1D array of opportunity data either:
	*Queried from salesforce (if syncing).
	*Set by user from google sheets when adding new opportunities.
*/
function insertWithDefaultSize(opportunityData, callback) {
	var getDefaultSizeQuery
	var defaultSizeQueryValues
	if(opportunityData[indexes.PROJECT_SIZE] === undefined) {
		getDefaultSizeQuery = "SELECT sizeid, pricehigh, roles_allocations, numweeks " 
	 	+ "FROM project_size WHERE ABS($1 - pricehigh) = "
	 	+ "(SELECT MIN(ABS($1 - pricehigh)) FROM project_size)"
	 	defaultSizeQueryValues = [opportunityData[indexes.AMOUNT]]
	} else {
	 	getDefaultSizeQuery = "SELECT sizeid, pricehigh, roles_allocations, numweeks "
			+ "FROM project_size WHERE sizeid = $1"
		defaultSizeQueryValues = [opportunityData[indexes.PROJECT_SIZE]]
	}
	helpers.query(
		getDefaultSizeQuery,
	  	defaultSizeQueryValues,	  	
	  	function queryCallback(results) {
	  		// For each role, insert *role duration* rows
	  		// Check for missing amount in opportunity
	  		if(opportunityData[indexes.AMOUNT] != null || opportunityData[indexes.PROJECT_SIZE] != undefined) {
		  		var roleAllocations = results[0].roles_allocations
		  		async.eachOfSeries(
		  			roleAllocations, 
		  			function(roleValues, role, callback) {
		  				// Start the counter at a role offset and iterate for duration - offset
		  				var durationCounter = roleValues.offset
		  				var duration = roleValues.duration
		  				var roleStartDate = moment(new Date(opportunityData[indexes.START_DATE]))
		  				var hours = roleValues.allocation
		  				async.whilst(
		  					function() {return durationCounter <= duration},
		  					function(callback) {
		  						// Temp so roleStartDate is not mutated
		  						var temp = roleStartDate.clone()
		  						var date = temp.add(durationCounter, 'weeks').format('MM/DD/YYYY')
		  						var insertQuery = "INSERT INTO sales_pipeline (opportunity, stage, amount, expected_revenue, "
		  						  + "close_date, start_date, probability, created_date, account_name, role, week, allocation, project_size) "
		  						  + "values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)"

		  						var insertValues = [
		  							opportunityData[indexes.OPPORTUNITY_NAME],
		  						 	opportunityData[indexes.STAGE],
		  						 	opportunityData[indexes.AMOUNT],
		  						 	opportunityData[indexes.EXP_AMOUNT],
		  						 	opportunityData[indexes.CLOSE_DATE],
		  						 	opportunityData[indexes.START_DATE],
		  						 	opportunityData[indexes.PROBABILITY],
		  						 	opportunityData[indexes.CREATED_DATE],
		  						 	opportunityData[indexes.ACCOUNT_NAME],
		  						 	role,
		  						 	date,
		  						 	hours,
		  						 	results[0].sizeid
		  						]
		  						helpers.query(
		  							insertQuery,
		  							insertValues,
		  							function queryCallback() {
		  								durationCounter++
		  								callback(null)
		  							}
		  						)
		  					},
		  					function() {callback(null)}
		  				)
		  			},
		  			callback(null)
		  		)	
		  	} else {
		  		callback(null)
		  	}		  
	  	}
	)
}

module.exports.insertWithDefaultSize = insertWithDefaultSize
//*************************************

/**
* @function exportToSheets
* @desc Query sales_pipeline database and return all non-omitted opportunities.
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
		function queryCallback(queryData) {
			var values = []
			// Asyncronusly convert result to 2D array
			async.eachOf(queryData, function(opportunity, key, callback) {
				var temp = []
				async.eachOfSeries(opportunity, function(opportunityData, key, callback) {
					// Convert dates for consistency
					if(key == "close_date" || key == "start_date" || key == "created_date" || key == "week") {
						temp.push(moment(new Date(opportunityData)).format("MM/DD/YYYY"))
						callback(null)
					} else {
						temp.push(opportunityData)
						callback(null)
					}
				},
				 function() {
					values.push(temp)
					callback(null)
				})
			},
			function() {
				pipelineData = headers.concat(values)
				callback(pipelineData)
			})
		}
	)
}

module.exports.exportToSheets = exportToSheets
//*************************************

/**
* @function queryPipeline
* @desc Query salesforce to obtain sales pipeline data.
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

	var today = moment(new Date).format("YYYY-MM-DD")
	// Constraint where opportunity has not closed as of current date
	var pipelineQuery = 
		"SELECT StageName, Name, Amount, ExpectedRevenue, CloseDate, Probability, "
	  + "CreatedDate, Account.Name FROM Opportunity WHERE CloseDate>="
	  + today

	// Execute SOQL query to populate pipelineData
	conn.query(pipelineQuery)
		.on("record", function onRecordCallback(record) {
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
		.on("end", function onEndCallback(query) {
			console.log("total in database : " + query.totalSize);
			console.log("total fetched : " + query.totalFetched);
			callback(pipelineData)
		})
		.on("error", function onErrorCallback(err) {
			callback(err)
		})
		.run({ autoFetch : true, maxFetch : 4000 });
}
//*************************************

















