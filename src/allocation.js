//*************************************
/**
* Allocation
* @module Allocation
* @desc The Allocation module contains function(s) to perform SOQL queries via the 
node-salesforce library to return allocation data to Google Sheets.
*/
//*************************************

/**
* @function queryAllocation
* @desc Query salesforce to obtain allocation data.
* @params {string} accessToken - oauth2 access token
* @params {string} path - salesforce server url
* @params callback - callback function to return allocation data
*/
var queryAllocation = function(accessToken, path, callback) {
	var sf = require('node-salesforce')
	var moment = require('moment')
	// Set up the sheet headers
	var allocationData = [[
		"CONTACT_ID", "NAME",
		"ROLE", "PROJECT",
		"ESTIMATED_HOURS", "WEEK"
		]]

	// Connect to SF
	var conn = new sf.Connection({
	  instanceUrl: "https://" + path,
	  accessToken: accessToken
	})

	// Determine date range from the current date
	var queryString = getQueryString()
	// Execute SOQL query to populate allocationData
	conn.query(queryString)
  	.on("record", function handleRecord(record) {
  		var recordData = []
  		// Format the date with Moment library for sheet consistency
    	recordData.push(
    		record.pse__Resource__r.ContactID_18__c,
			record.pse__Resource__r.Name,
			record.pse__Resource__r.pse__Resource_Role__c,
			record.pse__Project__r.Name,
			record.pse__Estimated_Hours__c,
			moment(new Date(record.pse__Start_Date__c)).format("MM/DD/YYYY")
		)
    	allocationData.push(recordData)
		})
	.on("end", function returnAllocationData(query) {
		console.log("total in database : " + query.totalSize);
		console.log("total fetched : " + query.totalFetched);
		process.nextTick(function() {callback(allocationData)})
		})
	.on("error", function handleError(err) {
		process.nextTick(function() {callback(err)})
		})
	.run({ autoFetch : true, maxFetch : 8000 });
}

module.exports.queryAllocation = queryAllocation
//*************************************

/**
* @function getQueryString
* @desc Constructs a query with variable start and end dates for allocations.
* @returns {string} queryString - SOQL query string
*/
function getQueryString() {
	var queryString
	var startDate = moment(new Date).format("YYYY-MM-DD")
	var closeDate = moment(new Date).add(26, 'weeks').format("YYYY-MM-DD")
	queryString = "SELECT pse__Resource__r.ContactID_18__c, "
					+ "pse__Resource__r.Name, "
					+ "pse__Project__r.Name, "
					+ "pse__Resource__r.pse__Resource_Role__c, "
					+ "pse__Estimated_Hours__c, "
					+ "pse__Start_Date__c "
					+ "FROM pse__Est_Vs_Actuals__c "
					+ "WHERE pse__Estimated_Hours__c>0 AND "
					+ "pse__Resource__r.pse__Exclude_from_Resource_Planner__c=False AND "
					+ "pse__Project__r.Name!='Internal - Magnet - Admin' AND "
					+ "pse__End_Date__c>=" + startDate
					+ "AND pse__End_Date__c<" + closeDate
					+ "AND pse__Resource__r.ContactID_18__c!=null"
	return queryString
}
//*************************************













