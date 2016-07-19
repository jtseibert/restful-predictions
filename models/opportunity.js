//opportunity.js
//input: 
	//JSON object, data, of opportunites and appropriate attributes for saving opportunities
	
module.exports = Opportunity

function Opportunity(data) {
	this.data = data
} 

Opportunity.prototype.add = function(pg, callback) {
	var data = this.data
	async.each(data, function(opportunity, callback){
		pg.connect(process.env.DATABASE_URL, function(err, client, done) {
			console.log(data)
			client.query('INSERT INTO sales_pipeline(opportunity, stage, amount, expected_amount, close_date, start_date, probability, age, created_date, account_name, project_size) '
							+ 'values($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, '
							+ '(SELECT CASE WHEN EXISTS (SELECT sizeid FROM project_size WHERE sizeid=$11) '
							+ 'THEN (SELECT sizeid FROM project_size WHERE sizeid=$11) '
							+ 'ELSE (SELECT sizeid FROM (SELECT * FROM project_size ORDER BY pricehigh ASC) AS foo WHERE pricehigh>$4 limit 1) '
							+ 'END))'
							+ 'ON CONFLICT (opportunity) '
							+ 'DO UPDATE SET stage=COALESCE($2,sales_pipeline.stage), amount=COALESCE($3,sales_pipeline.amount), expected_amount=COALESCE($4,sales_pipeline.expected_amount), '
							+ 'close_date=COALESCE($5,sales_pipeline.close_date), start_date=COALESCE($6,sales_pipeline.start_date), probability=COALESCE($7,sales_pipeline.probability), age=COALESCE($8,sales_pipeline.age), '
							+ 'created_date=COALESCE($9,sales_pipeline.created_date), account_name=COALESCE($10,sales_pipeline.account_name), '
							+ 'project_size=COALESCE((SELECT CASE WHEN EXISTS (SELECT sizeid FROM project_size WHERE sizeid=$11) '
							+ 'THEN (SELECT sizeid FROM project_size WHERE sizeid=$11) '
							+ 'ELSE (SELECT sizeid FROM (SELECT * FROM project_size ORDER BY pricehigh ASC) AS foo WHERE pricehigh>$4 limit 1) '
							+ 'END),sales_pipeline.project_size)',
							[opportunity.opportunity,
								opportunity.stage,
								opportunity.amount,
								opportunity.expected_amount,
								opportunity.close_date,
								opportunity.start_date,
								opportunity.probability,
								opportunity.age,
								opportunity.created_date,
								opportunity.account_name,
								opportunity.project_size
							]
						)
			process.nextTick(callback)
		})
	}, function(){
		//testing
		pg.connect(process.env.DATABASE_URL, function(err, client, done) {
			var query = client.query("SELECT * from sales_pipeline")
			query.on("row", function (row, result) {
				result.addRow(row)
			})
			query.on("end", function (result) {
				console.log(JSON.stringify(result.rows, null, "    "))
			})
		})
	})
	process.nextTick(callback)
}

Opportunity.prototype.remove = function(pg, callback) {
	var data = this.data
	async.each(data, function(opportunity, callback){
		pg.connect(process.env.DATABASE_URL, function(err, client, done) {
			console.log(this.data)
			client.query('DELETE FROM sales_pipeline WHERE opportunity = $1',[entry])
			process.nextTick(callback)
		})
	}, function(){
		//testing
		pg.connect(process.env.DATABASE_URL, function(err, client, done) {
			var query = client.query("SELECT * from sales_pipeline")
			query.on("row", function (row, result) {
				result.addRow(row)
			})
			query.on("end", function (result) {
				console.log(JSON.stringify(result.rows, null, "    "))
			})
		})
	})
	process.nextTick(callback)
}

Opportunity.prototype.get = function(pg, callback) {
	pg.connect(process.env.DATABASE_URL, function(err, client, done) {
		var query = client.query('SELECT * FROM sales_pipeline')
		query.on("row", function (row, result) {
			result.addRow(row)
		})
		query.on("end", function (result) {
			console.log(JSON.stringify(result.rows, null, "    "))
			process.nextTick(function(){callback(result.rows)})
		})
	})
}