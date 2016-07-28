/**
* Roles
* @module Roles
* @desc The Roles module is responsible for getting and adding Roles from and to the Roles database table
*/
module.exports = Roles

/**
* Creates a Roles object with the role name(s) as member data
* @function Roles
* @param data - role name from POST request
*/
function Roles(data) {
	this.data = data
} 

/**
* Returns the roles in the roles database table
* @function get
* @param pg - pg module object
* @param callback - callback function
*/
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
