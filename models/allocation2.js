module.exports = Allocation2

function Allocation2(instance, accessToken) {
	this.accessToken = accessToken
	this.path = 'https://' + instance + '/services/data/v35.0/analytics/reports/00Oa00000093vVN'
	this.allocationData = [["Project",
						"Resource: Resource Role",
						"Start Date",
						"Estimated Hours"
						]]
} 

Allocation2.prototype.getReport = function(oauth2, async, cache, callback) {
	var instance = this
	var parameters = {
		access_token: instance.accessToken
	}
	oauth2.api('GET', instance.path, parameters, function (err, data) {
		if(err) {
			console.log('OAuth2.api GET Error: ', JSON.stringify(err)) 
		} else {
			var groupingsDown = data.groupingsDown
			var factMap = data.factMap

			// Populate role list
			var roleList = {}
			for(var role in groupingsDown.groupings) {
				var currentRole = groupingsDown.groupings[role]
				roleList[currentRole.key] = currentRole.label
			}
			//mapValues getRoleData
			async.mapValues(roleList, getRoleData, factMap, groupingsDown)

		}
	})
	callback(instance.allocationData)
}

function getRoleData(role, roleKey, factMap, groupingsDown) {
	// Role is in form {key: label} E.G {2: Developer}
	console.log(role + ' ' + roleKey)
}