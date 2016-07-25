/**
@module Allocation
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
						"ESTIMATED_HOURS",
						"SUM_EH"
						]]

function Allocation2(instance, accessToken) {
	this.accessToken = accessToken
	this.path = 'https://' + instance + '/services/data/v35.0/analytics/reports/00Oa00000093vVN'
} 

Allocation2.prototype.getReport = function(oauth2, cache, callback) {
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

function getRoleData(role, roleKey, callback) {
	var dateList = groupingsDown.groupings[roleKey].groupings
	async.eachOf(dateList, function(dateObj, dateKey, callback) {
		var currentDateKey = groupingsDown.groupings[roleKey].groupings[dateKey].key, 
			currentDate    = groupingsDown.groupings[roleKey].groupings[dateKey].label
		
		var datacellsKey   = currentDateKey + '!T',
			aggregatesKey  = roleKey + '!T'

		var datacellsList = factMap[datacellsKey].rows
		async.eachOf(datacellsList, function(recordObj, recordKey, callback) {
			// temp array to hold data for unique row combination
			var temp = []
			// get remaining data for specific role and date
			var contact_id = factMap[datacellsKey].rows[recordKey].dataCells[0].label, 
				name 	   = factMap[datacellsKey].rows[recordKey].dataCells[1].label,
				project    = factMap[datacellsKey].rows[recordKey].dataCells[2].label,
				estimate   = factMap[datacellsKey].rows[recordKey].dataCells[3].label,
				sum 	   = factMap[aggregatesKey].aggregates[0].label.replace(',', '')
			temp.push(role, currentDate, name, contact_id, project, estimate, sum)
			allocationData.push(temp)
			process.nextTick(callback)
		})
		process.nextTick(callback)
	})
	process.nextTick(callback)
}
