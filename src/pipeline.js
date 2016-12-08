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
var pg = require('pg')

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
*/
var syncPipelineWithSalesforce = function(accessToken, path, callback) {
	// Declare the variables needed
	var accessToken = accessToken,
		path = path,
		closedWonQuery,
		allocated,
		currentDB,
		newPipelineData

	// Call queryPipeline to get the fresh sales pipeline from salesforce
	queryPipeline(accessToken, path, function(error, pipelineData) {
		if (error) { process.nextTick(function() {callback(error)}) }

		// Store fresh sales pipeline here for scoping reasons
		newPipelineData = pipelineData


		var fnOne = function(accessToken, path, callback) {
				// Call all three query functions to get the jsonArrays
				// for populating the variables
				async.parallel({
					one: async.apply(getClosedWon, accessToken, path),
					two: getCurDB,
					three: async.apply(getAllocated, accessToken, path)
				}, function(error, results) {
					if (error) { process.nextTick(function() {callback(error)}) } 
					else {
						// Data was returned successfully, populate variables
						closedWonQuery = results.one
						currentDB = results.two
						allocated = results.three
						process.nextTick(callback)
					}
				})
			},
			fnTwo = function(callback) {
				// Loop through each opportunity currently in the Heroku sales pipeline
				async.eachOfSeries(currentDB, function(fields, oppName, callback) {
					oppName = oppName
					name = oppName.replace("'","''")
					var today = moment(new Date).format("YYYY-MM-DD")

					// Check if the close date on the opportunity has passed
					// and that the opportunity is not generic
					// or if the opportunity is not protected and doesn't have
					// an estimate attached
					if (moment(fields.closeDate).format("YYYY-MM-DD") < today
						&& fields.generic == false) {
						// Opportunity's close date has passed.
						// Check if current opportunity is in the Heroku sales pipeline,
						// in the closedWonQuery, and not currently allocated.
						// If the above is true, we want to retain the opportunity.
						// If the above is false, we want to delete the opportunity.
						if (!(currentDB[oppName] != false 
							&& closedWonQuery[oppName] != false
							&& allocated[oppName] == false )) {
							
							// Opportunity was not in the current sales pipeline in the database,
							// or not in the closedWonQuery, or was already allocated.
							// Therefore we need to delete it from the Heroku sales pipeline
							if (name === "3M - Newsroom Marketing Cloud Functionality") {
								console.log('DELETING IT1!')
								console.log('currentDB[oppName] = '+currentDB[oppName])
								console.log('closedWonQuery[oppName] = '+closedWonQuery[oppName])
								console.log('allocated[oppName] = '+allocated[oppName])
							}
							helpers.query(
								"DELETE FROM sales_pipeline WHERE opportunity = '"+name+"'",
								null,
								function(error) {
									if (error) { process.nextTick(function() {callback(error)}) }
									else { process.nextTick(callback) }
								})
						} else {
							// Opportunity was in the Heroku sales pipeline,
							// in the closedWonQuery, and not already allocated.
							// Therefore, retain the opportunity
							process.nextTick(callback)
						}
					} else if (fields.protected == false && fields.attachment == false) {
						// Opportunity was not protected and did not have an
						// estimate attached. Deleting from Heroku sales pipeline
						// to refresh the database
						if (name === "3M - Newsroom Marketing Cloud Functionality") {
								console.log('DELETING IT2!')
						}
						helpers.query(
							"DELETE FROM sales_pipeline WHERE opportunity = '"+name+"'",
							null,
							function(error) {
								if (error) { process.nextTick(function() {callback(error)}) }
								else { process.nextTick(callback) }
							})
					}
				}, function(error) {
					// We have gone through all opportunities that were
					// in the Heroku sales pipeline
					if (error) { process.nextTick(function() {callback(error)}) }
					else { process.nextTick(callback) }
				})
			}

		async.series({
			one: async.apply(fnOne, accessToken, path),
			two: fnTwo
		}, function(error) {
			// All opportunities that needed to be cleared out of the
			// Heroku sales pipeline are gone, call syncRows on all
			// opportunities in the fresh sales pipeline data from SF
			if (error) { process.nextTick(function() {callback(error)}) }
			else {
				async.eachSeries(newPipelineData, syncRows, function(error) {
					if (error) { process.nextTick(function() {callback(error)}) }
					else { process.nextTick(callback) }
				})
			}
		})
	})
}

module.exports.syncPipelineWithSalesforce = syncPipelineWithSalesforce
//*************************************

