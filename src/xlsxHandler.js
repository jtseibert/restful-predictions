//*************************************
/**
* @module xlsx
* @desc Handles forecasted opportunity data from xlsx parser.
*/
//*************************************
var helpers = require('./helpers')
var async     = require('async')
//*************************************
/**
* @function updateDatabaseFromXlsx
* @desc Update the opportunity stored in Heroku database.
* @param opportunityData - JSON format object of opportunity name and xlsx data
* @param callback - callback to handle status
*/
function updateDatabaseFromXlsx(opportunityData, callback) {
	helpers.opportunityCheck(opportunityData.opportunityName, function opportunityCheckCallback(inDatabase) {
		if(inDatabase) {
			console.log('finished opp check')
			helpers.deleteOpportunity(opportunityData.opportunityName, function deleteOpportunityCallback() {
				console.log('finished delete opp')
				updateOpportunityFromXlsx(opportunityData, function callback(status) {
					callback(status)
				})
			})
		} else {
			updateOpportunityFromXlsx(opportunityData, function callback(status) {
				process.nextTick(function() {callback(status)})
			})
		}
	})
}

module.exports.updateDatabaseFromXlsx = updateDatabaseFromXlsx
//*************************************

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
		async.eachOfSeries(role, function insertRoleWeek(allocation, week, callback) {
			// Make a new row for every week in the weekAllocations
			helpers.query(
				"INSERT INTO sales_pipeline(opportunity, role, week, allocation, protected) values($1, $2, $3, $4, $5)",
				[opportunityName, roleKey, week, allocation, true],
				function() { callback() }
			)
		}, function() { callback() })
	}, function() { 
		console.log('leaving the update')
		callback(null)
	})
}
//*************************************






