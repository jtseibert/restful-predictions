//forecast.js
//output:
	//forecast report as a 2D array
	
module.exports = Forecast

async = require('../node_modules/async')

function Forecast(data) {
	this.sheetsData 		= data[0][1]
	this.sumSalesPipeline 	= data[0][0]
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
} 

Forecast.prototype.create = function(pg, callback) {
	//console.log('SheetsData: '+JSON.stringify(this.sheetsData) + '\nSP: ' + JSON.stringify(this.sumSalesPipeline) + '\nCapacity: ' + JSON.stringify(this.sumCapacity))
	objInstance = this

	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		var query = client.query('SELECT * FROM omit')
		query.on("row", function (row, result) {
			console.log(row)
			result.addRow(row)
		})
		query.on("end", function (result) {
			//console.log(JSON.stringify(result.rows, null, "    "))
			objInstance.sumCapacity = result.rows
			process.nextTick(callback)
		})
	})

	async.each(this.sheetsData, function(row, callback){
		async.series({
			one: function(callback){
				var tempRow = []
				async.eachSeries(row, function(value, callback){
					tempRow.push(value)
					process.nextTick(callback)
				}, function(){ process.nextTick(function(){callback(null,tempRow)}) })
			},
			two: function(callback){
				var newData = []
				newData.push(JSON.stringify(objInstance.sumCapacity[row[0]].reports_to), objInstance.sumSalesPipeline[row[0]][1], objInstance.sumCapacity[row[0]].sum)
				process.nextTick(function(){callback(null,newData)})
			}
		}, function(err, results){
			objInstance.returnData.push(results.one.push(results.two[0], results.two[1], results.two[2]))
			process.nextTick(callback)
		})
	}, function(err){
		if (err)
			console.log(err)
		process.nextTick(callback)
	})
}

