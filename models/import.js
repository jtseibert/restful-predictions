//import.js
//input: 
	//sheet name
//output: json object
	
module.exports = Import

function Import(sheetName) {
	this.sheetName = sheetName
} 

Import.prototype.getJsonData = function(client, callback) {
	var query = client.query('SELECT json FROM allocation_reports WHERE id = $1' [this.sheetName])
	callback(query)
}