/**
* @function getClosedWon
* @desc 
*/
function getClosedWon(accessToken, path, callback) {
	var sf = require('node-salesforce')
	// Set up the sheet headers
	var closedWonData = {}

	// Connect to SF
	var conn = new sf.Connection({
		instanceUrl: "https://" + path,
		accessToken: accessToken
	})

	var today = moment(new Date).format("YYYY-MM-DD")
	// Constraint where opportunity has not closed as of current date
	var closedWonQuery = 
		"SELECT Name, StageName "
		+ "FROM Opportunity "
		+ "WHERE (StageName != 'Closed Won' "
		+ "AND StageName != 'Closed Lost' "
		+ "AND StageName != 'Won / Active' "
		+ "AND StageName != 'Completed Project' "
		+ "AND CloseDate < " + today + ") "
		+ "OR StageName = 'Closed Won'"

	// Execute SOQL query to populate pipelineData
	conn.query(closedWonQuery)
		.on("record", function(record) {
			closedWonData[record.Name] = record.StageName
			//console.log(record.Name)
		})
		.on("end", function(query) {
			process.nextTick(function() { callback(null, closedWonData) })
		})
		.on("error", function(err) {
			process.nextTick(function() { callback(err) })
		})
		.run({ autoFetch : true, maxFetch : 5000 });


}
//*************************************

/**
* @function getCurDB
* @desc 
*/
function getCurDB(callback) {
	pg.connect(process.env.DATABASE_URL, function(error, client, done) {
			curDBData = {}
			
			if (error) { process.nextTick(function(){callback(error, curDBData)}) }
			
			var query = client.query(
				'SELECT opportunity, close_date, protected, omitted, generic, attachment '
				+ 'FROM sales_pipeline')

			query.on("row", function (row, result) {
				curDBData[row.opportunity] = {
					closeDate: row.close_date,
					protected: row.protected,
					omitted: row.omitted,
					generic: row.generic,
					attachment: row.attachment
				}
			})

			query.on("end", function (result) {
				done()
				process.nextTick(function(){callback(null, curDBData)})
			})
		})
}
//*************************************

/**
* @function getAllocated
* @desc 
*/
function getAllocated(accessToken, path, callback) {
	var sf = require('node-salesforce')
	// Set up the sheet headers
	var allocationData = {}

	// Connect to SF
	var conn = new sf.Connection({
	  instanceUrl: "https://" + path,
	  accessToken: accessToken
	})

	var startDate = moment(new Date).format("YYYY-MM-DD")
	var closeDate = moment(new Date).add(26, 'weeks').format("YYYY-MM-DD")

	allocationQuery = 'SELECT pse__Project__r.Name, COUNT(pse__Start_Date__c) '
		+ 'FROM pse__Est_Vs_Actuals__c '
		+ 'WHERE pse__Estimated_Hours__c>0 '
		+ 'AND pse__Resource__r.pse__Exclude_from_Resource_Planner__c=False '
		+ "AND pse__Project__r.Name!='Internal - Magnet - Admin' "
		+ 'AND pse__End_Date__c>=2016-12-08 '
		+ 'AND pse__End_Date__c<2017-06-07 '
		+ 'AND pse__Resource__r.ContactID_18__c!=null '
		+ 'GROUP BY pse__Project__r.Name'

	// Execute SOQL query to populate allocationData
	conn.query(allocationQuery)
	  	.on("record", function(record) {
	  		allocationData[record.Name] = record.expr0
			})
		.on("end", function(query) {
			process.nextTick(function() {callback(null, allocationData)})
			})
		.on("error", function(err) {
			process.nextTick(function() {callback(err)})
			})
		.run({ autoFetch : true, maxFetch : 1000 });
}
//*************************************

