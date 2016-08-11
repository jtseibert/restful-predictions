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
					query.on("row", function handleRow(row, result) {
					result.addRow(row)
					})
					query.on("end", function returnResult(result) {
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
					query.on("row", function handleRow(row, result) {
					result.addRow(row)
					})
					query.on("end", function returnResult(result) {
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
* @function setProtectedStatus
* @desc Set the protected field for every row of an opportunity.
* @param {string} opportunityName - opportunity to mutate
* @param {boolean} status - protected or unprotected
*/
var setProtectedStatus = function(opportunityName, status, callback) {
	query(
		"UPDATE sales_pipeline SET protected = $1 WHERE opportunity = $2",
		[status, opportunityName],
		function() {callback()}
	)
}

module.exports.setProtectedStatus = setProtectedStatus
//*************************************

/**
* @function appendOpportunityData
* @desc Append current opportunity data to the new opportunity data to prepare for row insertion.
* @param opportunityData - new start_date, probability, project_size
*/
//TODO pass in json instead of array, define global indexes here too
var appendOpportunityData = function(opportunityData, callback) {
	console.log('got to appenddata')
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
			console.log(indexFriendlyData)
			process.nextTick(function() {callback(indexFriendlyData)})
		}
	)
}

module.exports.appendOpportunityData = appendOpportunityData
//*************************************





