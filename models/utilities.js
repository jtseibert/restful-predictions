var moment 	= require('moment'),
	async 	= require('async'),
	pg 		= require('pg')

pg.defaults.ssl = true
pg.defaults.poolSize = 10

function getDefaultProjectSizes(callback){
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

function getOmittedOpportunities(callback){
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

function getAddedOpportunities(callback){
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		if (err) return process.nextTick(function(){callback(err)})
		var addedOpportunities,
			addedOpportunitiesQuery = client.query("SELECT * from sales_pipeline")
		addedOpportunitiesQuery.on("row", function (row, result) {
			result.addRow(row)
		})
		addedOpportunitiesQuery.on("end", function (result) {
			done()
			addedOpportunities = {}
			async.each(result.rows, function(row, callback){
				addedOpportunities[row.opportunity] = {
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
				process.nextTick(function(){callback(null, addedOpportunities)})
			})
		})
	})
}


module.exports.getAddedOpportunities 	= getAddedOpportunities
module.exports.getOmittedOpportunities 	= getOmittedOpportunities
module.exports.getDefaultProjectSizes 	= getDefaultProjectSizes