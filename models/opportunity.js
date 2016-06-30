//opportunity.js
//input: 
	//JSON object, data, of opportunites and appropriate attributes for saving opportunities
	
module.exports = Opportunity

function Opportunity(data) {
	this.data = data
} 

Opportunity.prototype.add = function(client, callback) {

	console.log(this.data)

	for (var entry in this.data){
		client.query('INSERT INTO sales_pipeline(opportunity, stage, probability, type)'
						+ ' values($1, $2, $3, $4) ON CONFLICT (opportunity)'
						+ 'DO UPDATE SET stage = $2, probability = $3, type = $4', 
						[this.data[entry].opportunity,
							this.data[entry].stage,
							this.data[entry].probability,
							this.data[entry].type
						]
					)
	}

	//testing
	var query = client.query("SELECT * from sales_pipeline")
	query.on("row", function (row, result) {
		result.addRow(row)
	})
	query.on("end", function (result) {
		console.log(JSON.stringify(result.rows, null, "    "))
		client.end()
	})
	callback()
}

Opportunity.prototype.remove = function(client, callback) {

	console.log(this.data)

	for (var entry in this.data){
		client.query('DELETE FROM sales_pipeline WHERE opportunity = $1',[entry])
	}

	//testing
	var query = client.query("SELECT * from sales_pipeline")
	query.on("row", function (row, result) {
		result.addRow(row)
	})
	query.on("end", function (result) {
		console.log(JSON.stringify(result.rows, null, "    "))
		client.end()
	})
	callback()
}

Opportunity.prototype.getOpportunity = function(client, callback) {
	var query = client.query('SELECT * FROM sales_pipeline')
	query.on("row", function (row, result) {
		result.addRow(row)
	})
	query.on("end", function (result) {
		console.log(JSON.stringify(result.rows, null, "    "))
		client.end()
		callback(result.rows)
	})
}