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
var updateDatabaseFromXlsx = function(opportunityData, callback) {
	helpers.opportunityCheck(opportunityData.opportunityName, function(exists) {
		if(exists) {
			helpers.deleteOpportunities([opportunityData.opportunityName], function() {
				updateOpportunityFromXlsx(opportunityData, function() {
					process.nextTick(callback)
				})
			})
		} else {
			updateOpportunityFromXlsx(opportunityData, function() {
				process.nextTick(callback)
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
	async.eachOfSeries(sheetData, function(week_allocations, roleKey, callback) {
		// Insert a new row for every role with the week_allocations JSON object
		helpers.query(
			"INSERT INTO sales_pipeline(opportunity, role, week_allocations, protected, project_size values($1, $2, $3, $4, $5)",
			[opportunityName, roleKey, week_allocations, true, null],
			function() {process.nextTick(function() {callback(null)})}
		)
	}, 
	function() {
		process.nextTick(function() {callback(null)})
	})
}
//*************************************






