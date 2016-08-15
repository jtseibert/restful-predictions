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
	OPPORTUNITY_NAME: 0,
	AMOUNT: 1,
	EXP_AMOUNT: 2,
	CLOSE_DATE: 3,
	START_DATE: 4,
	PROBABILITY: 5,
	PROJECT_SIZE: 6
}
//*************************************

/**
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
var syncPipelineWithSalesforce = function(accessToken, path, callback) {
	queryPipeline(accessToken, path, function handlePipelineData(pipelineData) {
		var today = moment().format("MM/DD/YYYY")
		var deleteQuery = "DELETE FROM sales_pipeline WHERE protected = FALSE OR start_date < " 
						+ "'" + today + "'"
		helpers.query(deleteQuery, null, function deleteQueryCallback() {
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
	helpers.query(
		"SELECT EXISTS (SELECT opportunity FROM sales_pipeline WHERE opportunity=$1)",
		[curRow[indexes.OPPORTUNITY_NAME]],
		function(results) {
			if(results[0].exists) {
				updateProtectedOpportunity(curRow, function updateProtectedOpportunityCallback() {
					callback(null)
				})
			} else {
				insertWithDefaultSize(curRow, function insertWithDefaultSizeCallback() {
					callback(null)
				})
			}
		}
	)
}
//*************************************

/**
* @function updateProtectedOpportunity
* @desc Updates opportunity without mutating role or week fields set by 
	the xlsx attachment from a opportunity object in salesforce.
* @param opportunityData - 1D array of opportunity data queried from salesforce
*/
function updateProtectedOpportunity(opportunityData, callback) {
	var updateQuery = "UPDATE sales_pipeline SET amount = $1, "
		+ "expected_revenue = $2, close_date = $3, start_date = $4, "
		+ "probability = $5 " 
		+ "WHERE opportunity = $6"

	var updateValues = [
		opportunityData[indexes.AMOUNT], 
		opportunityData[indexes.EXP_AMOUNT],
		opportunityData[indexes.CLOSE_DATE], 
		opportunityData[indexes.START_DATE], 
		opportunityData[indexes.PROBABILITY],
		opportunityData[indexes.OPPORTUNITY_NAME]
	]
	helpers.query(updateQuery, updateValues, function() {
		callback(null)
	})
}
//*************************************

