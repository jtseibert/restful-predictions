//pipeline.js
//input: 
	//SF instance and SF accessToken

module.exports = Pipeline

function Pipeline(instance, accessToken) {
	this.accessToken = accessToken
	this.path = 'https://' + instance + '/services/data/v35.0/analytics/reports/00Oa00000093sCD'
} 

Pipeline.prototype.getPipeline = function(client, oauth2, callback) {

	parameters = {
		access_token: this.accessToken
	}

	addedOpportunities = {}
	omitData = {}

	var query = client.query("SELECT * from sales_pipeline")
	query.on("row", function (row, result) {
		result.addRow(row)
	})
	query.on("end", function (result) {
		for (var entry in result.rows){
			addedOpportunities[result.rows[entry].opportunity] = {
				"STAGE": result.rows[entry].stage,
				"PROBABILITY": result.rows[entry].probability
			}
		}
	})

	var omitQuery = client.query("SELECT * from omit")
	omitQuery.on("row", function (row, result) {
		result.addRow(row)
	})
	omitQuery.on("end", function (result) {
		for (var entry in result.rows){
			omitData[result.rows[entry].opportunity] = {}
		}
		console.log(omitData)
	})

	oauth2.api('GET', this.path, parameters, function (err, data) {
	    if (err)
	        console.log('GET Error: ', JSON.stringify(err)) 
	    
	    var factMap 				= data.factMap,
	    	groupingsDown 			= data.groupingsDown.groupings,
	    	returnData				= [],
	    	opportunityIndex		= 1,
	    	stageIndex				= 0,
	    	probabilityIndex		= 8,
	    	rowData,
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
				for (var row in factMap[stage].rows){
					if (!(omitData[factMap[stage].rows[row].dataCells[0].label])){
						rowData = []
						rowData.push(groupingsDown[stageKey].label)
						for (var cell in factMap[stage].rows[row].dataCells){
							rowData.push(factMap[stage].rows[row].dataCells[cell].label)
						}
						if(addedOpportunities[rowData[opportunityIndex]]){
							rowData[stageIndex] = addedOpportunities[rowData[opportunityIndex]].STAGE
							rowData[probabilityIndex] = (addedOpportunities[rowData[opportunityIndex]].PROBABILITY * 100) + "%"
							delete addedOpportunities[rowData[opportunityIndex]]
						}
						returnData.push(rowData)
					}
				}
			}
		}
		for (var key in addedOpportunities){
			if (!(omitData[key])){
				returnData.push([addedOpportunities[key].STAGE, key, "", "", "", "", "", "", addedOpportunities[key].PROBABILITY, "", "", "", "", "", ""])
			}
		}
	    callback(returnData)
	})  
}