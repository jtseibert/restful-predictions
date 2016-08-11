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
	databaseCheck(opportunityData.opportunityName, function databaseCheckCallback(inDatabase) {
		if(inDatabase) {
			helpers.deleteOpportunity(opportunityData.opportunityName, function deleteOpportunityCallback() {
				updateOpportunityFromXlsx(opportunityData, function callback(status) {
					callback({message: status})
				})
			})
		} else {
			updateOpportunityFromXlsx(opportunityData, function callback(status) {
				callback({message: status})
			})
		}
	})
}

/**
* @function updateOpportunityFromXlsx
* @desc Updates sales_pipeline database with opportunity xlsx data.
* @param opportunityData - JSON format object of xlsx data and opportunity name
* @param callback - callback function to handle status
*/
function updateOpportunityFromXlsx(opportunityData, callback) {
	var sheetData = opportunityData.sheetData
	var opportunityName = opportunityData.opportunityName
	async.eachOfSeries(sheetData, function insertRole(role, roleKey, callback) {
		async.eachOfSeries(role, function insertRoleWeek(allocation, week, callback){
			// Make a new row for every week in the weekAllocations
			helpers.query(
				"INSERT INTO sales_pipeline(opportunity, role, week, allocation, protected) values($1, $2, $3, $4, $5)",
				[opportunityName, roleKey, week, allocation, true],
				function() { process.nextTick(callback) }
			)
		}, function(){ process.nextTick(callback) })
	}, function() { 
		process.nextTick(function(){ callback('Update Finished')})
	})
}

/**
* @function databaseCheck
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





