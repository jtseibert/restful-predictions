/**
* Allocation
* @module Allocation
* @desc The allocation module is responsible for querying SalesForce for a Allocation report.
The allocation data is organized into a 2D array and passed down to Google Sheets.
Role, week date, name, contact id, project, allocated hrs /role/week, and allocated hrs /role are grabbed.
*/
module.exports = Allocation3

// module level variables

function Allocation3(instance, accessToken) {
	this.accessToken = accessToken
	this.path = 'https://' + instance + '/services/data/v35.0/analytics/reports/00Oa00000093vVN'
} 

/**
* Queries SalesForce for allocation report, determines all roles in the report, and passes a list of
roles to the getRoleData method. getRoleData is executed asyncronously on every role.
* @function querySF
* @param oauth2 - oauth2 instance
* @param cache - node-cache instance
* @param callback - callback function to return final array
*/
var sf = require('node-salesforce')
var allocationData = []
Allocation3.prototype.querySF = function(accessToken, path, callback) {
	var conn = new sf.Connection({
	  instanceUrl: "https://" + path,
	  accessToken: accessToken
	})

	conn.query("SELECT pse__Resource__r.ContactID_18__c, pse__Resource__r.Name, pse__Project__r.Name, pse__Resource__r.pse__Resource_Role__c, pse__Estimated_Hours__c, pse__Start_Date__c FROM pse__Est_Vs_Actuals__c WHERE pse__Estimated_Hours__c>0 AND pse__Resource__r.pse__Exclude_from_Resource_Planner__c=False AND pse__End_Date__c>=2016-08-03 AND pse__End_Date__c<2017-02-03 AND pse__Resource__r.ContactID_18__c!=null")
  	.on("record", function(record) {
  		var recordData = []
    	recordData.push(record.pse__Resource__r.ContactID_18__c)
		/*	record[pse__Resource__r].Name,
			record[pse__Resource__r].pse__Resource_Role__c,
			record[pse__Project__r].Name,
			record.pse__Estimated_Hours__c,
			record.pse__Start_Date__c
		);*/
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














