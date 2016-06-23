//table.js
//input: 
	//csv obj
	
module.exports = Table

function Table(data) {
	this.json 		= data.json
	this.id 		= data.id
} 

Table.prototype.saveTable = function(client, callback) {

	client.query('INSERT INTO allocation_reports(id, json) values($1, $2) ON CONFLICT (id) DO UPDATE SET json = $2', [this.id, this.json])







	//client.query('WITH UPSERT AS (UPDATE allocation_reports SET (id, json) = ($1, $2) WHERE id = $1 return )', [this.id, this.json])
	// client.query("IF EXISTS (SELECT id FROM allocation_reports WHERE id=$1) THEN "
	// 				+ "UPDATE allocation_reports SET id=$1 json=$2 ELSE "
	// 				+ "INSERT INTO allocation_reports(id, json) values($1, $2)",
	// 				[this.id, this.json])

	//testing
	var query = client.query("SELECT json -> '2506' ->> 'Employees' AS shouldbe1person FROM allocation_reports");
	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		console.log(JSON.stringify(result.rows, null, "    "));
		client.end();
	});

	callback()

}