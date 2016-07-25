//forecast.js
//output:
	//forecast report as a 2D array
	
module.exports = Forecast

async = require('../node_modules/async')

function Forecast(pg, data) {
	this.sheetsData 			= data[0]
	this.sumSalesPipeline 	= data[1]
	this.returnData 		= ['ROLE',
								'WEEK_DATE',
								'ALLOCATED_ESTIMATED_HOURS(WEEK)',
								'SUM(AEH)',
								'NAME',
								'CONTACT_ID',
								'REPORTS_TO',
								'SUM(SALES_PIPELINE_ESTIMATED_HOURS)',
								'SUM(CAPACTIY_ESTIMATED_HOURS)']

	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		var query = client.query('SELECT * FROM omit')
		query.on("row", function (row, result) {
			result.addRow(row)
		})
		query.on("end", function (result) {
			//console.log(JSON.stringify(result.rows, null, "    "))
			this.sumCapacity = result.rows
			process.nextTick(callback)
		})
	})
} 

Forecast.prototype.create = function(callback) {
	objInstance = this
	async.each(this.sheetsData, function(row, callback){
		async.series({
			one: function(callback){
				var tempRow = []
				async.eachSeries(row, function(value, callback){
					tempRow.push(value)
				}, function(){ process.nextTick(function(){callback(tempRow)}) })
			},
			two: function(callback){
				var newData = []
				newData.push(JSON.stringify(objInstance.sumCapacity[row[0]].reports_to), objInstance.sumSalesPipeline[row[0]][1], objInstance.sumCapacity[row[0]].sum)
				process.nextTick(function(){callback(newData)})
			}
		}, function(err, results){
			objInstance.returnData.push(results.one.push(results.two[0], results.two[1], results.two[2]))
		})
	}, function(err){
		if (err)
			console.log(err)
		process.nextTick(callback)
	})
}

