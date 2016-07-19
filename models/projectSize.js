//projectSize.js
//input: 
	//JSON of a project size to add to project_size or remove from project_size
	
module.exports = ProjectSize

function ProjectSize(data) {
	this.data = data
} 

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
		callback()
	})
}

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
		callback()
	})
}

ProjectSize.prototype.get = function(pg, callback) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		var query = client.query('SELECT sizeId FROM project_size')
		query.on("row", function (row, result) {
			result.addRow(row)
		})
		query.on("end", function (result) {
			callback(result.rows)
		})
	})
}

ProjectSize.prototype.edit = function(pg, callback) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		var query = client.query('SELECT * FROM project_size WHERE sizeId = $1', [this.data.project])
		query.on("row", function (row, result) {
			result.addRow(row)
		})
		query.on("end", function (result) {
			console.log(JSON.stringify(result.rows, null, "    "))
			callback(result.rows)
		})
	})
}

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
		callback()
	})
}





