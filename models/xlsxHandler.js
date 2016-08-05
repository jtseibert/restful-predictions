/**
* @module xlsx
* @desc Handles forecasted opportunity data from xlsx parser.
*/

var utilities = require('./utilities')
/**
* @function updateOpportunity
* @desc Update the opportunity stored in Heroku database.
* @param opportunityData - JSON format object of opportunity name and xlsx data
* @param callback - callback to handle status
*/
var updateOpportunity = function(opportunityData, callback) {
	databaseCheck(opportunityData.opportunityName, function(inDatabase) {
		if(inDatabase) {
			deleteOpportunity(opportunityData.opportunityName, function() {
				updateDatabase(opportunityData, function() {
					callback({message: 'db delete success'})
				})
			})
		} else {
			updateDatabase(opportunityData, function() {
				callback({message: 'db no delete success'})
			})
			//not in db, ping SF and populate the sales_pipeline
		}
	})
}


function updateDatabase(opportunityData, callback) {
	var sheetData = opportunityData.sheetData
	var opportunityName = opportunityData.opportunityName

	console.log('got into updateDatabase')
	callback()
}

function deleteOpportunity(opportunityName, callback) {
	console.log('deleting stuff!')
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

module.exports.updateOpportunity = updateOpportunity