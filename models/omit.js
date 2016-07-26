/**
* Omit
* @module Omit
* @desc The omit module is responsible for adding and removing opportunities
from the omit database.
*/
module.exports = Omit

/**
* Creates an Omit object with the opportunity name(s) as member data
* @function Omit
* @param data - opportunity name from POST request
*/
function Omit(data) {
	this.data = data
} 

/**
* Inserts the opportunities in data to the omit database table
* @function add
* @param pg - pg module object
* @param callback - callback function
*/
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
		process.nextTick(callback)
	})
}

/**
* Removes the opportunities in data from the omit database table
* @function remove
* @param pg - pg module object
* @param callback - callback function
*/
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
		process.nextTick(callback)
	})
}

/**
* Returns the opportunities in the omit database table
* @function get
* @param pg - pg module object
* @param callback - callback function
*/
Omit.prototype.get = function(pg, callback) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		var query = client.query('SELECT * FROM omit')
		query.on("row", function (row, result) {
			result.addRow(row)
		})
		query.on("end", function (result) {
			console.log(JSON.stringify(result.rows, null, "    "))
			process.nextTick(function(){callback(result.rows)})
		})
	})
}







