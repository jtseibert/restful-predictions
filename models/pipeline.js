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
	var opportunitiesQuery = client.query("SELECT * from sales_pipeline")
	opportunitiesQuery.on("row", function (row, result) {
		result.addRow(row)
	})
	opportunitiesQuery.on("end", function (result) {
		for (var entry in result.rows){
			addedOpportunities[result.rows[entry].opportunity] = {
				"STAGE": result.rows[entry].stage,
				"PROBABILITY": result.rows[entry].probability,
				"TYPE": result.rows[entry].type,
				"START_DATE": result.rows[entry].start_date
			}
		}
	})

	omitData = {}
	var omitQuery = client.query("SELECT * from omit")
	omitQuery.on("row", function (row, result) {
		result.addRow(row)
	})
	omitQuery.on("end", function (result) {
		for (var entry in result.rows){
			omitData[result.rows[entry].opportunity] = {}
		}
	})

	oauth2.api('GET', this.path, parameters, function (err, data) {
	    if (err)
	        console.log('GET Error: ', JSON.stringify(err)) 
	    
	    var factMap 				= data.factMap,
	    	groupingsDown 			= data.groupingsDown.groupings,
	    	returnData				= [],
	    	stageIndex				= 0,
	    	opportunityIndex		= 1,
	    	typeIndex				= 2,
	    	closeDateIndex			= 6,
	    	probabilityIndex		= 8,
	    	rowData,
	    	stageKey,
	    	curStage,
	    	curRow,
	    	curCell,
	    	curOpportunity

	    returnData.push(["STAGE",
	    					"OPPORTUNITY_NAME",
      						"TYPE",
							"LEAD_SOURCE",
							"AMOUNT",
							"EXP_AMOUNT",
							"CLOSE_DATE",
							"START_DATE",
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

		    stageKey = stage.split('!')[stageIndex]
		    curStage = factMap[stage]
			

			if (stageKey != "T"){
				for (var row in curStage.rows){
					curRow = curStage.rows[row]
					curOpportunity = curRow.dataCells[opportunityIndex-1].label
					if (!(omitData[curOpportunity])){
						rowData = []
						rowData.push(groupingsDown[stageKey].label)
						for (var cell in curRow.dataCells){
							curCell = curRow.dataCells[cell]
							rowData.push(curCell.label)
							if (cell == closeDateIndex)
								rowData.push(calculateStartDate(curCell.label))
						}
						if(addedOpportunities[curOpportunity]){
							rowData[stageIndex] = addedOpportunities[curOpportunity].STAGE
							rowData[probabilityIndex] = (addedOpportunities[curOpportunity].PROBABILITY * 100) + "%"
							rowData[typeIndex] = addedOpportunities[curOpportunity].TYPE
							delete addedOpportunities[curOpportunity]
						}
						returnData.push(rowData)
					}
				}
			}
		}
		for (var key in addedOpportunities){
			if (!(omitData[key])){
				returnData.push([addedOpportunities[key].STAGE,
									key,
									addedOpportunities[key].TYPE,
									"",
									"",
									"",
									"",
									addedOpportunities[key].CLOSE_DATE,
									"",
									addedOpportunities[key].PROBABILITY,
									"",
									"",
									"",
									"",
									"",
									""
								])
			}
		}
	    callback(returnData)
	})  
}

function calculateStartDate(closeDate){
	var date = new Date(closeDate)
	return (new Date(date.setDate(date.getDate() + 7)))
}