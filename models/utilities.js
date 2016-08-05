var moment 	= require('moment'),
	async 	= require('async'),
	pg 		= require('pg')

pg.defaults.ssl = true
pg.defaults.poolSize = 10

function getDefaultProjectSizes_DB(callback){
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
			if (err) return process.nextTick(function(){callback(err)})
		var defaultProjectSizes,
			defaultProjectSizesQuery = client.query("SELECT sizeid, pricehigh, roles_allocations, numweeks FROM project_size ORDER BY pricehigh ASC")
		defaultProjectSizesQuery.on("row", function (row, result) {
			result.addRow(row)
		})
		defaultProjectSizesQuery.on("end", function (result) {
			done()
			defaultProjectSizes = {}
			async.each(result.rows, function(row, callback){
				defaultProjectSizes[row.sizeid] = {
					"priceHigh": 			row.pricehigh,
					"roles_allocations": 	row.roles_allocations,
					"numWeeks": 			row.numweeks
				}
				process.nextTick(callback)
			}, function(){
				process.nextTick(function(){callback(null, defaultProjectSizes)})
			})
		})
	})
}

function getOmittedOpportunities_DB(callback){
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		if (err) return process.nextTick(function(){callback(err)})
		var omittedOpportunities,
			omittedOpportunitiesQuery = client.query("SELECT * from omit")
		omittedOpportunitiesQuery.on("row", function (row, result) {
			result.addRow(row)
		})
		omittedOpportunitiesQuery.on("end", function (result) {
			done()
			omittedOpportunities = {}
			async.each(result.rows, function(row, callback){
				omittedOpportunities[row.opportunity] = {}
				process.nextTick(callback)
			}, function(){
				process.nextTick(function(){callback(null, omittedOpportunities)})
			})
		})
	})
}

function getOpportunities_DB(callback){
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		if (err) return process.nextTick(function(){callback(err)})
		var opportunities,
			opportunitiesQuery = client.query("SELECT * from sales_pipeline")
		opportunitiesQuery.on("row", function (row, result) {
			result.addRow(row)
		})
		opportunitiesQuery.on("end", function (result) {
			done()
			opportunities = {}
			async.each(result.rows, function(row, callback){
				opportunities[row.opportunity] = {
					"STAGE": row.stage,
					"AMOUNT": row.amount,
					"EXPECTED_AMOUNT": row.expected_amount,
					"CLOSE_DATE": row.close_date,
					"START_DATE": row.start_date,
					"PROBABILITY": row.probability,
					"AGE": row.age,
					"CREATED_DATE": row.create_date,
					"ACCOUNT_NAME": row.account_name,
					"PROJECT_SIZE": row.project_size
				}
				process.nextTick(callback)
			}, function(){
				process.nextTick(function(){callback(null, opportunities)})
			})
		})
	})
}

function purgeSalesPipeline_DB(callback){
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		if (err) return process.nextTick(function(){callback(err)})
		var today = moment().format("L")
		today = today.toString()
		client.query("DELETE FROM sales_pipeline WHERE protected=FALSE OR start_date<'"+today+"'", function(err, success){
			if(err)
				console.log(err)
			if(success)
				console.log(success)
			done() 
			process.nextTick(callback)
		})
	})
}



module.exports.getOpportunities_DB 			= getOpportunities_DB
module.exports.getOmittedOpportunities_DB 	= getOmittedOpportunities_DB
module.exports.getDefaultProjectSizes_DB 	= getDefaultProjectSizes_DB
module.exports.purgeSalesPipeline_DB		= purgeSalesPipeline_DB