/**
* @function syncRows
* @desc Inserts or updates rows of sales_pipeline for a specific opportunity.
    *Updates when opportunity exists (opportunity is protected).
    *Inserts with default project size when opportunity does not exist.
* @param row - 1D array of opportunity data
*/
function syncRows(row, callback) {
	var curRow = row,
		oppName = curRow[indexes.OPPORTUNITY_NAME].replace("'","''")
	helpers.query(
		"SELECT opportunity, protected, attachment FROM sales_pipeline WHERE opportunity='"+oppName+"'",
		null,
		function(error, results) {
			if (error) { throw error }
			if(results[0]) {
				if(results[0].protected) {
					updateProtectedOpportunity(curRow, function(error) {
						if (error) { throw error }
						process.nextTick(callback)
					})
				} else if(results[0].attachment){
					updateAttachmentOpportunity(curRow, function(error) {
						if (error) { throw error }
						process.nextTick(callback)
					})
				}
			} else {
				insertWithDefaultSize(curRow, function(error) {
					if (error) { throw error }
					process.nextTick(callback)
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
		+ "expected_revenue = $2, close_date = $3 WHERE opportunity = $4"

	var updateValues = [
		opportunityData[indexes.AMOUNT], 
		opportunityData[indexes.EXP_AMOUNT],
		opportunityData[indexes.CLOSE_DATE], 
		opportunityData[indexes.OPPORTUNITY_NAME]
	]
	helpers.query(updateQuery, updateValues, function(error) {
		if (error) { throw error }
		process.nextTick(callback)
	})
}
//*************************************

/**
* @function updateProtectedOpportunity
* @desc Updates opportunity without mutating role or week fields set by 
	the xlsx attachment from a opportunity object in salesforce.
* @param opportunityData - 1D array of opportunity data queried from salesforce
*/
function updateAttachmentOpportunity(opportunityData, callback) {
	var updateQuery = "UPDATE sales_pipeline SET amount = $1, "
		+ "expected_revenue = $2, close_date = $3, "
		+ "probability = $4 WHERE opportunity = $5"

	var updateValues = [
		opportunityData[indexes.AMOUNT], 
		opportunityData[indexes.EXP_AMOUNT],
		opportunityData[indexes.CLOSE_DATE],
		opportunityData[indexes.PROBABILITY],
		opportunityData[indexes.OPPORTUNITY_NAME]
	]
	helpers.query(updateQuery, updateValues, function(error) {
		if (error) { throw error }
		process.nextTick(callback)
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
		if(opportunityData[indexes.AMOUNT] === null || opportunityData[indexes.AMOUNT] == undefined) {
			opportunityData[indexes.AMOUNT] = 0
		}
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
	  	function(error, results) {
	  		if (error) { process.nextTick(function() {callback(error)}) }
	  		// For each role, insert *role duration* rows
	  		// Check for missing amount in opportunity
	  		if(opportunityData[indexes.AMOUNT] != null || opportunityData[indexes.PROJECT_SIZE] != undefined) {
		  		var roleAllocations = results[0].roles_allocations
		  		async.eachOfSeries(roleAllocations, function(roleValues, role, callback) {
	  				// Start the counter at a role offset and iterate for duration - offset
	  				var offset = roleValues.offset
	  				var duration = roleValues.duration
	  				var hours = roleValues.allocation
	  				var offset_allocation = {}
	  				async.whilst(
	  					function() {return offset <= duration},
	  					function(callback) {
	  						offset_allocation[offset] = hours
	  						offset++
	  						process.nextTick(callback)
	  					},
	  					//async.whilst callback
	  					function(error) {
	  						if (error) { process.nextTick(function() {callback(error)}) }
							var insertValues = [
	  							opportunityData[indexes.OPPORTUNITY_NAME],
	  						 	opportunityData[indexes.AMOUNT],
	  						 	opportunityData[indexes.EXP_AMOUNT],
	  						 	opportunityData[indexes.CLOSE_DATE],
	  						 	opportunityData[indexes.START_DATE],
	  						 	opportunityData[indexes.PROBABILITY],
	  						 	role,
	  						 	offset_allocation,
	  						 	results[0].sizeid
	  						]
	  						helpers.query("INSERT INTO sales_pipeline "
	  							+ "(opportunity, amount, expected_revenue, "
	  							+ "close_date, start_date, probability, "
	  							+ "role, offset_allocation, project_size) VALUES "
	  							+ "($1, $2, $3, $4, $5, $6, $7, $8, $9)",
	  							insertValues,
	  							function(error) {
	  								if (error) { process.nextTick(function() {callback(error)}) }
	  								process.nextTick(callback)
	  							}
	  						)
	  					}
	  				)
	  			},function(error) {
		  			if (error) { process.nextTick(function() {callback(error)}) }
		  			process.nextTick(callback)
		  		})	
		  	} else {
		  		process.nextTick(callback)
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
		"ESTIMATED_HOURS",
		"ATTACHMENT",
		"GENERIC"
	]]
	var sheetQuery = 
		"SELECT opportunity, amount, expected_revenue, "
	  + "close_date, start_date, probability, "
	  + "role, offset_allocation, attachment, generic FROM sales_pipeline WHERE omitted = FALSE"

	helpers.query(
		sheetQuery,
		null,
		function(error, queryData) {
			if (error) { process.nextTick(function() {callback(error,null)})}
			var values = []
			// Asyncronusly convert result to 2D array
			async.each(queryData, function(opportunity, callback) {
				// Opportunity is {opp: name, ... , role: role, offset_allocation: {...}}
				var formattedCloseDate = moment(new Date(opportunity.close_date)).weekday(6).format("MM/DD/YYYY")
				var formattedStartDate = moment(new Date(opportunity.start_date)).format("MM/DD/YYYY")
				async.eachOf(opportunity.offset_allocation, function(hours, week, callback) {
					var startDate = moment(new Date(opportunity.start_date)).weekday(6)
					var temp = [
						opportunity.opportunity,
						opportunity.amount,
						opportunity.expected_revenue,
						formattedCloseDate,
						formattedStartDate,
						opportunity.probability*100,
						opportunity.role,
						startDate.add(week, 'weeks').format('MM/DD/YYYY'),
						hours * opportunity.probability,
						opportunity.attachment,
						opportunity.generic
					]
					values.push(temp)
					process.nextTick(callback)
				},
				function(error) {
					if (error) { process.nextTick(function() {callback(error)}) }
					process.nextTick(callback)
				})
			},
			function(error) {
				if (error) { process.nextTick(function() {callback(error, null)}) }
				pipelineData = headers.concat(values)
				process.nextTick(function() {callback(null, pipelineData)})
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
	  + "FROM Opportunity WHERE Probability > 0 AND CloseDate>=" + today

	// Execute SOQL query to populate pipelineData
	conn.query(pipelineQuery)
		.on("record", function(record) {
			var recordData = [],
				startDate = moment(new Date(record.CloseDate)).add(28, 'days')
			// Format the date with Moment library for sheet consistency
			recordData.push(
			record.Name,
			record.Amount,
			record.ExpectedRevenue,
			moment(new Date(record.CloseDate)).format("MM/DD/YYYY"),
			startDate.day(6).format("MM/DD/YYYY"),
			record.Probability/100
			)
			pipelineData.push(recordData)
		})
		.on("end", function(query) {
			console.log("total in database : " + query.totalSize);
			console.log("total fetched : " + query.totalFetched);
			process.nextTick(function() {callback(null, pipelineData)})
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
* @param callback - callback function
*/
function syncWithDefaultSizes(callback) {
	helpers.query(
		"SELECT DISTINCT opportunity FROM sales_pipeline WHERE project_size IS NOT NULL",
		null,
		function(error, queryData) {
			if (error) { process.nextTick(function() {callback(error)}) }
			async.eachSeries(queryData, function(opportunityKey, callback) {
				syncSingleOpportunity(opportunityKey.opportunity, function(error) {
					if (error) { process.nextTick(function() {callback(error)}) }
					process.nextTick(callback)
				})
			},
			function(error) {
				if (error) { process.nextTick(function() {callback(error)}) }
				process.nextTick(callback)
			})
		}
	)
}

module.exports.syncWithDefaultSizes = syncWithDefaultSizes
//*************************************

/**
* @function syncSingleOpportunity
* @desc Syncs the opportunity with the current default project sizes.
* @param {string} opportunityName - opportunity to update
* @param callback - callback function
*/

function syncSingleOpportunity(opportunityName, callback) {
	helpers.query(
		"SELECT opportunity, amount, expected_revenue, close_date, " +
		"start_date, probability, protected, omitted, generic " +
		"FROM sales_pipeline where opportunity = $1 LIMIT 1",
		[opportunityName],
		function(error, queryData) {
			if (error) { process.nextTick(function() {callback(error)}) }
			// Data is returned as an array of 1 element,
			var temp = queryData[0]
			if(temp.amount == null) {
				process.nextTick(callback)
			} else {
				helpers.deleteOpportunities([temp.opportunity], function(error) {
					if (error) { process.nextTick(function() {callback(error)}) }
					// Format opportunity to match index for default insertion
					var opportunityData = [
						temp.opportunity,
						temp.amount,
						temp.expected_revenue,
						moment(new Date(temp.close_date)).format("MM/DD/YYYY"),
						moment(new Date(temp.start_date)).format("MM/DD/YYYY"),
						temp.probability
					]
					insertWithDefaultSize(opportunityData, function(error) {
						if (error) { process.nextTick(function() {callback(error)}) }
						helpers.setOpportunityStatus(
							[opportunityName], 
							{protected: temp.protected, omitted: temp.omitted, generic: temp.generic},
							function(error) {
								if (error) { process.nextTick(function() {callback(error)}) }
								process.nextTick(callback)
							}
						)
					})
				})
			}
		}
	)
}

module.exports.syncSingleOpportunity = syncSingleOpportunity
//*************************************











