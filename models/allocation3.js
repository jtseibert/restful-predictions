/**
* Allocation
* @module Allocation
*/
module.exports.queryAllocation = queryAllocation

var queryAllocation = function(accessToken, path, callback) {
	var sf = require('node-salesforce')
	// Set up the sheet headers
	var allocationData = [[
		"CONTACT_ID", "NAME",
		"ROLE", "PROJECT",
		"ESTIMATED_HOURS", "START_DATE"
		]]

	// Connect to SF and populate allocationData
	var conn = new sf.Connection({
	  instanceUrl: "https://" + path,
	  accessToken: accessToken
	})

	conn.query("SELECT pse__Resource__r.ContactID_18__c, pse__Resource__r.Name, pse__Project__r.Name, pse__Resource__r.pse__Resource_Role__c, pse__Estimated_Hours__c, pse__Start_Date__c FROM pse__Est_Vs_Actuals__c WHERE pse__Estimated_Hours__c>0 AND pse__Resource__r.pse__Exclude_from_Resource_Planner__c=False AND pse__End_Date__c>=2016-08-03 AND pse__End_Date__c<2017-02-03 AND pse__Resource__r.ContactID_18__c!=null")
  	.on("record", function(record) {
  		var recordData = []
    	recordData.push(
    		record.pse__Resource__r.ContactID_18__c,
			record.pse__Resource__r.Name,
			record.pse__Resource__r.pse__Resource_Role__c,
			record.pse__Project__r.Name,
			record.pse__Estimated_Hours__c,
			record.pse__Start_Date__c
		)
    	allocationData.push(recordData)
		})
	.on("end", function(query) {
		console.log("total in database : " + query.totalSize);
		console.log("total fetched : " + query.totalFetched);
		process.nextTick(function() {callback(allocationData)})
		})
	.on("error", function(err) {
		console.error(err);
		})
	.run({ autoFetch : true, maxFetch : 8000 });
}














