//opportunity.js
//input: 
	//JSON object, data, of opportunites and appropriate attributes for saving opportunities
	
module.exports = Opportunity

function Opportunity(data) {
	this.data = data
} 

Opportunity.prototype.add = function(client, callback) {

	for (var entry in this.data){

		this.data[entry].expected_amount = this.data[entry].expected_amount.replace('USD ', '').replace(/,/g,'')ß

		console.log(this.data)

		client.query('INSERT INTO sales_pipeline(opportunity, stage, probability, type, start_date, sizeid, expected_amount)'
						+ 'values($1, $2, $3, $4, $5,'
						+ '(SELECT CASE WHEN EXISTS (SELECT sizeid FROM project_size WHERE sizeid=$6)'
						+ 'THEN (SELECT sizeid FROM project_size WHERE sizeid=$6)'
						+ 'ELSE (SELECT sizeid FROM (SELECT * FROM project_size ORDER BY pricehigh ASC) AS foo WHERE pricehigh>$7 limit 1)'
						+ 'END), $7)'
						+ 'ON CONFLICT (opportunity)'
						+ 'DO UPDATE SET stage=$2,probability=$3,type=$4,start_date=$5,'
						+ 'sizeid=(SELECT CASE WHEN EXISTS (SELECT sizeid FROM project_size WHERE sizeid=$6)'
						+ 'THEN (SELECT sizeid FROM project_size WHERE sizeid=$6)'
						+ 'ELSE (SELECT sizeid FROM (SELECT * FROM project_size ORDER BY pricehigh ASC) AS foo WHERE pricehigh>$7 limit 1)'
						+ 'END), expected_amount=$7',
						[this.data[entry].opportunity,
							this.data[entry].stage,
							this.data[entry].probability,
							this.data[entry].type,
							this.data[entry].start_date,
							this.data[entry].sizeid,
							this.data[entry].expected_amount
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

Opportunity.prototype.get = function(client, callback) {
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