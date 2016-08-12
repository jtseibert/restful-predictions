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
* @desc Checks if opportunity is in sales_pipeline, and deletes if it already exists.
* @param opportunityData - JSON format object of opportunity name and xlsx data
* @param callback - callback function
*/
function updateDatabaseFromXlsx(opportunityData, callback) {
	helpers.opportunityCheck(opportunityData.opportunityName, function opportunityCheckCallback(exists) {
		if(exists) {
			helpers.deleteOpportunity(opportunityData.opportunityName, function deleteOpportunityCallback() {
				updateOpportunityFromXlsx(opportunityData, function() {
					callback(null)
				})
			})
		} else {
			updateOpportunityFromXlsx(opportunityData, function() {
				callback(null)
			})
		}
	})
}

module.exports.updateDatabaseFromXlsx = updateDatabaseFromXlsx
//*************************************

/**
* @function updateOpportunityFromXlsx
* @desc Update the opportunity stored in Heroku database.
* @param opportunityData - JSON format object of xlsx data and opportunity name
* @param callback - callback function
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
				function() {callback(null)}
			)
		}, function() { 
			callback(null)
		})
	}, function() { 
		callback(null)
	})
}
//*************************************






