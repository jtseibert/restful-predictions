/**
* @module xlsx
* @desc Handles forecasted opportunity data from xlsx parser.
*/

var pg = require('pg')
/**
* @function updateOpportunity
* @desc Update the opportunity stored in Heroku database.
* @param opportunityData - JSON format object of opportunity name and xlsx data
* @param callback - callback to handle status
*/
var updateOpportunity = function(opportunityData, callback) {
	//console.log(opportunityData)	//console.log(sheetData)


	callback("wip")
}



module.exports.updateOpportunity = updateOpportunity