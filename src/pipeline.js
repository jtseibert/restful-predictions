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
	var pipelineData = []

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
			moment(new Date(record.CloseDate)).day(6).format("MM/DD/YYYY"),
			record.Probability,
			moment(new Date(record.CreatedDate)).format("MM/DD/YYYY"),
			record.Account.Name
		)
    	pipelineData.push(recordData)
		})
	.on("end", function(query) {
		//console.log("total in database : " + query.totalSize);
		//console.log("total fetched : " + query.totalFetched);
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
		utils 	= require('./utilities'),
		helpers = require('./helpers')

	pipelineData = pipelineData

	// Sets omittedOpportunities, opportunities, and defaultProjectSizes to the values stored in their respective tables in the DB
	function prepareDB(callback){
		var DB = {}

		async.parallel({
			'one': 		utils.getDefaultProjectSizes_DB,
			'two': 		utils.getOmittedOpportunities_DB,
			'three': 	utils.purgeSalesPipeline_DB
		}, function(err, results){
			DB.defaultProjectSizes	= results.one
			DB.omittedOpportunities	= results.two
			process.nextTick(function(){ callback(null, DB) })
		})		
	}

	var indexes = {'STAGE':				0,
							'NAME':				1,
							'ACCOUNT':			2,
							'EXP_AMOUNT':	3,
							'CLOSE_DATE':		4,
							'START_DATE':		5,
							'PROBABILITY':		6,
							'CREATED_DATE':		7,
							'ACCOUNT_NAME':		8,
							'PROJECT_SIZE':		9,
							'ROLE':				10,
							'WEEK_ALLOCATIONS':	11
						}	

	// Insert query from SF into DB, on conflict do nothing
	function updateDBTables(DB, callback){
		async.each(pipelineData, function(opportunity, callback){
			if(!DB.omittedOpportunities[opportunity[indexes.Name]]){
				var rowsToInsert
				utils.assignRoleAllocations(opportunity,DB.defaultProjectSizes,indexes, function(result){
					async.each(result, function(row, callback){
						helpers.query("INSERT INTO sales_pipeline(opportunity, stage, amount, expected_revenue, close_date, start_date, probability, created_date, account_name, role, week_allocations),"+
									"values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO UPDATE SET stage=$2, amount=$3, expected_revenue=$4, close_date=$5, probability=$7",
									[ row[indexes.NAME],
										row[indexes.STAGE],
										row[indexes.AMOUNT],
										row[indexes.EXP_AMOUNT],
										row[indexes.CLOSE_DATE],
										row[indexes.START_DATE],
										row[indexes.PROBABILITY],
										row[indexes.CREATED_DATE],
										row[indexes.ACCOUNT_NAME],
										row[indexes.ROLE],
										row[indexes.WEEK_ALLOCATIONS]
									], function(){
										process.nextTick(callback)
									}
								)
					}, function(){ process.nextTick(callback) })
				})
			} else { process.nextTick(callback) }
		}, function(){
			console.log('finished updateDBTables')
			process.nextTick(function(){ callback(null, DB) })
		})
	}

	// Get all data from SalesPipeline in DB and put into 2D array
	function prepareReturnData(DB, callback){
			returnData = [[
							'OPPORTUNITY',
							'STAGE',
							'AMOUNT',
							'EXP_AMOUNT',
							'CLOSE_DATE',
							'START_DATE',
							'PROBABILITY',
							'CREATED_DATE',
							'ACCOUNT_NAME',
							'ROLE',
							'WEEK',
							'ESTIMATED_HOURS'
						]]
		
		helpers.query("SELECT opportunity,stage,amount,expected_revenue,close_date,start_date,probability,created_date,account_name,role,week_allocations FROM sales_pipeline",null,function(results){
			async.each(results, function(opportunity, callback){
				utils.applyWeekAllocations(opportunity, indexes, function(result){
					async.each(result, function(opportunity,callback){
						returnData.push(result)
						process.nextTick(callback)
					}, function(){
						process.nextTick(callback)
					})
				})
			}, function(){
				process.nextTick(function(){ callback(null, returnData) })
			})
		})
	}

	async.waterfall([
		prepareDB,
		updateDBTables,
		prepareReturnData
	], function(error, result){
		if (error)
			throw error
		process.nextTick(function() {callback(result)})
	})
}

module.exports.applyDB = applyDB
