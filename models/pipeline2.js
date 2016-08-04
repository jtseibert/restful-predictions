/**
* Pipeline
* @module Pipeline
* @desc The pipeline module is responsible for querying SalesForce for a Sales Pipeline report.
The report is converted into a 2D array, synced with the database, and then passed down to Google Sheets to
be displayed.
*/

function queryPipeline(accessToken, path, callback) {
	var sf = require('node-salesforce')
	var moment = require('moment')
	// Set up the sheet headers
	var pipelineData = [['Stage',
							'Name',
							'Amount',
							'Expected Revenue',
							'Close Date',
							'Start Date',
							'Probability',
							'Created Date',
							'Account Name']]

	// Connect to SF
	var conn = new sf.Connection({
	  instanceUrl: "https://" + path,
	  accessToken: accessToken
	})

	// Execute SOQL query to populate allocationData
	conn.query("SELECT StageName, Name, Amount, ExpectedRevenue, CloseDate, Probability, CreatedDate, Account.Name FROM Opportunity WHERE CloseDate>=2016-08-03")
  	.on("record", function(record) {
  		var recordData = []
  		// Format the date with Moment library for sheet consistency
    	recordData.push(
    		record.StageName,
			record.Name,
			record.Amount,
			record.ExpectedRevenue,
			moment(new Date(record.CloseDate)).format("MM/DD/YYYY"),
			moment(new Date(record.closeDate)).get(6).format("MM/DD/YYYY"),
			record.Probability,
			moment(new Date(record.CreatedDate)).format("MM/DD/YYYY"),
			record.Account.Name
		)
    	pipelineData.push(recordData)
		})
	.on("end", function(query) {
		console.log("total in database : " + query.totalSize);
		console.log("total fetched : " + query.totalFetched);
		process.nextTick(function() {callback(pipelineData)})
		})
	.on("error", function(err) {
		console.error(err);
		})
	.run({ autoFetch : true, maxFetch : 4000 });
}

module.exports.queryPipeline = queryPipeline





function applyDB(pipelineData, callback){
	var moment 	= require('moment'),
		async 	= require('async'),
		utils 	= require('./utilities')


	// Sets omittedOpportunities, opportunities, and defaultProjectSizes to the values stored in their respective tables in the DB
	function getFromDB(callback){
		var DB = {}

		async.parallel({
			'one': 		utils.getDefaultProjectSizes,
			'two': 		utils.getOmittedOpportunities,
			'three': 	utils.getOpportunities
		}, function(err, results){
			DB.defaultProjectSizes	= results.one
			DB.omittedOpportunities	= results.two
			DB.opportunities	= results.three
			process.nextTick(function(){ callback(null, DB) })
		})		
	}

	// Looks at all opportunities in pipelineData and updates them if we have any persisted data for that opportunity in the DB
	function updateCurrentOpportunites(DB, callback){
		var indexes = {'Stage':				0,
						'Name':				1,
						'Amount':			2,
						'ExpectedRevenue':	3,
						'CloseDate':		4,
						'StartDate':		5,
						'Probability':		6,
						'CreatedDate':		7,
						'AccountName':		8,
						'ProjectSize':		9,
						'Role':				10,
						'WeekDate':			11
					},
			updatedData = []

		// async.each(pipelineData, function(opportunity, callback){
		// 	currentOpportunity = opportunity[indexes.Name]

		// 	if (!DB.omittedOpportunities[currentOpportunity]){ 
		// 		if(!DB.opportunities[currentOpportunity]) {
				
		// 		} else{
		// 			opportunity[indexes.Stage] = DB.opportunities[currentOpportunity].STAGE || opportunity[indexes.Stage]
		// 			opportunity[indexes.Amount] = DB.opportunities[currentOpportunity].AMOUNT || opportunity[indexes.Amount]
		// 			opportunity[indexes.ExpectedRevenue] = DB.opportunities[currentOpportunity].EXPECTED_AMOUNT || opportunity[ExpectedRevenue]
		// 			opportunity[indexes.CloseDate] = moment(new Date(DB.opportunities[currentOpportunity].CLOSE_DATE)).format("MM/DD/YYYY") || opportunity[indexes.CloseDate]
		// 			opportunity[indexes.StartDate] = moment(new Date(DB.opportunities[currentOpportunity].START_DATE)).format("MM/DD/YYYY") || opportunity[indexes.StartDate]
		// 			opportunity[indexes.Probability] = DB.opportunities[currentOpportunity].PROBABILITY*100+"%" || opportunity[indexes.Probability]
		// 			opportunity[indexes.CreatedDate] = moment(new Date(DB.opportunities[currentOpportunity].CREATED_DATE)).format("MM/DD/YYYY") || opportunity[indexes.CreatedDate]
		// 			opportunity[indexes.AccountName] = DB.opportunities[currentOpportunity].ACCOUNT_NAME || opportunity[indexes.AccountName]
		// 			opportunity[indexes.ProjectSize] = DB.opportunities[currentOpportunity].PROJECT_SIZE || generateDefaultProjectSize()
		// 			delete DB.opportunities[currentOpportunity]
		// 		}
		// 	}
		// })
	}

	// Adds any user added opportunities to pipelineData
	function addNewOpportunities(pipelineData, DB, callback){

	}

	async.waterfall([
		getFromDB,
		updateCurrentOpportunites,
		addNewOpportunities
	], function(error, result){
		if (error)
			throw error
		process.nextTick(function() {callback(result)})
	})
}

module.exports.applyDB = applyDB
