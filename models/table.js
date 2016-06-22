//table.js
//input: 
	//csv obj
	
module.exports = Table

function Table(csv) {
	this.data = csv
	this.table
} 

Table.prototype.makeTable = function(callback) {
	
	// var tableName = '',
	// 	i = 0

	// while (this.data[i] != ','){
	// 	tableName += this.data[i]
	// }

	console.log(JSON.parse(this.data)

	callback()

	//database





// do this tomorrow








	// var pg = require('pg');

	// pg.defaults.ssl = true;
	// pg.connect(process.env.DATABASE_URL, function(err, client) {
	// 	if (err) throw err;
	// 	console.log('Connected to postgres! Getting schemas...');

	// 	client.query('SELECT table_schema,table_name FROM information_schema.tables;')

	// 	client.query("CREATE TABLE IF NOT EXISTS emps(firstname varchar(64), lastname varchar(64))");
	// 	// client.query("INSERT INTO emps(firstname, lastname) values($1, $2)", ['Ronald', 'McDonald']);
	// 	// client.query("INSERT INTO emps(firstname, lastname) values($1, $2)", ['Mayor', 'McCheese']);

	// 	var query = client.query("SELECT firstname, lastname FROM emps ORDER BY lastname, firstname");
	// 	query.on("row", function (row, result) {
	// 		result.addRow(row);
	// 	});
	// 	query.on("end", function (result) {
	// 		console.log(JSON.stringify(result.rows, null, "    "));
	// 		client.end();
	// 	});

	// callback()
	// }
}