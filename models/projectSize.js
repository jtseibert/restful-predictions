//projectSize.js
//input: 
	//JSON of a project size to add to project_sizes or remove from project_sizes
	
module.exports = projectSize

function ProjectSize(data) {
	this.data = data
} 

ProjectSize.prototype.add = function(client, callback) {

	console.log(this.data)

	for (var entry in this.data){
		client.query('INSERT INTO omit(opportunity) values($1)', [entry])
	}

	//testing
	var query = client.query("SELECT * from omit")
	query.on("row", function (row, result) {
		result.addRow(row)
	})
	query.on("end", function (result) {
		console.log(JSON.stringify(result.rows, null, "    "))
		client.end()
	})
	callback()
}

Omit.prototype.remove = function(client, callback) {

	for (var entry in this.data){
		console.log('should be deleting: ' + entry)
		client.query('DELETE FROM omit WHERE opportunity = $1', [entry])
	}

	//testing
	var query = client.query("SELECT * from omit")
	query.on("row", function (row, result) {
		result.addRow(row)
	})
	query.on("end", function (result) {
		console.log(JSON.stringify(result.rows, null, "    "))
		client.end()
	})
	callback()
}

Omit.prototype.getOmit = function(client, callback) {
	var query = client.query('SELECT * FROM omit')
	query.on("row", function (row, result) {
		result.addRow(row)
	})
	query.on("end", function (result) {
		console.log(JSON.stringify(result.rows, null, "    "))
		client.end()
		callback(result.rows)
	})
}







