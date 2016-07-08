//roles.js
	
module.exports = Roles

function Roles(data) {
	this.data = data
} 

Roles.prototype.get = function(client, callback) {
	var query = client.query('SELECT * FROM roles')
	query.on("row", function (row, result) {
		result.addRow(row)
	})
	query.on("end", function (result) {
		console.log(JSON.stringify(result.rows, null, "    "))
		client.end()
		callback(result.rows)
	})
}

