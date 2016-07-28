/**
* Project Size
* @module ProjectSize
* @desc The projectSize module is responsible for persisting, modifying, and deleting from the projectSize PostgreSQL database table.
The projectSize table consists of SizeId, Price High, Roles and Allocations, and the Number of Weeks.
*/
module.exports = ProjectSize

/**
* Creates a ProjectSize object with the project size information as member data
* @function ProjectSize
* @param data - sizeid, pricehigh, roles_allocations, and numweeks all in one JSON
*/
function ProjectSize(data, callback) {
	this.data = data
	callback()
} 

/**
* Inserts the projectSize in data to the projectSize database table
* @function add
* @param pg - pg module object
* @param callback - callback function
*/
ProjectSize.prototype.add = function(pg, callback) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		for (var entry in this.data){
			client.query('INSERT INTO project_size(sizeId,pricehigh,roles_allocations,numweeks) values($1,$2,$3,$4)',
				[this.data[entry].sizeid,this.data[entry].pricehigh,this.data[entry].roles_allocations,this.data[entry].numweeks])
		}
		//testing
		var query = client.query("SELECT * from project_size")
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
* Updates the projectSize in data to the projectSize database table
* @function update
* @param pg - pg module object
* @param callback - callback function
*/
ProjectSize.prototype.update = function(pg, callback) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		for (var entry in this.data){
			client.query('UPDATE project_size SET ' 								+
	  						'pricehigh = COALESCE($2, pricehigh),'					+
	  						'roles_allocations = COALESCE($3, roles_allocations),' 	+
	  						'numweeks = COALESCE($4, numweeks)' 					+
							'WHERE sizeId = $1',
				[this.data[entry].sizeid,this.data[entry].pricehigh,this.data[entry].roles_allocations,this.data[entry].numweeks])
		}
		//testing
		var query = client.query("SELECT * from project_size")
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
* Returns the projectSizes in the projectSize database table
* @function get
* @param pg - pg module object
* @param callback - callback function
*/
ProjectSize.prototype.get = function(pg, callback) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		var query = client.query('SELECT sizeId FROM project_size')
		query.on("row", function (row, result) {
			result.addRow(row)
		})
		query.on("end", function (result) {
			process.nextTick(function(){callback(result.rows)})
		})
	})
}

/**
* Returns the projectSize in the projectSize database table equal to the input projectSize
* @function edit
* @param pg - pg module object
* @param callback - callback function
*/
ProjectSize.prototype.edit = function(pg, callback) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		var query = client.query('SELECT * FROM project_size WHERE sizeId = $1', [this.data.project])
		query.on("row", function (row, result) {
			result.addRow(row)
		})
		query.on("end", function (result) {
			console.log(JSON.stringify(result.rows, null, "    "))
			process.nextTick(function(){callback(result.rows)})
		})
	})
}

/**
* Removes the projectSize in data from the projectSize database table
* @function remove
* @param pg - pg module object
* @param callback - callback function
*/
ProjectSize.prototype.remove = function(pg, callback) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		for (var entry in this.data){
			console.log('should be deleting: ' + entry)
			client.query('DELETE FROM project_size WHERE sizeId = $1', [entry])
		}
		//testing
		var query = client.query("SELECT * from project_size")
		query.on("row", function (row, result) {
			result.addRow(row)
		})
		query.on("end", function (result) {
			console.log(JSON.stringify(result.rows, null, "    "))
		})
		process.nextTick(callback)
	})
}





