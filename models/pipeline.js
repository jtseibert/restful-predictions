module.exports = Pipeline

function Pipeline(instance, accessToken) {
	this.accessToken = accessToken
	this.path = 'https://' + instance + '/services/data/v35.0/analytics/reports/00Oa00000093sBK'
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
	    	returnData				= [],
	    	rowData					= [],
	    	stageKey

	    returnData.push(["STAGE",
	    					"OPPORTUNITY_NAME",
      						"TYPE",
							"LEAD_SOURCE",
							"AMOUNT",
							"EXP_AMOUNT",
							"CLOSE_DATE",
							"NEXT_STEP",
							"PROBABILITY",
							"FISCAL_QUARTER",
							"AGE",
							"CREATED_DATE",
							"FULL_NAME",
							"ROLLUP_DESCRIPTION",
							"ACCOUNT_NAME"
						])

	    for (var stage in factMap) {

		    stageKey = stage.split('!')[0];
			

			if (stageKey != "T"){
				rowData.push(groupingsDown[stageKey].label)
				for (var row in factMap[stage].rows){
					for (var cell in factMap[stage].rows[row].dataCells){
						rowData.push(factMap[stage].rows[row].dataCells[cell].label)
					}
					returnData.push(rowData)
					rowData = []
				}
			}
		}
		console.log(returnData)
	    callback(returnData)
	})  
}