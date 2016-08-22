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
	var startDate = opportunityData.startDate
	async.eachOfSeries(sheetData, function(role, roleKey, callback) {
		async.eachSeries(role, function(weekOffset, callback){
			helpers.createWeekAllocations(weekOffset, startDate, function(week_allocations){
				// helpers.query(
				// 	"INSERT INTO sales_pipeline(opportunity, role, week_allocations, attachment, project_size) values($1, $2, $3, $4, $5)",
				// 	[opportunityName, roleKey, week_allocations, true, null],
				// 	function() { process.nextTick(callback) }
				// )
				console.log(week_allocations)
				process.nextTick(callback)
			})
		}, function(){ process.nextTick(callback) })
	}, function() { 
		process.nextTick(function(){ callback(null)})
	})
}
//*************************************






