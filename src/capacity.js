//*************************************
/**
* @module Capacity
* @desc The Capacity module contains function(s) to perform SOQL queries via the 
node-salesforce library to return current capacity data to Google Sheets.
*/
//*************************************
var helpers = require('./helpers')
var async = require('async')
/**
* @function queryCapacity
* @desc Query salesforce to obtain role, name, and utilization.
* @param {string} accessToken - oauth2 access token
* @param {string} path - path to SF server
* @param callback - callback to handle capacity data
*/
var queryCapacity = function(accessToken, path, callback) {
	var sf = require('node-salesforce')
	var moment = require('moment')
	var async = require('async')
	
	// Connect to SF
	var conn = new sf.Connection({
	  instanceUrl: "https://" + path,
	  accessToken: accessToken
	})

	// Execute SOQL query to populate capacityData
	conn.query("SELECT pse__Resource_Role__c, Name, pse__Utilization_Target__c FROM Contact WHERE pse__Resource_Role__c!='' AND pse__Utilization_Target__c>=0 ORDER BY pse__Resource_Role__c")
  	.on("record", function handleRecord(record) {
  		var recordData = []
    	recordData.push(
    		record.pse__Resource_Role__c,
			record.Name,
			record.pse__Utilization_Target__c/100,
			pse__Utilization_Target__c*40
		)
    	capacityData.push(recordData)
		})	
	.on("end", function returnCapacityData(query) {
		console.log("total in database : " + query.totalSize);
		console.log("total fetched : " + query.totalFetched);
		process.nextTick(function() {callback(capacityData)})
		})
	.on("error", function handleError(err) {
		process.nextTick(function() {callback(err)})
		})
	.run({ autoFetch : true, maxFetch : 8000 });
}

module.exports.queryCapacity = queryCapacity
//*************************************

function insertCapacity(capacityData) {
	//TODO add dlete capacity
	console.log('in insertcapacity')
	console.log(capacityData)
	async.eachSeries(capacityData, function insertRow(row, callback) {
		helpers.query("INSERT INTO roles_capacities (role, name, utilization, hours) "
			+ "VALUES ($1, $2, $3, $4)",
			row,
			function() {callback()}
		)
	},
	function() {callback()}
	)
}

module.exports.insertCapacity = insertCapacity
//*************************************

var exportCapacity = function() {
	var capacityData = [[
			'ROLE',
			'NAME',
			'UTILIZATION_TARGET',
			'HOURS'
		]]


}
//*************************************




