//capacity.js
//output:
	//Capacity report as a 2D array
	
module.exports = Capacity

function Capacity(instance, accessToken) {
	this.accessToken = accessToken
	this.path = 'https://' + instance + '/services/data/v35.0/analytics/reports/00Oa00000093ued'
	this.returnData = [[]]
} 

Capacity.prototype.get = function(oauth2, async, cache, callback) {
	console.log('entered .get')
	var objInstance = this
	var parameters = {
		access_token: objInstance.accessToken
	}

	oauth2.api('GET', objInstance.path, parameters, function (err, data) {
	    if (err)
	        console.log('GET Error: ', JSON.stringify(err))

	    var rows 		= data.factMap['T!T'].rows,
	    	columnInfo	= data.reportExtendedMetadata.detailColumnInfo,
	    	headers 	= []

	    async.eachSeries(columnInfo, function(header, callback){
	    	headers.push(header.label)
	    	process.nextTick(callback)
	    }, function(err){
	    	if(err) {
				console.log(err)
			} else {
				objInstance.returnData.push(headers)
				async.each(rows, function(row){
					var tempRow = []
					async.eachSeries(row, function(dataCell, callback){
						tempRow.push(dataCell.label)
						process.nextTick(callback)
					}, function(){
						objInstance.returnData.push(tempRow)
					})
				})
			}
	    })
	    process.nextTick(callback)
	})
}



