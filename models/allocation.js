//data.js
//input: 
	//json object: token
	//String: id
//output:
	//json object data
	
module.exports = Allocation

function Allocation(instance, accessToken, callback) {
	//objInstance = this
	this.accessToken = accessToken
	this.path = 'https://' + instance + '/services/data/v35.0/analytics/reports/00Oa00000093smp'
	this.returnData = [["Project",
						"Resource: Resource Role",
						"Start Date",
						"Estimated Hours"
						]]
	callback()

	// var setAccessToken = function(callback) {
	// 	var accessToken = accessToken
	// 	callback(null,accessToken)
	// }
	// var setPath = function(callback) {
	// 	var path = 'https://' + instance + '/services/data/v35.0/analytics/reports/00Oa00000093smp'
	// 	callback(null,path)
	// }
	// var setReturnData = function(callback) {
	// 	var returnData = [["Project",
	// 					"Resource: Resource Role",
	// 					"Start Date",
	// 					"Estimated Hours"
	// 					]]
	// 	callback(null,returnData)
	// }

	// async.parallel({
	// 	'one': setAccessToken,
	// 	'two': setPath,
	// 	'three': setReturnData
	// }, function(err, results){
	// 	console.log('in callback')
	// 	if (err) 
	// 		console.log('error: ' + JSON.stringify(err))
	// 	console.log('results: ' + JSON.stringify(results))
	// 	objInstance.accessToken 		= results.one
	// 	objInstance.path 				= results.two
	// 	objInstance.returnData 			= results.three
	// 	callback()
	// })

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

	    async.eachOf(factMap, function(field, key, callback) {
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



