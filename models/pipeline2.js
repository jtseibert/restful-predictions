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
			moment(new Date(record.closeDate)).day(6).format("MM/DD/YYYY"),
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

	// Insert query from SF into DB, on conflict do nothing
	function updateDBTables(DB, callback){

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
						'WeekAllocations':	11
					}

		async.each(pipelineData, function(opportunity, callback){
			if(!DB.omittedOpportunities[opportunity[indexes.Name]]){
				var rowsToInsert
				utils.assignRoleAllocations(opportunity,DB.defaultProjectSizes,indexes, function(result){
					rowstoInsert = result
					async.each(rowsToInsert, function(row, callback){
						utils.query("INSERT INTO sales_pipeline(opportunity, stage, amount, expected_revenue, close_date, start_date, probability, created_date, account_name, role, week_allocations),"+
									"values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO UPDATE SET stage=$2, amount=$3, expected_revenue=$4, close_date=$5, probability=$7",
									[ row[indexes.Name],
										row[indexes.Stage],
										row[indexes.Amount],
										row[indexes.ExpectedRevenue],
										row[indexes.CloseDate],
										row[indexes.StartDate],
										row[indexes.Probability],
										row[indexes.CreatedDate],
										row[indexes.AccountName],
										row[indexes.Role],
										row[indexes.weekAllocations]
									], function(){}
								)
						process.nextTick(callback)
					}, function(){ process.nextTick(callback) })
				})
			} else { process.nextTick(callback) }
		}, function(){
			process.nextTick(function(){ callback(null, DB) })
		})
	}

	// Get all data from SalesPipeline in DB and put into 2D array
	function prepareReturnData(DB, callback){
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
						'WeekDate':			11,
						'EstimatedHours':	12
					},
			returnData = [[
							'Opportunity',
							'Stage',
							'Amount',
							'Expected Revenue',
							'Close Date',
							'Start Date',
							'Probability',
							'Created Date',
							'Account Name',
							'Role',
							'Week',
							'EstimatedHours'
						]]
		
		utils.query("SELECT opportunity,stage,amount,expected_revenue,close_date,start_date,probability,created_date,account_name,role,week_allocations FROM sales_pipeline",null,function(results){
				async.each(results, function(opportunity, callback){
				var rowsToPush = []
				rowsToPush = utils.applyWeekAllocations(opportunity, rowsToPush)
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
