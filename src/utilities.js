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

function assignRoleAllocations(row, defaultProjectSizes, indexes, callback){
	var amount = row[indexes.Amount],
		projectSize

	getProjectSize(amount, defaultProjectSizes, function(projectSize){
		assignRoles(row, projectSize, defaultProjectSizes, indexes, function(result){
			process.nextTick(function() {callback(result)})
		})
	})
}

// Needs to take info from sales_pipeline table in DB and put into arrays for sheets
function applyWeekAllocations(opportunity,indexes,callback){
	var returnData = []

	async.eachOf(opportunity[indexes.WeekAllocations], function(hours, week, callback){
		var tempRow = opportunity
		tempRow[indexes.WeekAllocations] = week
		tempRow.push(hours)
		returnData.push(tempRow)
		process.nextTick(callback)
	}, function(){ 
		process.nextTick(function() {callback(returnData)})
	})
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

// Needs to put info from project_sizes table in DB into info for sales_pipeline table in DB
function assignRoles(row, projectSize, projectSizes, indexes, callback){
	var returnArray = [],
		roles 		= projectSizes[projectSize].roles_allocations,
		daysInWeek 	= 7

	async.eachOf(roles, function(role, roleKey, callback){
		var tempRow = row,
				week_allocations = {}
		async.times(role.duration, function(n, next){
			var curWeek = calculateStartDate(row[indexes.StartDate],(parseInt(role.offset)+n)*daysInWeek)
			week_allocations[curWeek] = role.allocation
			next()
		}, function(){ 
			tempRow.push(roleKey,week_allocations)
			returnArray.push(tempRow)
			process.nextTick(callback)
		})
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

module.exports.getOpportunities_DB 			= getOpportunities_DB
module.exports.getOmittedOpportunities_DB 	= getOmittedOpportunities_DB
module.exports.getDefaultProjectSizes_DB 	= getDefaultProjectSizes_DB
module.exports.purgeSalesPipeline_DB		= purgeSalesPipeline_DB
module.exports.applyWeekAllocations			= applyWeekAllocations
module.exports.assignRoleAllocations		= assignRoleAllocations






