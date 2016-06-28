module.exports = Pipeline

function Pipeline(instance, accessToken) {
	this.accessToken = accessToken
	this.path = 'https://' + instance + '/services/data/v35.0/analytics/reports/00Oa0000008r7sg'
} 

Pipeline.prototype.getPipeline = function(oauth2, callback) {
	console.log(this.accessToken)
	console.log(this.path)

	parameters = {
		access_token: this.accessToken
	}

	oauth2.api('GET', this.path, parameters, function (err, data) {
	    if (err)
	        console.log('GET Error: ', JSON.stringify(err)) 
	    
	    var factMap 				= data.factMap,
	    	groupingsDown 			= data.groupingsDown.groupings,
	    	groupingsAcross 		= data.groupingsAcross.groupings,
	    	returnData				= [],
	    	employeeKey,
	        projectKey,
	        weekKey,
	        valueKey

	    returnData.push(["Resource: Resource Name", "Project", "Start Date", "Estimated Hours"])

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

			if (!(weekKey == "T" || employeeKey == "T" || projectKey == "T")){
				//console.log('weekKey: ' + weekKey + "\temployeeKey: " + employeeKey + "\tprojectKey: " + projectKey + "\n")

				returnData.push([groupingsDown[employeeKey].label, 
									groupingsDown[employeeKey].groupings[projectKey].label, 
									groupingsAcross[weekKey].label, 
									factMap[key].aggregates[0].value])
			}
		}
	    callback(returnData)
	})  