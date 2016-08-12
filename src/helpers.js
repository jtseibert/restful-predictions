//*************************************
/**
* @module helpers
* @desc Contains varias frequently used datbase helper methods.
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
function query(query, values, callback) {
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
* @function setProtectedStatus
* @desc Set the protected field for every row of an opportunity.
* @param {string} opportunityName - opportunity to mutate
* @param {boolean} status - protected or unprotected
*/
function setProtectedStatus(opportunityName, status, callback) {
	query(
		"UPDATE sales_pipeline SET protected = $1 WHERE opportunity = $2",
		[status, opportunityName],
		function queryCallback() {
			callback(null)
		}
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
function appendOpportunityData(opportunityData, callback) {
	query(
		"SELECT stage, amount, expected_revenue, close_date, created_date, account_name" +
		" FROM sales_pipeline WHERE opportunity = $1 LIMIT 1",
		[opportunityData[3]],
		function queryCallback(queryData) {
			console.log(queryData)
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
			callback(indexFriendlyData)
		}
	)
}

module.exports.appendOpportunityData = appendOpportunityData
//*************************************

/*
* @function deleteOpportunity
* @desc Deletes all rows in sales_pipeline with of a opportunity.
* @param {string} opportunityName - opportunity to be deleted
* @param callback - callback to handle updating
*/
function deleteOpportunity(opportunityName, callback) {
	query(
		"DELETE FROM sales_pipeline WHERE opportunity=$1",
		[opportunityName],
		function queryCallback() {
			callback(null)
		}
	)
}

module.exports.deleteOpportunity = deleteOpportunity
//*************************************

/**
* @function opportunityCheck
* @desc Checks if the opportunity is currently in the Heroku database
* @param {string} opportunityName - name of opportunity to check
* @param callback - callback function to handle result
* @returns true or false
*/
function opportunityCheck(opportunityName, callback) {
	query(
		"SELECT EXISTS (SELECT opportunity FROM sales_pipeline WHERE opportunity=$1)",
		[opportunityName],
		callback(results[0].exists)
	)
}

module.exports.opportunityCheck = opportunityCheck
//*************************************


