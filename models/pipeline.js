/**
* Pipeline
* @module Pipeline
* @desc The pipeline module is responsible for querying SalesForce for a Sales Pipeline report.
The report is converted into a 2D array, synced with the database, and then passed down to Google Sheets to
be displayed.
*/
module.exports = Pipeline

/**
* Creates a Pipeline object for OAuth2 credentials and postgres DB data for importing to Google Sheets
* @param async - async module object
* @param {string} instance - OAuth2 instance
* @param {string} accessToken - OAuth2 access token
* @param pg - pg module object
* @param callback - callback function
*/
function Pipeline(async, instance, accessToken, pg, callback) {
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

	var getProjectSize = function(callback){
			pg.connect(process.env.DATABASE_URL, function(err, client, done) {
      			if (err) return process.nextTick(function(){callback(err)})
				var projectSizes,
					projectSizesQuery = client.query("SELECT sizeid, pricehigh, roles_allocations FROM project_size ORDER BY pricehigh ASC")
				projectSizesQuery.on("row", function (row, result) {
					result.addRow(row)
				})
				projectSizesQuery.on("end", function (result) {
					projectSizes = {}
					for (var entry in result.rows){
						projectSizes[result.rows[entry].sizeid] = {
							"priceHigh": result.rows[entry].pricehigh,
							"roles_allocations": result.rows[entry].roles_allocations
						}
					}
					process.nextTick(function(){callback(null, projectSizes)})
				})
			})
		},
		getOmitData = function(callback){
			pg.connect(process.env.DATABASE_URL, function(err, client, done) {
				if (err) return process.nextTick(function(){callback(err)})
				var omitData,
					omitQuery = client.query("SELECT * from omit")
				omitQuery.on("row", function (row, result) {
					result.addRow(row)
				})
				omitQuery.on("end", function (result) {
					omitData = {}
					for (var entry in result.rows){
						omitData[result.rows[entry].opportunity] = {}
					}
					process.nextTick(function(){callback(null, omitData)})
				})
			})
		},
		getAddedOpportunities = function(callback){
			pg.connect(process.env.DATABASE_URL, function(err, client, done) {
				if (err) return process.nextTick(function(){callback(err)})
				var addedOpportunities,
					opportunitiesQuery = client.query("SELECT * from sales_pipeline")
				opportunitiesQuery.on("row", function (row, result) {
					result.addRow(row)
				})
				opportunitiesQuery.on("end", function (result) {
					addedOpportunities = {}
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
					process.nextTick(function(){callback(null, addedOpportunities)})
				})
			})
		}


	async.parallel({
		'one': getProjectSize,
		'two': getOmitData,
		'three': getAddedOpportunities
	}, function(err, results){
		objInstance.projectSizes 		= results.one
		objInstance.omitData 			= results.two
		objInstance.addedOpportunities 	= results.three
		process.nextTick(callback)
	})
} 

/**
* Gets Sales Pipeline report information from SalesForce and parses it into a 2D array
* @function get
* @param oauth2 - simple-oauth2 module object
* @param async - async module object
* @param cache - node-cache module object
* @param callback - callback function that handles Sales Pipeline data
*/
Pipeline.prototype.get = function(oauth2, async, cache, callback) {
	
	parameters = {
		access_token: this.accessToken
	}

	var returnData = this.returnData,
		omitData = this.omitData,
		addedOpportunities = this.addedOpportunities,
		projectSizes = this.projectSizes,
		returnData = this.returnData,
		objInstance = this

	oauth2.api('GET', this.path, parameters, function (err, data) {
    	if (err)
        	console.log('GET Error: ', JSON.stringify(err)) 
    
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
								currentProjectSize = getProjectSize(currentCell.label, objInstance.projectSizes)
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
			process.nextTick(callback)
		}, function(err) {
			if (err)
				console.log(err)
			else {
				cache.set("sales_pipeline", cacheData, function(err, success) {
					if(!err && success) {
						console.log('sales_pipeline data cached')
					} 
				})
			}
		}) //End of eachOf
		process.nextTick(function(){callback(cacheData)})
	})	// End of api.GET
} // End prototype.get

/**
* Filters 2D array of Sales Pipeline data with database
* (Is a callback for get method)
* @function applyDB
* @param async - async module object
* @param {Array} cacheData - Sales Pipeline data
* @param callback - callback function to handle filtered Sales Pipeline data
*/
Pipeline.prototype.applyDB = function(async, cacheData, callback) {

	var currentOpportunity,
		tempRow,
		opportunityIndex = 1,
		returnData = this.returnData,
		omitData = this.omitData,
		addedOpportunities = this.addedOpportunities,
		projectSizes = this.projectSizes,
		objInstance = this

	async.each(cacheData, function(row, callback){
		currentOpportunity = row[opportunityIndex]
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
				row[10] = (addedOpportunities[currentOpportunity].PROJECT_SIZE || row[10])
				delete addedOpportunities[currentOpportunity]
			}
			var rowsToAdd = assignRoles(row, projectSizes)
			async.each(rowsToAdd,function(row){
				objInstance.returnData.push(row)
			})
		}
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
				var rowsToAdd = assignRoles(newRow, projectSizes)
				async.each(rowsToAdd,function(row){
					objInstance.returnData.push(row)
				})
			}
		})
	})
	process.nextTick(callback)
}

/**
* Determines a project's start date
* @function calculateStartDate
* @param {Date} closeDate - project close date
* @param {Integer} dateIncrement - number of days to add onto close date
* @returns {Date} returnDate - a project's start date
*/
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

/**
* Duplicates an opportunity row for every role in an opportunities list of roles
* @function assignRoles
* @param {Array} row - row in the sales pipeline data
* @param {Object} - list of current project sizes
* @returns {Array} returnArray - duplicated rows of an opportunity
*/
function assignRoles(row, projectSizes){

	var projectSizeIndex 		= 10,
		returnArray				= [],
	    projectSize 			= row[projectSizeIndex]

	if(projectSize) {
		var tempRow 			= [],
			roles 				= projectSizes[projectSize].roles_allocations,
			daysInWeek 			= 7

		for (var role in roles) {
			for(var i=0; i<roles[role].duration; i++) {
				tempRow = []
				for (var col in row) {
					tempRow.push(row[col])
				}
				tempRow.push(role,roles[role].allocation,calculateStartDate(row[5],(parseInt(roles[role].offset)+i)*daysInWeek))
				returnArray.push(tempRow)
			}
		}
	}
	return returnArray
}

/**
* Determines an opportunities project sized
* @function getProjectSize
* @param {Integer} expectedAmount - expected revenue from opportunity
* @param {Object} projectSizes - list of current project sizes
* @returns {string} each - an opportunities project size
*/
function getProjectSize(expectedAmount, projectSizes){
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

