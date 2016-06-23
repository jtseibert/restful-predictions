//table.js
//input: 
	//csv obj
	
module.exports = Table

function Table(data) {
	this.json 		= data.json
	this.id 		= data.id
} 

Table.prototype.saveTable = function(client, callback) {

	//console.log(this.id)
	//console.log(this.json[2506])

	client.query('INSERT INTO allocation_reports(id, json) values($1, $2)', [this.id, this.json])

	callback()

}