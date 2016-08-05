var moment 	= require('moment'),
	async 	= require('async'),
	pg 		= require('pg')

pg.defaults.ssl = true
pg.defaults.poolSize = 10

function getDefaultProjectSizes_DB(callback){
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
			if (err) return process.nextTick(function(){callback(err)})
		var defaultProjectSizes,
			defaultProjectSizesQuery = client.query("SELECT sizeid, pricehigh, roles_allocations, numweeks FROM project_size ORDER BY pricehigh DESC")
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
		client.query("DELETE FROM sales_pipeline WHERE protected=FALSE OR start_date<'"+today+"'", function(){
			done() 
			process.nextTick(callback)
		})
	})
}

// Helper function to query any table in database
var query = function query(query, values, callback) {
	q = query
	v = values
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		console.log("query is: " + q + 'with values' + values)
		var query
		if(v != null) {
			query = client.query(q, v, function(error) {
				if(error){
					done()
					process.nextTick(callback)
				}
			})
		} else {
			query = client.query(q, function(error) {
				if(error){
					done()
					process.nextTick(callback)
				} 
			})
		}
		query.on("row", function (row, result) {
			console.log(row)
			result.addRow(row)
		})
		query.on("end", function (result) {
			done()
			process.nextTick(function() {callback(result.rows)})
		})	
	})
}

function assignRoleAllocations(row, defaultProjectSizes, indexes){
	console.log('assignRoleAllocations: '+row)
	var amount = row[indexes.Amount],
		projectSize

	getProjectSize(amount, defaultProjectSizes, function(projectSize){
		assignRoles(row, projectSize, defaultProjectSizes, indexes, function(){

		})
	})
}

function applyWeekAllocations(opportunity, rowsToPush){

	return rowsToPush
}

function getProjectSize(amount, defaultProjectSizes, callback){
	async.eachOfSeries(defaultProjectSizes, function(projectSize, key, callback){
		if(projectSize.priceHigh > amount){
			process.nextTick(function() {callback(key)})
		} else { process.nextTick(callback) }
	}, function(result){
		process.nextTick(function() {callback(result)})
	})
}

function assignRoles(row, projectSize, projectSizes, indexes){
	
	var returnArray = [],
	tempRow 		= [],
	roles 			= projectSizes[projectSize].roles_allocations,
	daysInWeek 		= 7

	// for (var role in roles) {
	async.eachOf(roles, function(role, roleKey, callback){
		//for(var i=0; i<roles[role].duration; i++) {
		async.times(role.duration, function(n, next){
			tempRow = []
			//for (var col in row) {
			async.eachSeries(row, function(field, callback){
				tempRow.push(field)
				process.nextTick(callback)
			}, function(){
				tempRow.push(roleKey,role.allocation,calculateStartDate(row[indexes.StartDate],(parseInt(role.offset)+n)*daysInWeek))
				returnArray.push(tempRow)
				next()
			})
		}, function(){ process.nextTick(callback) })
	}, function(){
			process.nextTick(function() {callback(returnArray)})
	})
}


// Should eventually turn this into moment
function calculateStartDate(closeDate, dateIncrement){
	var date = new Date(closeDate)
	var returnDate = moment(new Date(date.setDate(date.getDate() + dateIncrement))).day(6).format("MM/DD/YYYY")
	returnDate = JSON.stringify(returnDate).split('T')[0].split('-')
	return returnDate[1]+'/'+returnDate[2]+'/'+returnDate[0].replace('"','')
}

module.exports.query						= query
module.exports.getOpportunities_DB 			= getOpportunities_DB
module.exports.getOmittedOpportunities_DB 	= getOmittedOpportunities_DB
module.exports.getDefaultProjectSizes_DB 	= getDefaultProjectSizes_DB
module.exports.purgeSalesPipeline_DB		= purgeSalesPipeline_DB
module.exports.applyWeekAllocations			= applyWeekAllocations
module.exports.assignRoleAllocations		= assignRoleAllocations






