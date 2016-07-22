//capacity.js
//output:
	//Capacity report as a 2D array
	
module.exports = Capacity

function Capacity(instance, accessToken) {
	this.accessToken = accessToken
	this.path = 'https://' + instance + '/services/data/v35.0/analytics/reports/00Oa00000093ued'
	this.returnData = []
} 

Capacity.prototype.get = function(oauth2, async, cache, pg, callback) {
	var returnData = [],
		objInstance = this,
		parameters = {
			access_token: objInstance.accessToken
		}

	oauth2.api('GET', objInstance.path, parameters, function (err, data) {
	    if (err)
	        console.log('GET Error: ', JSON.stringify(err))

	    var rows 		= data.factMap['T!T'].rows,
	    	columnInfo	= data.reportExtendedMetadata.detailColumnInfo,
	    	headers 	= [],
	    	tempRow

	    async.eachSeries(columnInfo, function(header, callback){
	    	headers.push(header.label)
	    	process.nextTick(callback)
	    }, function(err){
	    	if (err)
	    		console.log(err)
			objInstance.returnData.push(headers)
			async.each(rows, function(row, callback){
				var tempRow = []
				async.eachSeries(row.dataCells, function(dataCell, callback){
					tempRow.push(dataCell.label)
					process.nextTick(callback)
				}, function(){
					objInstance.returnData.push(tempRow)
					process.nextTick(callback)
				})
			}, function(){
				cache.set("capacity", objInstance.returnData, function(err, success) {
					if(!err && success) {
						console.log('capacity data cached')
					}
				}) 
				async.each(objInstance.returnData, function(row, callback){
					pg.connect(process.env.DATABASE_URL, function(err, client, done) {
						client.query('INSERT INTO capacity(contact_id, name, title, available_hours) VALUES($1,$2,'
										+'(SELECT role FROM roles WHERE role=$3),$4) ON CONFLICT (contact_id) DO NOTHING',
										[row[0],row[1],row[3],40])
					})
				}, function(){
					process.nextTick(callback)
				})
			})
	    })
	})
}



