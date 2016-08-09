/**
* @module xlsx
* @desc Handles forecasted opportunity data from xlsx parser.
*/

var helpers = require('./helpers')
var async     = require('async')
/**
* @function updateDatabase
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
		async.eachSeries(role, function(weekAllocations, callback){
			// Make a new row for every week in the weekAllocations
			console.log('made it befroe change')
			async.eachOfSeries(role.weekAllocations, function(allocation, week, callback) {	
				helpers.query(
					"INSERT INTO sales_pipeline(opportunity, role, week, allocation, protected) values($1, $2, $3, $4, $5)",
					[opportunityName, roleKey, week, allocation, true],
					function() { process.nextTick(callback) }
				)
			})
		}, function(){ process.nextTick(callback) })
	}, function() { 
		process.nextTick(function(){ callback('Update Finished')})
	})
}

/*
* @function deleteOpportunity
* @desc Deletes all rows in sales_pipeline with of a opportunity.
* @param {string} opportunityName - opportunity to be deleted
* @param callback - callback to handle updating
*/
function deleteOpportunity(opportunityName, callback) {
	helpers.query(
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
	helpers.query(
		"SELECT EXISTS (SELECT opportunity FROM sales_pipeline WHERE opportunity=$1)",
		[opportunityName],
		function(results) {callback(results[0].exists)}
	)
}

module.exports.updateDatabase = updateDatabase





