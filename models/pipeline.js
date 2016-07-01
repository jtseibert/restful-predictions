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
	    	closeDateIndex			= 5,
	    	startDateIndex			= 7,
	    	probabilityIndex		= 9,
	    	exp_amountIndex			= 4,
	    	week					= 7,
	    	rowData,
	    	stageKey,
	    	curStage,
	    	curRow,
	    	curCell,
	    	curOpportunity,
	    	curProjectSize

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
							"ACCOUNT_NAME",
							"ROLE"
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
								rowData.push(calculateStartDate(curCell.label, week))
							else if (cell == exp_amountIndex)
								curProjectSize = assignRoles(curCell.label)
						}
						if(addedOpportunities[curOpportunity]){
							rowData[stageIndex] = addedOpportunities[curOpportunity].STAGE
							rowData[probabilityIndex] = (addedOpportunities[curOpportunity].PROBABILITY * 100) + "%"
							rowData[typeIndex] = addedOpportunities[curOpportunity].TYPE
							rowData[startDateIndex] = calculateStartDate(addedOpportunities[curOpportunity].START_DATE,0)
							delete addedOpportunities[curOpportunity]
						}
						rowData = forEveryRole(rowData,curProjectSize)
						// console.log(rowData)
						for (var each in rowData)
							returnData.push(rowData[each])
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
									calculateStartDate(addedOpportunities[key].START_DATE,0),
									"",
									addedOpportunities[key].PROBABILITY,
									"",
									"",
									"",
									"",
									"",
									"",
									"DEV, best role"
								])
			}
		}
	    callback(returnData)
	})  
}

function calculateStartDate(closeDate, dateIncrement){
	var date = new Date(closeDate)
	var returnDate = new Date(date.setDate(date.getDate() + dateIncrement))
	returnDate = JSON.stringify(returnDate).split('T')[0].split('-')
	return returnDate[1]+'/'+returnDate[2]+'/'+returnDate[0].replace('"','')
}

function assignRoles(expectedAmount){
	var smallProject = ['BC','QA','PC'],
		mediumProject = ['PL','ETA','PC','BC'],
		largeProject = ['PL','ETA','PC','BC','QA Lead','OS QA','OS DEV','DEV']

	expectedAmount = expectedAmount.replace('USD ', '').replace(',','')
	console.log(expectedAmount)
	if (parseInt(expectedAmount) <= 150000)
		return smallProject
	else if(parseInt(expectedAmount)<=500000)
		return mediumProject
	else
		return largeProject
}

function forEveryRole(row,projectSize){
	var tempRow 	= [],
		returnData	= [],
		roleIndex	= 16
	
	for (var each in projectSize){
		tempRow = []
		for (var col in row){
			tempRow.push(row[col])
		}
		tempRow.push(projectSize[each])
		returnData.push(tempRow)
	}


	return returnData
}





