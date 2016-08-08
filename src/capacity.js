/**
* @module Capacity
* @desc Persists all employees and thier roles if they are in the roles database table.
*/

/**
* @function queryCapacity
* @desc SOQL query name, utilization, and role.
* @param {string} accessToken - oauth2 access token
* @param {string} path - path to SF server
* @param callback - callback to handle capacity data
*/
var queryCapacity = function(accessToken, path, callback) {
	var sf = require('node-salesforce')
	var moment = require('moment')
	var async = require('async')
	// Set up the sheet headers
	var capacityData = [[
			'ROLE',
			'NAME',
			'UTILIZATION_TARGET'
		]]

	// Connect to SF
	var conn = new sf.Connection({
	  instanceUrl: "https://" + path,
	  accessToken: accessToken
	})

	// Execute SOQL query to populate allocationData
	conn.query("SELECT pse__Resource_Role__c, Name, pse__Utilization_Target__c FROM Contact WHERE pse__Resource_Role__c!='' AND pse__Utilization_Target__c>=0 ORDER BY pse__Resource_Role__c")
  	.on("record", function(record) {
  		var recordData = []
    	recordData.push(
    		record.pse__Resource_Role__c,
			record.Name,
			record.pse__Utilization_Target__c/100
		)
    	capacityData.push(recordData)
		})
	.on("end", function(query) {
		console.log("total in database : " + query.totalSize);
		console.log("total fetched : " + query.totalFetched);
		process.nextTick(function() {callback(capacityData)})
		})
	.on("error", function(err) {
		console.error(err);
		})
	.run({ autoFetch : true, maxFetch : 8000 });
}

module.exports.queryCapacity = queryCapacity