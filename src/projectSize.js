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
	process.nextTick(callback)
} 

/**
* Updates the projectSize in data to the projectSize database table
* @function update
* @param pg - pg module object
* @param callback - callback function
*/
ProjectSize.prototype.update = function(pg, callback) {
	objInstance = this
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		for (var entry in objInstance.data){
			client.query('UPDATE project_size SET ' 								+
	  						'pricehigh = COALESCE($2, pricehigh),'					+
	  						'roles_allocations = COALESCE($3, roles_allocations),' 	+
	  						'numweeks = COALESCE($4, numweeks)' 					+
							'WHERE sizeId = $1',
				[objInstance.data[entry].sizeid,objInstance.data[entry].pricehigh,objInstance.data[entry].roles_allocations,objInstance.data[entry].numweeks],
				function(){ done() })
		}
		//testing
		var query = client.query("SELECT * from project_size")
		query.on("row", function (row, result) {
			result.addRow(row)
		})
		query.on("end", function (result) {
			done()
			console.log(JSON.stringify(result.rows, null, "    "))
		})
		process.nextTick(callback)
	})
}

/**
* Returns the projectSize in the projectSize database table equal to the input projectSize
* @function edit
* @param pg - pg module object
* @param callback - callback function
*/
ProjectSize.prototype.edit = function(pg, callback) {
	objInstance = this
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		console.log(objInstance.data)
		var query = client.query('SELECT * FROM project_size WHERE sizeId = $1', [objInstance.data.project], function(){ done() })
		query.on("row", function (row, result) {
			result.addRow(row)
		})
		query.on("end", function (result) {
			done()
			console.log(JSON.stringify(result.rows, null, "    "))
			process.nextTick(function(){callback(result.rows)})
		})
	})
}





