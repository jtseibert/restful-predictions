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
} 

Allocation.prototype.get = function(oauth2, cache, callback) {
	parameters = {
		access_token: this.accessToken
	}

	oauth2.api('GET', this.path, parameters, function (err, data) {
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

	    returnData.push(["Project", "Resource: Resource Role", "Start Date", "Estimated Hours"])

	    for (var key in factMap) {

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

			if (!(weekKey == "T" || employeeKey == "T" || projectKey == "T") && factMap[key].aggregates[0].value != 0){
				returnData.push([groupingsDown[employeeKey].label, 
									groupingsDown[employeeKey].groupings[projectKey].label, 
									groupingsAcross[weekKey].label, 
									factMap[key].aggregates[0].value])
			}
		}

	    cache.set("allocation", returnData, function(err, success) {
			if(!err && success) {
				console.log('caching allocation within allocation.js')
				callback(returnData)
			} 
		})
	})  
}