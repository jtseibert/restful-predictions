/**
* Capacity
* @module Capacity
* @desc The Capacity module is responsible for persisting all employees and thier roles if they are in the roles database table
*/
module.exports = Capacity

// module level variables
async = require('../node_modules/async')

/**
* Creates a Capacity object with the optional parameter of input capacity data for update the data table in the database.
* @function Capacity
* @param instance - the user's SalesForce instance
* @param accessToken - the user's SalesForce access token
* @param data - (optional) user input changes to the capacity database table
*/
function Capacity(instance, accessToken, data) {
	this.accessToken = accessToken
	this.path = 'https://' + instance + '/services/data/v35.0/analytics/reports/00Oa00000093ued'
	this.returnData = []
	if (data)
		this.returnData = data
} 

Capacity.prototype.get = function(oauth2, callback) {
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
				process.nextTick(callback)
			})
	    })
	})
}

Capacity.prototype.updateDB = function(pg, callback){
	objInstance = this
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		async.eachOf(objInstance.returnData, function(row, rowNumber, callback){
			if (rowNumber != 0) {
				client.query('INSERT INTO capacity(contact_id, name, title, available_hours) VALUES($3,$1,'
								+'(SELECT role FROM roles WHERE role=$2),$4) ON CONFLICT (contact_id) DO UPDATE SET title=(SELECT role FROM roles WHERE role=$2)',
								[row[0],row[1],row[2],40], function(){ done() })
			}
		}, function(){
			process.nextTick(callback)
		})
	})
}

