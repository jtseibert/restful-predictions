//pipeline.js
//input: 
	//SF instance and SF accessToken

module.exports = Pipeline

function Pipeline(instance, accessToken) {
	this.accessToken = accessToken
	this.path = 'https://' + instance + '/services/data/v35.0/analytics/reports/00Oa00000093sCD'
} 

Pipeline.prototype.get = function(client, oauth2, callback) {

	projectSizes = {}
	var projectSizesQuery = client.query("SELECT sizeid, pricehigh, roles_allocations FROM project_size ORDER BY pricehigh ASC")
	projectSizesQuery.on("row", function (row, result) {
		result.addRow(row)
	})
	projectSizesQuery.on("end", function (result) {
		for (var entry in result.rows){
			projectSizes[result.rows[entry].sizeid] = {
				"priceHigh": result.rows[entry].pricehigh,
				"roles_allocations": result.rows[entry].roles_allocations
			}
		}
	})

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
				"AMOUNT": result.rows[entry].amount,
				"EXPECTED_AMOUNT": result.rows[entry].expected_amount,
				"CLOSE_DATE": result.rows[entry].close_date,
				"START_DATE": result.rows[entry].start_date,
				"PROBABILITY": result.rows[entry].probability,
				"AGE": result.rows[entry].age,
				"CREATED_DATE": result.rows[entry].create_date,
				"ACCOUNT_NAME": result.rows[entry].account_name,
				"PROJECT_SIZE": result.rows[entry].project_size
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
	    	newRow					= [],
	    	stageIndex				= 0,
	    	opportunityIndex		= 0,
	    	amountIndex 			= 3,
	    	expectedAmountIndex		= 4,
	    	closeDateIndex			= 5,
	    	startDateIndex			= 6,
	    	probabilityIndex		= 8,
	    	ageIndex 				= 10,
	    	createdDateIndex 		= 11,
	    	accountNameIndex 		= 14,
	    	roleIndex 				= 15,
	    	projectSizeIndex 		= 16,
	    	stageOffset 			= 1,
	    	week					= 7,
	    	rowData,
	    	stageKey,
	    	currentStage,
	    	currentRow,
	    	currentCell,
	    	currentOpportunity,
	    	currentProjectSize,
	    	stripAmount

	    var indexes	= [opportunityIndex,
						amountIndex,
						expectedAmountIndex,
						closeDateIndex,
						startDateIndex,
						probabilityIndex,
						ageIndex,
						createdDateIndex,
						accountNameIndex,
						roleIndex,
						projectSizeIndex]

	    returnData.push(["STAGE",
	    					"OPPORTUNITY_NAME",
							"AMOUNT",
							"EXP_AMOUNT",
							"CLOSE_DATE",
							"START_DATE",
							"PROBABILITY",
							"AGE",
							"CREATED_DATE",
							"ACCOUNT_NAME",
							"ROLE",
							"PROJECT_SIZE"
						])

	    for (var stage in factMap) {

		    stageKey = stage.split('!')[stageIndex]
		    currentStage = factMap[stage]
			

			if (stageKey != "T"){
				for (var row in currentStage.rows){
					currentRow = currentStage.rows[row]
					currentOpportunity = currentRow.dataCells[opportunityIndex].label
					if (!(omitData[currentOpportunity])){
						rowData = []
						rowData.push(groupingsDown[stageKey].label)
						for (var cell in currentRow.dataCells){
							console.log('cell: '+cell+'\n')
							console.log('indexes: '+indexes+'\n')
							console.log(indexes.indexOf(cell))
							if (indexes.indexOf(cell) > -1) {
								console.log('Validated Cell: '+cell+'\n')
								currentCell = currentRow.dataCells[cell]
								if (cell == closeDateIndex)
									rowData.push(currentCell.label, calculateStartDate(currentCell.label, week))
								else if (cell == expAmountIndex){
									currentProjectSize = getProjectSize(currentCell.label)
									stripAmount = currentCell.label.replace('USD ', '').replace(/,/g,'')
									rowData.push(stripAmount)
								} else {
									rowData.push(currentCell.label)
								}
							} else { console.log('Not Validated Cell: ' + cell+'\n') }
						}
						if(addedOpportunities[currentOpportunity]){
							rowData[stageIndex] = (addedOpportunities[currentOpportunity].STAGE || rowData[stageIndex])
							rowData[amountIndex+stageOffset] = (addedOpportunities[currentOpportunity].AMOUNT || rowData[amountIndex+stageOffset])
							rowData[expectedAmountIndex+stageOffset] = (addedOpportunities[currentOpportunity].EXPECTED_AMOUNT || rowData[expectedAmountIndex+stageOffset])
							rowData[closeDateIndex+stageOffset] = (addedOpportunities[currentOpportunity].CLOSE_DATE || rowData[closeDateIndex+stageOffset])
							rowData[startDateIndex+stageOffset] = (addedOpportunities[currentOpportunity].START_DATE || rowData[startDateIndex+stageOffset])
							rowData[probabilityIndex+stageOffset] = ((addedOpportunities[currentOpportunity].PROBABILITY*100)+"%" || rowData[probabilityIndex+stageOffset])
							rowData[ageIndex+stageOffset] = (addedOpportunities[currentOpportunity].AGE || rowData[ageIndex+stageOffset])
							rowData[createdDateIndex+stageOffset] = (addedOpportunities[currentOpportunity].CREATED_DATE || rowData[createdDateIndex+stageOffset])
							rowData[accountNameIndex+stageOffset] = (addedOpportunities[currentOpportunity].ACCOUNT_NAME || rowData[accountNameIndex+stageOffset])
							currentProjectSize = addedOpportunities[currentOpportunity].PROJECT_SIZE
							delete addedOpportunities[currentOpportunity]
						}
						rowData = assignRoles(rowData,currentProjectSize)
						// console.log(rowData)
						for (var each in rowData)
							returnData.push(rowData[each])
					}
				}
			}
		}
		for (var key in addedOpportunities){
			if (!(omitData[key])){
				newRow = []
				newRow.push((addedOpportunities[key].STAGE || ""),
								key,
								(addedOpportunities[key].AMOUNT || ""),
								(addedOpportunities[key].EXPECTED_AMOUNT || ""),
								(addedOpportunities[key].CLOSE_DATE || ""),
								(addedOpportunities[key].START_DATE || ""),
								((addedOpportunities[key].PROBABILITY*100)+"%" || ""),
								(addedOpportunities[key].AGE || ""),
								(addedOpportunities[key].CREATED_DATE || ""),
								(addedOpportunities[key].ACCOUNT_NAME || "")
							)
				newRow = assignRoles(newRow,addedOpportunities[key].PROJECT_SIZE)
				for (var each in newRow)
					returnData.push(newRow[each])
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

function assignRoles(row,projectSize){
	var tempRow 	= [],
		returnData	= [],
		roleIndex	= 16,
		roles

	console.log(projectSize)

	roles = projectSizes[projectSize].roles_allocations
	
	for (var each in roles){
		tempRow = []
		for (var col in row){
			tempRow.push(row[col])
		}
		tempRow.push(each)
		tempRow.push(projectSize)
		returnData.push(tempRow)
	}
	return returnData
}

function getProjectSize(expectedAmount){
	console.log('expected Amount: '+expectedAmount+'\n')
	expectedAmount = expectedAmount.replace('USD ', '').replace(/,/g,'')
	for (var each in projectSizes){
		if (parseInt(expectedAmount) <= projectSizes[each].priceHigh){
			console.log(each)
			return each
		}
	}

}



