//table.js
//input: 
	//csv obj
	
module.exports = UpdateDB

function UpdateDB(data) {
	this.stage = data.stage
	this.opportunity = data.opportunity
	this.probability = data.probability
} 

UpdateDB.prototype.updateDB = function(client, callback) {

	client.query('INSERT INTO opportunity_pipeline(opportunity, stage, probability) values($1, $2, $3) ON CONFLICT (opportunity) DO UPDATE SET probability = $2, stage = $3', 
					[this.opportunitiy, this.stage, this.probability])

	//testing
	var query = client.query("SELECT * from opportunity_pipeline");
	query.on("row", function (row, result) {
		result.addRow(row);
	});
	query.on("end", function (result) {
		console.log(JSON.stringify(result.rows, null, "    "));
		client.end();
	});

	callback()
}