/**
* Capacity
* @module Capacity
* @desc The Capacity module is responsible for persisting all employees and thier roles if they are in the roles database table
*/

var queryCapacity = function(accessToken, path, callback) {
	var sf = require('node-salesforce')
	var moment = require('moment')
	var async = require('async')
	// Set up the sheet headers
	var capacityData = [[
			'Role',
			'Name',
			'Utilization Target'
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
  		// Format the date with Moment library for sheet consistency
    	recordData.push(
    		record.pse__Resource_Role__c,
			record.Name,
			record.pse__Utilization_Target__c
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