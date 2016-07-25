/**
* Allocation
* @module Allocation
* @desc The allocation module is responsible for querying SalesForce for a Allocation report.
The allocation data is organized into a 2D array and passed down to Google Sheets.
Role, week date, name, contact id, project, allocated hrs /role/week, and allocated hrs /role are grabbed.
*/
module.exports = Allocation2

// module level variables
var async = require('async')
var factMap, groupingsDown
var allocationData = [["ROLE",
						"WEEK_DATE",
						"NAME",
						"CONTACT_ID",
						"PROJECT",
						"ALLOCATED_ESTIMATED_HOURS",
						"SUM_AEH"
						]]

function Allocation2(instance, accessToken) {
	this.accessToken = accessToken
	this.path = 'https://' + instance + '/services/data/v35.0/analytics/reports/00Oa00000093vVN'
} 

/**
* Queries SalesForce for allocation report, determines all roles in the report, and passes a list of
roles to the getRoleData method. getRoleData is executed asyncronously on every role.
* @function getReportData
* @param oauth2 - oauth2 instance
* @param cache - node-cache instance
* @param callback - callback function to return final array
*/
Allocation2.prototype.getReportData = function(oauth2, cache, callback) {
	var instance = this
	var parameters = {
		access_token: instance.accessToken
	}
	oauth2.api('GET', instance.path, parameters, function (err, data) {
		if(err) {
			console.log('OAuth2.api GET Error: ', JSON.stringify(err)) 
		} else {
			groupingsDown = data.groupingsDown
			factMap = data.factMap

			var roleList = {}
			for(var role in groupingsDown.groupings) {
				var currentRole = groupingsDown.groupings[role]
				roleList[currentRole.key] = currentRole.label
			}
			
			async.eachOf(roleList, getRoleData, function(err) {
				cache.set("allocation", allocationData, function(err, success) {
					if(!err && success)
						callback(allocationData)
					else {
						callback(err)
					}
				})
			})
		}
	})
}

/**
* Creates a distinct row for each record in a role/week combination.
Rows are 1D arrays appended to allocationData, the final 2D array.
* @function getRoleData
* @param {string} role - the current role being operated on
* @param {string} roleKey - key value corresponding to the role
* @param callback - callback to return to getReport eachOf structure
*/
function getRoleData(role, roleKey, callback) {
	var dateList = groupingsDown.groupings[roleKey].groupings
	async.eachOf(dateList, function(dateObj, dateKey, callback) {
		var currentDateKey = groupingsDown.groupings[roleKey].groupings[dateKey].key, 
			currentDate    = groupingsDown.groupings[roleKey].groupings[dateKey].label
		
		var datacellsKey   = currentDateKey + '!T'

		var datacellsList = factMap[datacellsKey].rows
		async.eachOf(datacellsList, function(recordObj, recordKey, callback) {
			// temp array to hold data for unique row combination
			var temp = []
			// get remaining data for specific role and date
			var contact_id = factMap[datacellsKey].rows[recordKey].dataCells[0].label, 
				name 	   = factMap[datacellsKey].rows[recordKey].dataCells[1].label,
				project    = factMap[datacellsKey].rows[recordKey].dataCells[2].label,
				estimate   = factMap[datacellsKey].rows[recordKey].dataCells[3].label,
				sum 	   = factMap[datacellsKey].aggregates[0].label.replace(',', '')
			temp.push(role, currentDate, name, contact_id, project, estimate, sum)
			allocationData.push(temp)
			process.nextTick(callback)
		})
		process.nextTick(callback)
	})
	process.nextTick(callback)
}
