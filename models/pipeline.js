//pipeline.js
//input: 
	//SF instance and SF accessToken

module.exports = Pipeline

function Pipeline(instance, accessToken) {
	this.accessToken = accessToken
	this.path = 'https://' + instance + '/services/data/v35.0/analytics/reports/00Oa00000093sCD'
} 

Pipeline.prototype.get = function(client, oauth2, cache, callback) {

	console.log(this.accessToken)
	var pipelineCache = new cache(),
		cachedPipeline
    pipelineCache.get("sales_pipeline", function(err, value) {
    	if(err)
    		throw err
    	else
    		cachedPipeline = value
    })

    if(!cachedPipeline) {
    	console.log('not Cached')
		//Do what we had originaly and store in cache
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
			console.log(omitData)
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
		    	probabilityIndex		= 7,
		    	ageIndex 				= 9,
		    	createdDateIndex 		= 10,
		    	accountNameIndex 		= 13,
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
							probabilityIndex,
							ageIndex,
							createdDateIndex,
							accountNameIndex]

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
								"PROJECT_SIZE",
								"ESTIMATED_HOURS",
								"WEEK_DATE"
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
								if (indexes.indexOf(parseInt(cell, 10)) > -1) {
									currentCell = currentRow.dataCells[cell]
									if (cell == closeDateIndex)
										rowData.push(cleanUpDate(currentCell.label), calculateStartDate(currentCell.label, week))
									else if (cell == createdDateIndex)
										rowData.push(cleanUpDate(currentCell.label))
									else if (cell == expectedAmountIndex){
										currentProjectSize = getProjectSize(currentCell.label)
										stripAmount = currentCell.label.replace('USD ', '').replace(/,/g,'')
										rowData.push(stripAmount)
									} else if (cell == amountIndex){
										stripAmount = currentCell.label.replace('USD ', '').replace(/,/g,'')
										rowData.push(stripAmount)
									} else {
										rowData.push(currentCell.label)
									}
								}
							}
							if(addedOpportunities[currentOpportunity]){
								rowData[0] = (addedOpportunities[currentOpportunity].STAGE || rowData[0])
								rowData[2] = (addedOpportunities[currentOpportunity].AMOUNT || rowData[2])
								rowData[3] = (addedOpportunities[currentOpportunity].EXPECTED_AMOUNT || rowData[3])
								rowData[4] = (cleanUpDate(addedOpportunities[currentOpportunity].CLOSE_DATE) || rowData[4])
								rowData[5] = (cleanUpDate(addedOpportunities[currentOpportunity].START_DATE) || rowData[5])
								rowData[6] = ((addedOpportunities[currentOpportunity].PROBABILITY*100)+"%" || rowData[6])
								rowData[7] = (addedOpportunities[currentOpportunity].AGE || rowData[7])
								rowData[8] = (cleanUpDate(addedOpportunities[currentOpportunity].CREATED_DATE) || rowData[8])
								rowData[9] = (addedOpportunities[currentOpportunity].ACCOUNT_NAME || rowData[9])
								currentProjectSize = addedOpportunities[currentOpportunity].PROJECT_SIZE
								delete addedOpportunities[currentOpportunity]
							}
							rowData = assignRoles(rowData,currentProjectSize)
							for (var each in rowData)
								returnData.push(rowData[each])
						}
					}
				}
			}
			for (var key in addedOpportunities){
				if (!(omitData[key])){
					newRow = []
					newRow.push((addedOpportunities[key].STAGE || "New Opportunity"),
									key,
									(addedOpportunities[key].AMOUNT || "0"),
									(addedOpportunities[key].EXPECTED_AMOUNT || "0"),
									(cleanUpDate(addedOpportunities[key].CLOSE_DATE) || cleanUpDate(new Date())),
									(cleanUpDate(addedOpportunities[key].START_DATE) || cleanUpDate(new Date())),
									(((addedOpportunities[key].PROBABILITY*100)+"%") || "50%"),
									(addedOpportunities[key].AGE || "0"),
									(cleanUpDate(addedOpportunities[key].CREATED_DATE) || cleanUpDate(new Date())),
									(addedOpportunities[key].ACCOUNT_NAME || "-")
								)
					newRow = assignRoles(newRow,addedOpportunities[key].PROJECT_SIZE)
					for (var each in newRow)
						returnData.push(newRow[each])
				}
			}
			pipelineCache.set("sales_pipeline", returnData, function(err, value) { 
				console.log('caching sales_pipeline')
				callback(returnData)
			})
		})
	} else {
		console.log('cachedPipeline')
		callback(cachedPipeline)
	}
}

function calculateStartDate(closeDate, dateIncrement){
	var date = new Date(closeDate)
	var returnDate = getMonday(new Date(date.setDate(date.getDate() + dateIncrement)))
	returnDate = JSON.stringify(returnDate).split('T')[0].split('-')
	return returnDate[1]+'/'+returnDate[2]+'/'+returnDate[0].replace('"','')
}

function cleanUpDate(date){
	if (date != null) {
		var date = new Date(date)
		date = JSON.stringify(date).split('T')[0].split('-')
		return date[1]+'/'+date[2]+'/'+date[0].replace('"','')
	} else { return null }
}

function assignRoles(row,projectSize){
	if(projectSize) {
		var tempRow 	= [],
			returnData	= [],
			roles 		= projectSizes[projectSize].roles_allocations,
			daysInWeek 		= 7

		for (var role in roles) {
			for(var i=0; i<roles[role].duration; i++) {
				tempRow = []
				for (var col in row) {
					tempRow.push(row[col])
				}
				tempRow.push(role,projectSize,roles[role].allocation,calculateStartDate(row[5],(parseInt(roles[role].offset)+i)*daysInWeek))
				returnData.push(tempRow)
			}
		}
		return returnData
	} else {
		var tempRow 	= []

		for (var col in row) {
			tempRow.push(row[col])
		}
		tempRow.push('-','-','0',(CalculateStartDate(new Date(),0)))
		return tempRow
	}
}

function getProjectSize(expectedAmount){
	expectedAmount = expectedAmount.replace('USD ', '').replace(/,/g,'')
	for (var each in projectSizes){
		if (parseInt(expectedAmount) <= projectSizes[each].priceHigh){
			return each
		}
	}

}

function getMonday(d) {
	d = new Date(d)
	var day = d.getDay(),
		diff = d.getDate() - day + (day == 0 ? -6:1)
	return new Date(d.setDate(diff))
}

