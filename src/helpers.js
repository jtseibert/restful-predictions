//*************************************
/**
* @module helpers
* @desc Contains varias frequently used helper methods.
*/
//*************************************
var pg = require('pg')
var moment = require('moment')
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
	pg.connect(process.env.DATABASE_URL, function(error, client, done) {
		console.log("query is: " + q + ' with values ' + v)
		if (error) { process.nextTick(function() {callback(error)}) }
		var query
		if(v != null) {
			console.log('entered if v != null')
			query = client.query(q, v, function(error) {
				if(error) {
					done()
					console.log(error)
					errorLog(error)
					process.nextTick(function() {callback(error)})
				} else {
					query.on("row", function(row, result) {
						console.log(row)
						result.addRow(row)
					})
					query.on("end", function(result) {
						console.log(result.rows)
						done()
						process.nextTick(function() {callback(null, result.rows)})
					})	
				}
			})
		} else {
			query = client.query(q, function(error) {
				if(error) {
					done()
					console.log(error)
					errorLog(error)
					process.nextTick(function() {callback(error)})
				} else {
					query.on("row", function(row, result) {
						result.addRow(row)
					})
					query.on("end", function(result) {
						done()
						process.nextTick(function() {callback(null, result.rows)})
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
	async.eachSeries(opportunities,
		function updateStatus(opportunity, callback) {
			query(
				"UPDATE sales_pipeline SET "
				+ "protected = COALESCE($1,protected), "
				+ "generic = COALESCE($2,generic), "
				+ "omitted = COALESCE($3,omitted), "
				+ "attachment = COALESCE($4,attachment) "
				+ "WHERE opportunity = $5",
				[status.protected, status.generic, status.omitted, status.attachment, opportunity],
				function(error) {
					if (error) { process.nextTick(function() {callback(error)}) }
					process.nextTick(callback)
				}
			)
		},
		function(error) {
			if (error) { process.nextTick(function() {callback(error)}) }
			process.nextTick(callback)
		}
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
		function(opportunity, callback) {
			query(
				"DELETE FROM sales_pipeline WHERE opportunity=$1",
				[opportunity],
				function(error) {
					if (error) { process.nextTick(function() {callback(error)}) }
					process.nextTick(callback)
				}
			)
		},
		function(error) {
			if (error) { process.nextTick(function() {callback(error)}) }
			process.nextTick(callback)
		}
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
		function(error, results) {
			if (error) { throw error }
			callback(null, results[0].exists)
		}
	)
}

module.exports.opportunityCheck = opportunityCheck
//*************************************

/**
* @function createWeekAllocations
* @desc takes in weekOffset JSON and applies the offsets to the start date to get each week allocation
* @param {json} weekOffset - json of how many weeks from the start date that the role is estimated the associated hours
* @param {string} startDate - start date of the project
* @param callback - callback function to handle result
* @returns json object: {week: allocation}
*/
var createWeekAllocations = function(weekOffset, startDate, callback) {
	var weekAllocations = {}
	var startDate = moment(new Date(startDate))

	async.eachOf(weekOffset, function(hours, offset, callback){
		var roleStartDate = startDate.clone()
		var weekDate = roleStartDate.add(offset, 'weeks').format('MM/DD/YYYY')

		weekAllocations[weekDate] = hours
		process.nextTick(callback)
	}, function(error){
		if (error) { throw error } 
		process.nextTick(function(){callback(null, weekAllocations)}) 
	})
}

module.exports.createWeekAllocations = createWeekAllocations
//*************************************

/**
* @function errorLog
* @desc Sends all errors to our database
* @param {error} error - error thrown
*/
var errorLog = function(error) {
	console.log('error: '+error.message)
	query(
		"INSERT INTO errors(name,message,stack,time,routine) values($1,$2,$3,$4,$5)",
		[error.name, error.message, error.stack.toString(), new Date(), error.routine],
		function(error, results) { if (error) { throw error } } 
	)
}

module.exports.errorLog = errorLog
//*************************************


