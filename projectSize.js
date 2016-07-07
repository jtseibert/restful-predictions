//projectSize.js
//input: 
	//JSON of a project size to add to project_size or remove from project_size
	
module.exports = ProjectSize

function ProjectSize(data) {
	this.data = data
} 

ProjectSize.prototype.add = function(client, callback) {
	console.log(this.data)

	for (var entry in this.data){
		client.query('INSERT INTO project_size(sizeId,pricehigh,roles_allocations,numweeks) values($1,$2,$3,$4)',
			[entry,this.data[entry].pricehigh,this.data[entry].roles_allocations,this.data[entry].numweeks])
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

ProjectSize.prototype.update = function(client, callback) {


}

ProjectSize.prototype.getProjectSize = function(client, callback) {


}

ProjectSize.prototype.remove = function(client, callback) {


}





