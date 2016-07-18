//pipeline.js
//input: 
	//SF instance and SF accessToken

module.exports = Pipeline

function Pipeline(instance, accessToken, client) {
	var objInstance = this
	this.accessToken 		= accessToken
	this.path 				= 'https://' + instance + '/services/data/v35.0/analytics/reports/00Oa00000093sCD'
	this.returnData			= [["STAGE",
	    						"OPPORTUNITY_NAME",
								"AMOUNT",
								"EXP_AMOUNT",
								"CLOSE_DATE",
								"START_DATE",
								"PROBABILITY",
								"AGE",
								"CREATED_DATE",
								"ACCOUNT_NAME",
								"PROJECT_SIZE",
								"ROLE",
								"ESTIMATED_HOURS",
								"WEEK_DATE"
								]]
	this.omitData
	this.projectSizes
	this.addedOpportunities

	console.log('hello')

   	var projectSizesQuery = client.query("SELECT sizeid, pricehigh, roles_allocations FROM project_size ORDER BY pricehigh ASC")
	projectSizesQuery.on("row", function (row, result) {
		result.addRow(row)
	})
	projectSizesQuery.on("end", function (result) {
		objInstance.projectSizes = {}
		for (var entry in result.rows){
			objInstance.projectSizes[result.rows[entry].sizeid] = {
				"priceHigh": result.rows[entry].pricehigh,
				"roles_allocations": result.rows[entry].roles_allocations
			}
		}
	})

	var omitQuery = client.query("SELECT * from omit")
	omitQuery.on("row", function (row, result) {
		result.addRow(row)
	})
	omitQuery.on("end", function (result) {
		objInstance.omitData = {}
		for (var entry in result.rows){
			objInstance.omitData[result.rows[entry].opportunity] = {}
		}
		console.log(objInstance.omitData)
	})

		var opportunitiesQuery = client.query("SELECT * from sales_pipeline")
	opportunitiesQuery.on("row", function (row, result) {
		result.addRow(row)
	})
	opportunitiesQuery.on("end", function (result) {
		objInstance.addedOpportunities = {}
		for (var entry in result.rows){
			objInstance.addedOpportunities[result.rows[entry].opportunity] = {
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

} 

Pipeline.prototype.get = function(client, oauth2, async, cache, callback) {
	
	parameters = {
		access_token: this.accessToken
	}

	oauth2.api('GET', this.path, parameters, function (err, data) {
    	if (err)
        	console.log('GET Error: ', JSON.stringify(err)) 

        console.log('Made REST call within pipline.js')
    
    	var factMap 				= data.factMap,
    		groupingsDown 			= data.groupingsDown.groupings,
    		cacheData 				= [],
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

		async.eachOf(factMap, function(stage, stageKey, callback){
			stageKey = stageKey.split('!')[stageIndex]
			if (stageKey != "T")
				async.each(stage.rows, function(row){
					currentOpportunity = row.dataCells[opportunityIndex].label
					rowData = []
					rowData.push(groupingsDown[stageKey].label)
					for (var cell in row.dataCells) {
						if (indexes.indexOf(parseInt(cell, 10)) > -1) {
							currentCell = row.dataCells[cell]
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
					} // End for loop
					rowData.push(currentProjectSize)
					cacheData.push(rowData)
				}) // End async.each
			callback()
		}, function(err) {
			console.log('second callback')
			if (err)
				console.log(err)
			else {
				console.log('going to cache cacheData')
				cache.set("sales_pipeline", cacheData, function(err, success) {
					if(!err && success) {
						console.log('caching sales_pipeline within pipeline.js')
					} 
				})
			}
		}) //End of eachOf
		callback(cacheData)
	})	// End of api.GET
} // End prototype.get

Pipeline.prototype.applyDB = function(client, async, cacheData, callback) {

	var currentOpportunity,
		tempRow,
		opportunityIndex = 1,
		returnData = this.returnData,
		omitData = this.omitData,
		addedOpportunities = this.addedOpportunities,
		projectSizes = this.projectSizes
	/*
		- make sure not in omit
		- update if in addedOpportunities
		- call assignRoles
	*/
	async.each(cacheData, function(row, returnData, omitData, addedOpportunities, projectSizes, callback){
		currentOpportunity = row[opportunityIndex]
		console.log(omitData)
		if (!(omitData[currentOpportunity])){
			if(addedOpportunities[currentOpportunity]){
				row[0] = (addedOpportunities[currentOpportunity].STAGE || row[0])
				row[2] = (addedOpportunities[currentOpportunity].AMOUNT || row[2])
				row[3] = (addedOpportunities[currentOpportunity].EXPECTED_AMOUNT || row[3])
				row[4] = (cleanUpDate(addedOpportunities[currentOpportunity].CLOSE_DATE) || row[4])
				row[5] = (cleanUpDate(addedOpportunities[currentOpportunity].START_DATE) || row[5])
				row[6] = ((addedOpportunities[currentOpportunity].PROBABILITY*100)+"%" || row[6])
				row[7] = (addedOpportunities[currentOpportunity].AGE || rowData[7])
				row[8] = (cleanUpDate(addedOpportunities[currentOpportunity].CREATED_DATE) || row[8])
				row[9] = (addedOpportunities[currentOpportunity].ACCOUNT_NAME || row[9])
				currentProjectSize = addedOpportunities[currentOpportunity].PROJECT_SIZE
				delete addedOpportunities[currentOpportunity]
			}
			assignRoles(row)
		}
		callback()
	}, function(err){
		async.eachOf(addedOpportunities, function(opportunity, key){
			if (!omitData[key]){
				newRow = []
				newRow.push((opportunity.STAGE || "New Opportunity"),
								key,
								(opportunity.AMOUNT || "0"),
								(opportunity.EXPECTED_AMOUNT || "0"),
								(cleanUpDate(opportunity.CLOSE_DATE) || cleanUpDate(new Date())),
								(cleanUpDate(opportunity.START_DATE) || cleanUpDate(new Date())),
								(((opportunity.PROBABILITY*100)+"%") || "50%"),
								(opportunity.AGE || "0"),
								(cleanUpDate(opportunity.CREATED_DATE) || cleanUpDate(new Date())),
								(opportunity.ACCOUNT_NAME || "-"),
								(opportunity.PROJECT_SIZE)
							)
				assignRoles(newRow)
			}
		})
	})
	callback(this.returnData)
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

function assignRoles(row){
	var projectSizeIndex 		= 10,
	    projectSize 			= row[projectSizeIndex]
	if(projectSize) {
		var tempRow 			= [],
			roles 				= this.projectSizes[projectSize].roles_allocations,
			daysInWeek 			= 7

		for (var role in roles) {
			for(var i=0; i<roles[role].duration; i++) {
				tempRow = []
				for (var col in row) {
					tempRow.push(row[col])
				}
				tempRow.push(role,roles[role].allocation,calculateStartDate(row[5],(parseInt(roles[role].offset)+i)*daysInWeek))
				this.returnData.push(tempRow)
			}
		}
	}
}

function getProjectSize(expectedAmount){
	expectedAmount = expectedAmount.replace('USD ', '').replace(/,/g,'')
	for (var each in this.projectSizes){
		if (parseInt(expectedAmount) <= this.projectSizes[each].priceHigh){
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

