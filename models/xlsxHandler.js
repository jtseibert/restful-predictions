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
	isInDatabase(opportunityData.opportunityName, function(inDatabase) {
		if(inDatabase) {
			utilities.query(
			"select stage from sales_pipeline where opportunity=$1", 
			[opportunityData.opportunityName],
			function(results) {console.log(results)}
			)
		}
	})









	callback("wip")
}

/**
* @function isInDatabase
* @desc Checks if the opportunity is already in the Heroku database
* @param {string} opportunityName - name of opportunity to check
* @returns true or false
*/
function isInDatabase(opportunityName, callback) {
	utilities.query(
		"SELECT EXISTS (SELECT opportunity FROM sales_pipeline WHERE opportunity=$1)",
		[opportunityName],
		function(results) {callback(results[0].exists)}
	)
}

module.exports.updateOpportunity = updateOpportunity