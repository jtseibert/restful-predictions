//*************************************
/**
* @module helpers
* @desc Contains varias frequently used helper methods.
*/
//*************************************
var pg = require('pg')
pg.defaults.ssl = true
pg.defaults.poolSize = 10
//*************************************

/**
* @function query
* @desc Send a query with optional values to the Heroku database.
* @params {string} - query - query formatted as string
* @params values - array of values
* @params callback - callback function to handle query response
* @returns result of query
*/
var query = function query(query, values, callback) {
	q = query
	v = values
	pg.connect(process.env.DATABASE_URL, function pgConnectCallback(err, client, done) {
		//console.log("query is: " + q + ' with values ' + v)
		var query
		if(v != null) {
			query = client.query(q, v, function queryCallback(error) {
				if(error) {
					done()
					callback(error)
				} else {
					query.on("row", function onRowCallback(row, result) {
					result.addRow(row)
					})
					query.on("end", function onEndCallback(result) {
					done()
					callback(result.rows)
					})	
				}
			})
		} else {
			query = client.query(q, function queryCallback(error) {
				if(error) {
					done()
					callback(error)
				} else {
					query.on("row", function onRowCallback(row, result) {
					result.addRow(row)
					})
					query.on("end", function onEndCallback(result) {
					done()
					callback(result.rows)
					})	
				} 
			})
		}
		
	})
}

module.exports.query = query
//*************************************

/**
* @function setOpportunityStatus
* @desc Set the protected and generic fields for every row of an opportunity.
* @param {string} opportunityName - opportunity to mutate
* @param {boolean} status - protected or unprotected
*/
var setOpportunityStatus = function(opportunityName, protectedStatus, genericStatus, callback) {
	query(
		"UPDATE sales_pipeline SET protected = $1, generic = $2 WHERE opportunity = $3",
		[protectedStatus, genericStatus, opportunityName],
		function() {callback()}
	)
}

module.exports.setOpportunityStatus = setOpportunityStatus
//*************************************

/**
* @function appendOpportunityData
* @desc Append current opportunity data to the new opportunity data to prepare for row insertion.
* @param opportunityData - new start_date, probability, project_size
*/
//TODO pass in json instead of array, define global indexes here too
var appendOpportunityData = function(opportunityData, callback) {
	console.log('appendOpportunityData why')
	query(
		"SELECT stage, amount, expected_revenue, close_date, created_date, account_name" +
		" FROM sales_pipeline WHERE opportunity = $1 LIMIT 1",
		[opportunityData[3]],
		function queryCallback(queryData) {
			var indexFriendlyData = [
				queryData[0].stage,
				opportunityData[3],
				queryData[0].amount,
				queryData[0].expected_revenue,
				queryData[0].close_date,
				opportunityData[0],
				opportunityData[1],
				queryData[0].created_date,
				queryData[0].account_name,
				opportunityData[2]
			]
			process.nextTick(function() {callback(indexFriendlyData)})
		}
	)
}

module.exports.appendOpportunityData = appendOpportunityData
//*************************************

/*
* @function deleteOpportunities
* @desc Deletes all rows in sales_pipeline of each opportunity.
* @param {string} opportunities - opportunties to be deleted
* @param callback - callback function
*/
var deleteOpportunities = function(opportunities, callback) {
	console.log(opportunities)
	async.eachSeries(
		opportunities, 
		function deleteOpportunity(opportunity) {
			query(
				"DELETE FROM sales_pipeline WHERE opportunity=$1",
				[opportunity],
				function() {callback(null)}
			)
		},
		function() {callback(null)}
	)
}

module.exports.deleteOpportunities = deleteOpportunities
//*************************************

/**
* @function opportunityCheck
* @desc Checks if the opportunity is currently in the Heroku database
* @param {string} opportunityName - name of opportunity to check
* @param callback - callback function to handle result
* @returns true or false
*/
var opportunityCheck = function(opportunityName, callback) {
	helpers.query(
		"SELECT EXISTS (SELECT opportunity FROM sales_pipeline WHERE opportunity=$1)",
		[opportunityName],
		function(results) {callback(results[0].exists)}
	)
}

module.exports.opportunityCheck = opportunityCheck
//*************************************


