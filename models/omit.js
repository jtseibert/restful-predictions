//omit.js
//input: 
	//JSON of opportunities to add to omit or remove from omit
	
module.exports = Omit

function Omit(data) {
	this.data = data
} 

Omit.prototype.add = function(pg, callback) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
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
		})
		callback()
	})
}

Omit.prototype.remove = function(pg, callback) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
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
		})
		callback()
	})
}

Omit.prototype.get = function(pg, callback) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		var query = client.query('SELECT * FROM omit')
		query.on("row", function (row, result) {
			result.addRow(row)
		})
		query.on("end", function (result) {
			console.log(JSON.stringify(result.rows, null, "    "))
			callback(result.rows)
		})
	})
}







