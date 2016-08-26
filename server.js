//*************************************
/** 
* @file server.js
* @desc Initiates Heroku app, defines express middleware routes.
*/
//*************************************
// Define dependencies
var	allocation 		= require('./src/allocation'),
	bodyParser 		= require('body-parser'),
	capacity        = require('./src/capacity'),
	express			= require('express'),
	Forecast 		= require('./src/forecast'),
	helpers			= require('./src/helpers'),
	parser          = require('./src/parser'),
	pipeline 		= require('./src/pipeline'),
	xlsxHandler   	= require('./src/xlsxHandler')

var app = express()
var router = express.Router()
var port = process.env.PORT || 5000
var name = 'app'

app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({limit: '1gb', extended: true }))
app.use('/api', router)

// Define routes:
// General query route for Google Sheets to pull from Heroku postgres DB
router.route('/query')
	.post(function(req, res) {
		try {
			helpers.query(req.body.query, req.body.values, function returnQueryResults(error, results) {
				if (error) { throw error }
				res.json(results)
			})
		} catch(error) {
			helpers.errorLog(error)
			res.json(error)
		}
	})

// Get current allocation data from salesforce and export to Google Sheets
router.route('/:instance/DATA_Allocation/:accessToken')
	.get(function(req, res) {
		try{
			var accessToken = req.params.accessToken,
				instance    = req.params.instance
			allocation.queryAllocation(accessToken, instance, function handleAllocationData(error, allocationData) {
				if (error) { throw error }
				res.json(allocationData)
			})
		} catch(error) {
			helpers.errorLog(error)
			res.json(error)
		}
		
	})
	   
// Get current sales pipeline data from salesforce, update pipeline table, and export to Google Sheets
router.route('/:instance/DATA_Sales_Pipeline/:accessToken')
	.get(function(req, res) {
		try {
			var accessToken = req.params.accessToken,
				instance    = req.params.instance
			pipeline.syncPipelineWithSalesforce(accessToken, instance, function callback(error) {
				if (error) { throw error }
				console.log("DATABASE UPDATE DONE")
				pipeline.exportToSheets(function callback(error, pipelineData) {
					if (error) { throw error }
					console.log("EXPORT DONE")
					res.json(pipelineData)
				})
			})
		} catch(error) {
			helpers.errorLog(error)
			res.json(error)
		}
	})

// Get current capacity data from salesforce, update roles_capacities database, and export to Google Sheets
router.route('/:instance/DATA_Capacity/:accessToken')
	.get(function(req, res) {
		try {
			var accessToken = req.params.accessToken,
				instance    = req.params.instance

			async.waterfall([
				async.apply(capacity.queryCapacity,accessToken,instance),
				capacity.clearCapacityTable,
				capacity.insertCapacity,
				capacity.exportCapacity
			], function(error, results) {
				if (error) { throw error }
				res.json(results)
			})
		} catch(error){
			helpers.errorLog(error)
			res.json(error)
		}
	})

// Create forecast data from allocation/pipeline data (@param req.body) and roles_capacities table,
// and export to Google Sheets
router.route('/DATA_Forecast')
	.post(function(req, res) {
		try {
			forecast = new Forecast(req.body, function(error) {
				if (error) { throw error }
				forecast.create(function(error) {
					if (error) { throw error }
					res.json(forecast.returnData)
					delete forecast
				})
			})
		} catch(error) {
			helpers.errorLog(error)
			res.json(error)
		}
	})

// Main route for Google Sheet buttons
// Add, update opportunities in sales_pipeline table
// Update opportunities in table when project sizes are changed or added
router.route('/updatePipelineTable')
	.post(function(req, res) {
		try {
			switch(req.body.type) {
				case "add":
					async.series({
						one: async.apply(pipeline.insertWithDefaultSize, req.body.opportunityData),
						two: async.apply(helpers.setOpportunityStatus,[req.body.opportunityName],req.body.status),
						three: pipeline.exportToSheets
					}, function(error, results) {
						if (error) { throw error }
						res.json(results.three)
					})
					break
				case "update_generic":
					async.series({
						one: async.apply(helpers.query, req.body.query, req.body.values),
						two: async.apply(pipeline.syncSingleOpportunity, req.body.opportunityName),
						three: pipeline.exportToSheets
					}, function(error, results){
						if (error) { throw error }
							res.json(results.three)
					})
					break
				case "update_pipeline":
					async.series({
						one: async.apply(helpers.query, req.body.query, req.body.values),
						two: async.apply(helpers.query, "SELECT attachment FROM sales_pipeline where opportunity = $1", [req.body.opportunityName])
					},function(error, results){
						if (error) { throw error }
						if (results.two[0]) {
							pipeline.exportToSheets(function(error, pipelineData) {
								if (error) { throw error }
								res.json(pipelineData)
							})
						} else {
							async.series({
								one: async.apply(pipeline.syncSingleOpportunity, req.body.opportunityName),
								two: pipeline.exportToSheets
							}, function(error, results){
								if (error) { throw error }
								res.json(results.two)
							})
						}
					})
					break
				case "remove":
					async.series({
						one: async.apply(helpers.deleteOpportunities, req.body.opportunities),
						two: pipeline.exportToSheets
					}, function(error, results){
						if (error) { throw error }
						res.json(results.two)
					})
					break
				case "omit":
					async.series({
						one: async.apply(helpers.setOpportunityStatus, req.body.opportunities, req.body.status),
						two: pipeline.exportToSheets
					}, function(error, results){
						if (error) { throw error }
						res.json(results.two)
					})
					break
				case "project_size":
					async.series({
						one: async.apply(helpers.query, req.body.query, req.body.values),
						two: pipeline.syncWithDefaultSizes,
						three: pipeline.exportToSheets
					}, function(error, results){
						if (error) { throw error }
						res.json(results.three)
					})
					break
				case "assign_role":
					async.series({
						one: async.apply(capacity.assignRole, req.body.name, req.body.role),
						two: capacity.exportCapacity
					}, function(error, results){
						if (error) { throw error }
						res.json(results.two)
					})
					break
				case "debug":
					pipeline.exportToSheets(function callback(error, pipelineData) {
						if (error) { throw error }
						res.json(pipelineData)
					})
					break
				case "protected":
					helpers.setOpportunityStatus(req.body.opportunities, req.body.status, function callback(error) {
						if (error) { throw error }
						res.json({message: "Success!"})
					})
					break
				default:
					res.json({message: "Default case, No Update."})
			}
		} catch(error) {
			helpers.errorLog(error)
			res.json(error)
		}
	})

// Update a specific opportunity in the sales_pipeline table from
// an xlsx sheet attached to an opportunity object in salesforce
router.route('/trigger')
	.post(function(req, res) {
		try {
			parser.parseExcelSheet(req.body, function callback(error, opportunityData) {
				if (error) { throw error }
				if(opportunityData != undefined) {
					console.log(opportunityData)
					xlsxHandler.updateDatabaseFromXlsx(opportunityData, function callback(error) {
						if (error) { throw error }
						res.json({message: 'Trigger Done.'})
					})
				} else { res.json({message: 'Failed to update'}) }	
			})
		} catch(error) {
			helpers.errorLog(error)
			res.json(error)
		}
	})

// Start server
app.listen(port)
console.log('Heroku station is operational on port ' + port)
