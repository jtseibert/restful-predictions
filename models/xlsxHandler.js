/**
* @module xlsx
* @desc Handles forecasted opportunity data from xlsx parser.
*/

var utilities = require('./utilities')
var async     = require('async')
/**
* @function updateOpportunity
* @desc Update the opportunity stored in Heroku database.
* @param opportunityData - JSON format object of opportunity name and xlsx data
* @param callback - callback to handle status
*/
var updateDatabase = function(opportunityData, callback) {
	databaseCheck(opportunityData.opportunityName, function(inDatabase) {
		if(inDatabase) {
			deleteOpportunity(opportunityData.opportunityName, function() {
				updateOpportunity(opportunityData, function(status) {
					callback({message: status})
				})
			})
		} else {
			updateOpportunity(opportunityData, function(status) {
				callback({message: status})
			})
		}
	})
}

/**
* @function updateOpportunity
* @desc Updates sales_pipeline database with opportunity xlsx data.
* @param opportunityData - JSON format object of xlsx data and opportunity name
* @param callback - callback function to handle status
*/
function updateOpportunity(opportunityData, callback) {
	var sheetData = opportunityData.sheetData
	var opportunityName = opportunityData.opportunityName
	async.eachOfSeries(sheetData, function insertRole(role, roleKey, callback) {
		//for(var number in role) {
		async.eachSeries(role, function(weekAllocations, callback){
			utilities.query(
				"INSERT INTO sales_pipeline(opportunity, role, week_allocations, protected) values($1, $2, $3, $4)",
				[opportunityName, roleKey, weekAllocations, true],
				function(results) { process.nextTick(callback) }
			)
		}, function(){ process.nextTick(callback) })
	}, function() { process.nextTick(function(){ callback('Update Finished')}) })
}

/*
* @function deleteOpportunity
* @desc Deletes all rows in sales_pipeline with of a opportunity.
* @param {string} opportunityName - opportunity to be deleted
* @param callback - callback to handle updating
*/
function deleteOpportunity(opportunityName, callback) {
	utilities.query(
		"DELETE FROM sales_pipeline WHERE opportunity=$1",
		[opportunityName],
		function() {callback()}
	)
}

/**
* @function isInDatabase
* @desc Checks if the opportunity is already in the Heroku database
* @param {string} opportunityName - name of opportunity to check
* @param callback - callback function to handle result
* @returns true or false
*/
function databaseCheck(opportunityName, callback) {
	utilities.query(
		"SELECT EXISTS (SELECT opportunity FROM sales_pipeline WHERE opportunity=$1)",
		[opportunityName],
		function(results) {callback(results[0].exists)}
	)
}

module.exports.updateDatabase = updateDatabase





