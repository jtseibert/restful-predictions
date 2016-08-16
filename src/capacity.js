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
	var capacityData = []

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
			record.pse__Utilization_Target__c*40/100
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

/**
* @function insertCapacity
* @desc Inserts a new row in the capacity table for every role, name, utlization, and hour combination.
* @param capacityData - 2D array of data from salesforce SOQL query
* @param callback - callback function
*/
function insertCapacity(capacityData, callback) {
	async.eachSeries(capacityData, function insertRow(row, callback) {
		helpers.query("INSERT INTO capacity (role, name, utilization, hours) "
			+ "VALUES ($1, $2, $3, $4)",
			row,
			function() {process.nextTick(callback)}
		)
	},
	function() {
		console.log('final cb')
		process.nextTick(callback)
	})
}

module.exports.insertCapacity = insertCapacity
//*************************************

/**
* @function exportCapacity
* @desc Query capacity table and return data for Google Sheets.
* @params callback - callback function to handle capacity data
* @returns 2D array of capacity information
*/
var exportCapacity = function(callback) {
	var headers = [[
			'ROLE',
			'NAME',
			'UTILIZATION_TARGET',
			'HOURS'
		]]
	var capacityData = []

	helpers.query("SELECT * FROM capacity", null, function callback(capacityData) {
		async.eachOf(capacityData, function pushRow(row) {
			console.log(row)
			var temp = []
			temp.push(row.role, row.name, row.utilization, row.hours)
			capacityData.push(temp)
		},
		function() {
			callback(headers.concat(capacityData))
		})
	})	
}

module.exports.exportCapacity = exportCapacity
//*************************************

/**
* @function clearCapacityTable
* @desc Delete all rows in the capacity table for fresh salesforce sync.
* @param callback - callback function
*/
var clearCapacityTable = function(callback) {
	helpers.query("DELETE FROM capacity *", null, function() {callback()})
}

module.exports.clearCapacityTable = clearCapacityTable









