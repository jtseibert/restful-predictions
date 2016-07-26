//forecast.js
//output:
	//forecast report as a 2D array
	
module.exports = Forecast

async = require('../node_modules/async')

function Forecast(pg, data, callback) {

	this.sheetsData 		= data[0]
	this.sumSalesPipeline 	= data[1]
	this.returnData 		= [['ROLE',
								'WEEK_DATE',
								'ALLOCATED_ESTIMATED_HOURS(WEEK)',
								'SUM_AEH',
								'NAME',
								'CONTACT_ID',
								'REPORTS_TO',
								'SUM_SALES_PIPELINE_ESTIMATED_HOURS',
								'SUM_CAPACTIY_ESTIMATED_HOURS']]
	this.sumCapacity
	objInstance = this

	var one = function(callback){
		pg.connect(process.env.DATABASE_URL, function(err, client, done) {
			roles_hours = {}
			if (err)
				console.log(err)
			var query = client.query('SELECT * FROM roles_hours')
			query.on("row", function (row, result) {
				roles_hours[row.role] = {'reports_to': row.reports_to, 'sum': row.sum}
			})
			query.on("end", function (result) {
				process.nextTick(function(){callback(null, roles_hours)})
			})
		})
	}

	async.parallel({
	 	'one': one
	}, function(err, results){
	 	objInstance.sumCapacity = roles_hours
	 	process.nextTick(callback)
	})
} 

Forecast.prototype.create = function(callback) {
	objInstance = this

	console.log(JSON.stringify(objInstance.sumSalesPipeline))

	async.each(objInstance.sheetsData, function(row, callback){
		var tempRow = []
		var newData = []
		async.eachSeries(row, function(value, callback){
			tempRow.push(value)
			process.nextTick(callback)
		}, function(){
			tempRow.push(JSON.stringify(objInstance.sumCapacity[row[0]].reports_to))
			// if(objInstance.sumSalesPipeline[row[0]][row[1]] == null)
			// 	console.log('role: '+row[0]+'\tweek: '+row[1])
			tempRow.push(objInstance.sumSalesPipeline[row[0]][row[1]])
			tempRow.push(objInstance.sumCapacity[row[0]].sum)
			objInstance.returnData.push(tempRow)
			process.nextTick(callback)
		})
	}, function(err){
		if (err)
			console.log(err)
		process.nextTick(callback)
	})
}

