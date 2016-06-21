//table.js
//input: 
	//csv obj
	
module.exports = Table

function Table(csv) {
	this.data = csv
	this.table
} 

Table.prototype.makeTable = function() {
	//do stuff with table
	console.log(this.data)

}