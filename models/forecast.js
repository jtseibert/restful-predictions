//forecast.js
//output:
	//forecast report as a 2D array
	
module.exports = Forecast

async = require('../node_modules/async')

function Forecast(pg, data, callback) {

	this.sheetsData 		= data[0]
	this.sumSalesPipeline 	= data[1]
	this.returnData 		= ['ROLE',
								'WEEK_DATE',
								'ALLOCATED_ESTIMATED_HOURS(WEEK)',
								'SUM_AEH',
								'NAME',
								'CONTACT_ID',
								'REPORTS_TO',
								'SUM_SALES_PIPELINE_ESTIMATED_HOURS',
								'SUM_CAPACTIY_ESTIMATED_HOURS']
	this.sumCapacity
	objInstance = this

	var one = function(callback){
		pg.connect(process.env.DATABASE_URL, function(err, client, done) {
			roles_hours = {}
			if (err)
				console.log(err)
			var query = client.query('SELECT * FROM roles_hours')
			query.on("row", function (row, result) {
				//result.addrow(row)
				roles_hours[row.role] = {'reports_to': row.reports_to, 'sum': row.sum}
			})
			query.on("end", function (result) {
				process.nextTick(function(){callback(null, roles_hours)})
				//process.nextTick(callback)
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
	//console.log('SheetsData: '+JSON.stringify(this.sheetsData) + '\nSP: ' + JSON.stringify(this.sumSalesPipeline) + '\nCapacity: ' + JSON.stringify(this.sumCapacity))
	objInstance = this

	async.each(objInstance.sheetsData, function(row, callback){
		console.log('CurrentRow: '+row)
		async.series({
			one: function(callback){
				var tempRow = []
				async.eachSeries(row, function(value, callback){
					console.log('CurrentValue: '+value)
					tempRow.push(value)
					process.nextTick(callback)
				}, function(){ process.nextTick(function(){callback(null,tempRow)}) })
			},
			two: function(callback){
				var newData = []
				console.log('I want this to be a role: '+row[0])
				newData.push(JSON.stringify(objInstance.sumCapacity[row[0]].reports_to))
				newData.push(objInstance.sumSalesPipeline[row[0]][row[1]])
				newData.push(objInstance.sumCapacity[row[0]].sum)
				process.nextTick(function(){callback(null,newData)})
			}
		}, function(err, results){
			//console.log(results)
			objInstance.returnData.push(results.one.push(results.two[0], results.two[1], results.two[2]))
			process.nextTick(callback)
		})
	}, function(err){
		if (err)
			console.log(err)
		process.nextTick(callback)
	})
}

