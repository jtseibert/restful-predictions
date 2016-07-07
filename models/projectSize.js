//projectSize.js
//input: 
	//JSON of a project size to add to project_size or remove from project_size
	
module.exports = ProjectSize

function ProjectSize(data) {
	this.data = data
} 

ProjectSize.prototype.add = function(client, callback) {
	for (var entry in this.data){
		client.query('INSERT INTO project_size(sizeId,pricehigh,roles_allocations,numweeks) values($1,$2,$3,$4)',
			[entry,this.data[entry].pricehigh,this.data[entry].roles_allocations,this.data[entry].numweeks])
	}

	//testing
	var query = client.query("SELECT * from project_size")
	query.on("row", function (row, result) {
		result.addRow(row)
	})
	query.on("end", function (result) {
		console.log(JSON.stringify(result.rows, null, "    "))
		client.end()
	})
	callback()
}

ProjectSize.prototype.update = function(client, callback) {
	for (var entry in this.data){
		client.query('UPDATE project_size SET' 									+
  						'pricehigh = COALESCE($2, pricehigh),'					+
  						'roles_allocations = COALESCE($3, roles_allocations),' 	+
  						'numweeks = COALESCE($4, numweeks)' 					+
						'WHERE id = $1;',
			[entry,this.data[entry].pricehigh,this.data[entry].roles_allocations,this.data[entry].numweeks])
	}

	//testing
	var query = client.query("SELECT * from project_size")
	query.on("row", function (row, result) {
		result.addRow(row)
	})
	query.on("end", function (result) {
		console.log(JSON.stringify(result.rows, null, "    "))
		client.end()
	})
	callback()
}

ProjectSize.prototype.get = function(client, callback) {
	var query = client.query('SELECT sizeId FROM project_size')
	query.on("row", function (row, result) {
		console.log(row)
		result.addRow(row)
	})
	query.on("end", function (result) {
		console.log(JSON.stringify(result.rows, null, "    "))
		client.end()
		callback(result.rows)
	})
}

ProjectSize.prototype.remove = function(client, callback) {
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
		client.end()
	})
	callback()

}





