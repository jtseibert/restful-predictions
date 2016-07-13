//opportunity.js
//input: 
	//JSON object, data, of opportunites and appropriate attributes for saving opportunities
	
module.exports = Opportunity

function Opportunity(data) {
	this.data = data
} 

Opportunity.prototype.add = function(client, callback) {

	for (var entry in this.data){

		console.log(this.data)

		client.query('INSERT INTO sales_pipeline(opportunity, stage, amount, expected_amount, close_date, start_date, probability, age, created_date, account_name, project_size) '
						+ 'values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '
						+ '(SELECT CASE WHEN EXISTS (SELECT sizeid FROM project_size WHERE sizeid=$11) '
						+ 'THEN (SELECT sizeid FROM project_size WHERE sizeid=$11) '
						+ 'ELSE (SELECT sizeid FROM (SELECT * FROM project_size ORDER BY pricehigh ASC) AS foo WHERE pricehigh>$4 limit 1) '
						+ 'END))'
						+ 'ON CONFLICT (opportunity) '
						+ 'DO UPDATE SET stage=COALESCE($2,stage), amount=COALESCE($3,amount), expected_amount=COALESCE($4,expected_amount), '
						+ 'close_date=COALESCE($5,close_date), start_date=COALESCE($6,start_date), probability=COALESCE($7,probability), age=COALESCE($8,age), '
						+ 'created_date=COALESCE($9,created_date), account_name=COALESCE($10,account_name), '
						+ 'project_size=COALESCE((SELECT CASE WHEN EXISTS (SELECT sizeid FROM project_size WHERE sizeid=$11) '
						+ 'THEN (SELECT sizeid FROM project_size WHERE sizeid=$11) '
						+ 'ELSE (SELECT sizeid FROM (SELECT * FROM project_size ORDER BY pricehigh ASC) AS foo WHERE pricehigh>$4 limit 1) '
						+ 'END),project_size)',
						[this.data[entry].opportunity,
							this.data[entry].stage,
							this.data[entry].amount,
							this.data[entry].expected_amount,
							this.data[entry].close_date,
							this.data[entry].start_date,
							this.data[entry].probability,
							this.data[entry].age,
							this.data[entry].created_date,
							this.data[entry].account_name,
							this.data[entry].project_size
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