/** 
* @function insertWithDefaultSize
* @desc Inserts (#roles) rows for an opportunity determined from its default project size.
	*The default project size is determined either:
		*The opportunity amount field from salesforce (if syncing).
		*Determined by the user when manually adding an opportunity from google sheets.
* @param opportunityData - 1D array of opportunity data either:
	*Queried from salesforce (if syncing).
	*Set by user from google sheets when adding new opportunities.
*/
var insertWithDefaultSize = function(opportunityData, callback) {
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
	  	function(results) {
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
		  				var week_allocations = {}
		  				async.whilst(
		  					function() {return durationCounter <= duration},
		  					function(callback) {
		  						// Temp so roleStartDate is not mutated
		  						var temp = roleStartDate.clone()
		  						var date = temp.add(durationCounter, 'weeks').format('MM/DD/YYYY')
		  						week_allocations[date] = hours
		  						durationCounter++
		  						callback()
		  					},
		  					//async.whilst callback
		  					function() {
								var insertValues = [
		  							opportunityData[indexes.OPPORTUNITY_NAME],
		  						 	opportunityData[indexes.AMOUNT],
		  						 	opportunityData[indexes.EXP_AMOUNT],
		  						 	opportunityData[indexes.CLOSE_DATE],
		  						 	opportunityData[indexes.START_DATE],
		  						 	opportunityData[indexes.PROBABILITY],
		  						 	role,
		  						 	week_allocations,
		  						 	results[0].sizeid
		  						]
		  						helpers.query("INSERT INTO sales_pipeline "
		  							+ "(opportunity, amount, expected_revenue, "
		  							+ "close_date, start_date, probability, "
		  							+ "role, week_allocations, project_size) VALUES "
		  							+ "($1, $2, $3, $4, $5, $6, $7, $8, $9)",
		  							insertValues,
		  							function() {callback(null)}
		  						)
		  					}
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

module.exports.insertWithDefaultSize = insertWithDefaultSize
//*************************************

/**
* @function exportToSheets
* @desc Query sales_pipeline database and return all non-omitted opportunities.
*/
var exportToSheets = function(callback) {
	// Set up the headers
	var pipelineData = []
	var headers = [[
		"OPPORTUNITY",
		"AMOUNT",
		"EXPECTED_AMOUNT",
		"CLOSE_DATE",
		"START_DATE",
		"PROBABILITY",
		"ROLE",
		"WEEK",
		"HOURS"
	]]
	var sheetQuery = 
		"SELECT opportunity, amount, expected_revenue, "
	  + "close_date, start_date, probability, "
	  + "role, week_allocations FROM sales_pipeline WHERE omitted = FALSE"

	helpers.query(
		sheetQuery,
		null,
		function(queryData) {
			var values = []
			// Asyncronusly convert result to 2D array
			async.each(queryData, function(opportunity, callback) {
				// Opportunity is {opp: name, ... , role: role, week_allocations: {...}}
				var formattedCloseDate = moment(new Date(opportunity.close_date)).format("MM/DD/YYYY")
				var formattedStartDate = moment(new Date(opportunity.start_date)).format("MM/DD/YYYY")
				async.eachOf(opportunity.week_allocations, function(hours, week, callback) {
					var temp = [
						opportunity.opportunity,
						opportunity.amount,
						opportunity.expected_revenue,
						formattedCloseDate,
						formattedStartDate,
						opportunity.probability*100,
						opportunity.role,
						moment(new Date(week)).format("MM/DD/YYYY"),
						hours
					]
					values.push(temp)
					process.nextTick(function() {callback(null)})
				},
				function() {
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
		"SELECT Name, Amount, ExpectedRevenue, CloseDate, Probability "
	  + "FROM Opportunity WHERE CloseDate>=" + today

	// Execute SOQL query to populate pipelineData
	conn.query(pipelineQuery)
		.on("record", function(record) {
			var recordData = []
			// Format the date with Moment library for sheet consistency
			recordData.push(
			record.Name,
			record.Amount,
			record.ExpectedRevenue,
			moment(new Date(record.CloseDate)).format("MM/DD/YYYY"),
			moment(new Date(record.CloseDate)).day(6).format("MM/DD/YYYY"),
			record.Probability/100
			)
			pipelineData.push(recordData)
		})
		.on("end", function(query) {
			console.log("total in database : " + query.totalSize);
			console.log("total fetched : " + query.totalFetched);
			process.nextTick(function() {callback(pipelineData)})
		})
		.on("error", function(err) {
			process.nextTick(function() {callback(err)})
		})
		.run({ autoFetch : true, maxFetch : 4000 });
}
//*************************************

/**
* @function syncWithDefaultSizes
* @desc Syncs every opportunity with default project sizes with the new project sizes.
Method fires when a project size is added, removed, or updated via google sheets,
or when a pipeline opportunity start date / probability is changed.
* @param callback - callback function
*/
function syncWithDefaultSizes(callback) {
	helpers.query(
		"SELECT DISTINCT opportunity FROM sales_pipeline WHERE project_size IS NOT NULL",
		null,
		function(queryData) {
			async.eachSeries(queryData, function updateWithNewSize(opportunityKey, callback) {
				helpers.query(
					"SELECT opportunity, amount, expected_revenue, close_date, " +
					"start_date, probability " +
					"FROM sales_pipeline where opportunity = $1 LIMIT 1",
					[opportunityKey.opportunity],
					function(queryData) {
						// Data is returned as an array of 1 element, grab said element
						var temp = queryData[0]
						if(temp.amount == null) {
							callback(null)
						} else {
							helpers.deleteOpportunities([temp.opportunity], function() {
								// Format opportunity to match index for default insertion
								var opportunityData = [
									temp.opportunity,
									temp.amount,
									temp.expected_revenue,
									moment(new Date(temp.close_date)).format("MM/DD/YYYY"),
									moment(new Date(temp.start_date)).format("MM/DD/YYYY"),
									temp.probability
								]
								insertWithDefaultSize(opportunityData, function() {
									callback(null)
								})
							})
						}
					}
				)
			},
			function() {
				callback(null)
			})
		}
	)
}

module.exports.syncWithDefaultSizes = syncWithDefaultSizes
















