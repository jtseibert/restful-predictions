//omit.js
//input: 
	//array of opportunities to add to omit or remove from omit
	
module.exports = Omit

function Omit(data) {
	this.data = data
} 

Omit.prototype.updateOmit = function(client, callback) {

	for (var entry in this.data){
		client.query('INSERT INTO omit(opportunity) values($1)', [this.data[entry]])
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

Omit.prototype.undoOmit = function(client, callback) {

	for (var entry in this.data){
		client.query('DELETE FROM omit WHERE opportunity = $1', [this.data[entry]])
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

Omit.prototype.getOpportunities = function(client, callback) {
	var query = client.query('SELECT * FROM omit')
	query.on("row", function (row, result) {
		result.addRow(row)
	})
	query.on("end", function (result) {
		console.log(JSON.stringify(result.rows, null, "    "))
		client.end()
		callback(result)
	})
}







