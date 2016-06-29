//table.js
//input: 
	//csv obj
	
module.exports = UpdateDB

function UpdateDB(data) {
	this.data = data
} 

UpdateDB.prototype.updateDB = function(client, callback) {

	console.log(this.data)

	for (var entry in this.data){
		client.query('INSERT INTO opportunity_pipeline(opportunity, stage, probability) values($1, $2, $3) ON CONFLICT (opportunity) DO UPDATE SET stage = $2, probability = $3', 
						[this.data[entry].opportunity, this.data[entry].stage, this.data[entry].probability])
	}

	//testing
	var query = client.query("SELECT * from opportunity_pipeline")
	query.on("row", function (row, result) {
		result.addRow(row)
	})
	query.on("end", function (result) {
		console.log(JSON.stringify(result.rows, null, "    "))
		client.end()
	})
	callback()
}