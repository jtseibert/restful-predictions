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
					console.log(error)
					errorLog(error)
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
					console.log(error)
					errorLog(error)
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
var setOpportunityStatus = function(opportunities, status, callback) {
	console.log('status ' + JSON.stringify(status))
	console.log('opportunities ' + opportunities)
	async.eachSeries(opportunities,
		function updateStatus(opportunity, callback) {
			query(
				"UPDATE sales_pipeline SET protected = $1, generic = $2, omitted = $3 WHERE opportunity = $4",
				[status.protected, status.generic, status.omitted, opportunity],
				function() {callback(null)}
			)
		},
		function() {callback(null)}
	)
}

module.exports.setOpportunityStatus = setOpportunityStatus
//*************************************

/*
* @function deleteOpportunities
* @desc Deletes all rows in sales_pipeline of each opportunity.
* @param {string} opportunities - opportunties to be deleted
* @param callback - callback function
*/
var deleteOpportunities = function(opportunities, callback) {
	async.eachSeries(
		opportunities, 
		function deleteOpportunity(opportunity, callback) {
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
	query(
		"SELECT EXISTS (SELECT opportunity FROM sales_pipeline WHERE opportunity=$1)",
		[opportunityName],
		function(results) {callback(results[0].exists)}
	)
}

module.exports.opportunityCheck = opportunityCheck
//*************************************

/**
* @function errorLog
* @desc Sends all errors to our database
* @param {error} error - error thrown
*/
var errorLog = function(error) {
	query(
		"INSERT INTO errors(name,message,stack,time,routine) values($1,$2,$3,$4,$5)",
		[error.name, error.message, error.stack.toString(), new Date(), error.routine],
		function(results) {} 
	)
	console.log('method: '+arguments.callee.name)
}

module.exports.errorLog = errorLog
//*************************************




