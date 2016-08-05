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
			//not in db, and populate the sales_pipeline
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
	

	//for every role
		//for every number of role
			//insert into db opportunity, role, {week1: number, week2: number}

	async.eachOf(sheetData, function insertRow(role, roleKey) {
		console.log('role ' + roleKey)





		






	

	}, 
	function() {callback('update successful')})		
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





