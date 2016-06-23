//import.js
//input: 
	//sheet name
//output: json object
	
module.exports = Import

function Import(sheetName) {
	this.sheetName = sheetName
} 

Import.prototype.getJsonData = function(client, callback) {

	var results = []

	var query = client.query('SELECT json FROM allocation_reports WHERE id = $1' [this.sheetName])

        // Stream results back one row at a time
        query.on('row', function(row) {
            results.push(row)
        })

        // After all data is returned, close connection and return results
        query.on('end', function() {
            done()
            callback(results)
        })
}