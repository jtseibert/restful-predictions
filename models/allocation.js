//data.js
//input: 
	//json object: token
	//String: id
//output:
	//json object data
	
module.exports = Allocation

function Allocation(instance, accessToken) {
	this.accessToken = accessToken
	this.path = 'https://' + instance + '/services/data/v35.0/analytics/reports/00Oa00000093smp'
	this.returnData = [["Project",
						"Resource: Resource Role",
						"Start Date",
						"Estimated Hours"
						]]
} 

Allocation.prototype.getstuff = function(oauth2, async, cache, callback) {
	var objInstance = this
	var parameters = {
		access_token: objInstance.accessToken
	}

	oauth2.api('GET', objInstance.path, parameters, function (err, data) {
	    if (err)
	        console.log('GET Error: ', JSON.stringify(err)) 
	    
	    console.log("REST call within allocation.js")
	    var factMap 				= data.factMap,
	    	groupingsDown 			= data.groupingsDown.groupings,
	    	groupingsAcross 		= data.groupingsAcross.groupings,
	    	returnData				= [],
	    	employeeKey,
	        projectKey,
	        weekKey,
	        valueKey

	    async.forEachOf(factMap, function(field, key, callback) {
		    valueKey = key
			splitKey = key.split('!')
			weekKey = splitKey[1]
			splitKey = splitKey[0].split('_')
			employeeKey = splitKey[0]
			if (splitKey.length > 1){
				projectKey = splitKey[1]
			} else {
				projectKey = "T"
			}

			if (!(weekKey == "T" || employeeKey == "T" || projectKey == "T") && field.aggregates[0].value != 0){
				objInstance.returnData.push([groupingsDown[employeeKey].label, 
									groupingsDown[employeeKey].groupings[projectKey].label, 
									groupingsAcross[weekKey].label, 
									field.aggregates[0].value])
			}
			callback()
		}, function(err) {
			if(err) {
				console.log(err)
			} else {
				cache.set("allocation", objInstance.returnData, function(err, success) {
					if(!err && success) {
						console.log('caching allocation within allocation.js')
					}
				}) 
			}
		})
		callback()
	})  
}



