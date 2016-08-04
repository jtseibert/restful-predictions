var moment 	= require('moment'),
	async 	= require('async'),
	pg 		= require('pg')

pg.defaults.ssl = true

function getDefaultProjectSizes(callback){
				pg.connect(process.env.DATABASE_URL, function(err, client, done) {
	      			if (err) return process.nextTick(function(){callback(err)})
					var defaultProjectSizes,
						defaultProjectSizesQuery = client.query("SELECT sizeid, pricehigh, roles_allocations, numweeks FROM project_size ORDER BY pricehigh ASC")
					defaultProjectSizesQuery.on("row", function (row, result) {
						result.addRow(row)
					})
					defaultProjectSizesQuery.on("end", function (result) {
						defaultProjectSizes = {}
						//for (var entry in result.rows){
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
			}

function getAddedOpportunities(callback){
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


module.exports.getAddedOpportunities 	= getAddedOpportunities
module.exports.getOmittedOpportunities 	= getOmittedOpportunities
module.exports.getDefaultProjectSizes 	= getDefaultProjectSizes