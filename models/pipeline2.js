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


	// Sets omittedOpportunities, addedOpportunities, and defaultProjectSizes to the values stored in their respective tables in the DB
	function getFromDB(callback){
		var DB = {}

		async.parallel({
			'one': 		utils.getDefaultProjectSizes,
			'two': 		utils.getOmittedOpportunities,
			'three': 	utils.getAddedOpportunities
		}, function(err, results){
			DB.defaultProjectSizes	= results.one
			DB.omittedOpportunities	= results.two
			DB.addedOpportunities	= results.three
			process.nextTick(function(){ callback(pipelineData, DB) })
		})		
	}

	// Looks at all opportunities in pipelineData and updates them if we have any persisted data for that opportunity in the DB
	function updateCurrentOpportunites(pipelineData, DB, callback){
		console.log(DB)
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
