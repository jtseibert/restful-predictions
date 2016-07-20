//roles.js
	
module.exports = Roles

function Roles(data) {
	this.data = data
} 

Roles.prototype.get = function(pg, callback) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		var query = client.query('SELECT * FROM roles')
		query.on("row", function (row, result) {
			result.addRow(row)
		})
		query.on("end", function (result) {
			console.log(JSON.stringify(result.rows, null, "    "))
			process.nextTick(function(){callback(result.rows)})
		})
	})
}

Roles.prototype.add = function(pg, callback) {
	var role = this.data.role
	pg.connect(process.env.DATABASE_URL, function(err, client) {
		var query = client.query('INSERT INTO roles (role) values ($1) ON CONFLICT (role) DO NOTHING',
			[role])
	})
}