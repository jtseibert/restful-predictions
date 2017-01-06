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
		helpers.query(req.body.query, req.body.values, function(error, results) {
			if (error) {
				helpers.errorLog(error)
				res.json(error)
			} else {
				res.json(results)
			}
		})
	})

// Get current allocation data from salesforce and export to Google Sheets
router.route('/:instance/DATA_Allocation/:accessToken')
	.get(function(req, res) {
		var accessToken = req.params.accessToken,
			instance    = req.params.instance
		allocation.queryAllocation(accessToken, instance, function(error, allocationData) {
			if (error) {
				helpers.errorLog(error)
				res.json(error)
			} else {
				res.json(allocationData)
			}
		})
	})

// Get current sales pipeline data from salesforce, update pipeline table, and export to Google Sheets
router.route('/:instance/DATA_Sales_Pipeline/:accessToken')
	.get(function(req, res) {
		async.series({
			one: async.apply(pipeline.syncPipelineWithSalesforce, req.params.accessToken, req.params.instance),
			two: pipeline.exportToSheets
		}, function(error, results){
			if (error) {
				helpers.errorLog(error)
				res.json(error)
			} else {
				res.json(results.two)
			}
		})
	})

// Get current capacity data from salesforce, update roles_capacities database, and export to Google Sheets
router.route('/:instance/DATA_Capacity/:accessToken')
	.get(function(req, res) {
		var accessToken = req.params.accessToken,
			instance    = req.params.instance

		async.waterfall([
			async.apply(capacity.queryCapacity,accessToken,instance),
			capacity.clearCapacityTable,
			capacity.insertCapacity,
			capacity.exportCapacity
		], function(error, results) {
			if (error) {
				helpers.errorLog(error)
				res.json(error)
			} else {
				res.json(results)
			}
		})
	})

// Create forecast data from allocation/pipeline data (@param req.body) and roles_capacities table,
// and export to Google Sheets
router.route('/DATA_Forecast')
	.post(function(req, res) {
		forecast = new Forecast(req.body, function(error) {
			if (error) {
				helpers.errorLog(error)
				res.json(error)
				delete forecast
			} else {
				forecast.create(function(error) {
					if (error) {
						helpers.errorLog(error)
						res.json(error)
						delete forecast
					} else {
						res.json(forecast.returnData)
						delete forecast
					}
				})
			}
		})
	})

// Main route for Google Sheet buttons
// Add, update opportunities in sales_pipeline table
// Update opportunities in table when project sizes are changed or added
router.route('/updatePipelineTable')
	.post(function(req, res) {
		switch(req.body.type) {
			case "add":
				async.series({
					one: async.apply(pipeline.insertWithDefaultSize, req.body.opportunityData),
					two: async.apply(helpers.setOpportunityStatus,[req.body.opportunityName],req.body.status),
					three: pipeline.exportToSheets
				}, function(error, results) {
					if (error) {
						helpers.errorLog(error)
						res.json(error)
					} else { res.json(results.three) }
				})
				break
			case "update_generic":
				async.series({
					one: async.apply(helpers.query, req.body.query, req.body.values),
					two: async.apply(pipeline.syncSingleOpportunity, req.body.opportunityName),
					three: pipeline.exportToSheets
				}, function(error, results){
					if (error) {
						helpers.errorLog(error)
						res.json(error)
					} else { res.json(results.three) }
				})
				break
			case "update_pipeline":
				async.series({
					one: async.apply(helpers.query, req.body.query, req.body.values),
					two: async.apply(helpers.query, "SELECT attachment FROM sales_pipeline where opportunity = $1", [req.body.opportunityName])
				},function(error, results){
					if (error) {
						helpers.errorLog(error)
						res.json(error)
					} else {
						if (results.two[0]) {
							pipeline.exportToSheets(function(error, pipelineData) {
								if (error) {
									helpers.errorLog(error)
									res.json(error)
								} else { res.json(pipelineData) }
							})
						} else {
							async.series({
								one: async.apply(pipeline.syncSingleOpportunity, req.body.opportunityName),
								two: pipeline.exportToSheets
							}, function(error, results){
								if (error) {
									helpers.errorLog(error)
									res.json(error)
								} else { res.json(results.two) }
							})
						}
					}
				})
				break
			case "remove":
				async.series({
					one: async.apply(helpers.deleteOpportunities, req.body.opportunities),
					two: pipeline.exportToSheets
				}, function(error, results){
					if (error) {
						helpers.errorLog(error)
						res.json(error)
					} else { res.json(results.two) }
				})
				break
			case "omit":
				async.series({
					one: async.apply(helpers.setOpportunityStatus, req.body.opportunities, req.body.status),
					two: pipeline.exportToSheets
				}, function(error, results){
					if (error) {
						helpers.errorLog(error)
						res.json(error)
					} else { res.json(results.two) }
				})
				break
			case "project_size":
				async.series({
					one: async.apply(helpers.query, req.body.query, req.body.values),
					two: pipeline.syncWithDefaultSizes,
					three: pipeline.exportToSheets
				}, function(error, results){
					if (error) {
						helpers.errorLog(error)
						res.json(error)
					} else { res.json(results.three) }
				})
				break
			case "assign_role":
				async.series({
					one: async.apply(capacity.assignRole, req.body.name, req.body.role),
					two: capacity.exportCapacity
				}, function(error, results){
					if (error) {
						helpers.errorLog(error)
						res.json(error)
					} else { res.json(results.two) }
				})
				break
				case "assign_resource":
					async.series({
						one: async.apply(pipeline.assignResource, req.body.name, req.body.role, req.body.opportunity),
						two: capacity.exportCapacity // TODO: Change to refresh pipeline
					}, function(error, results){
						if (error) {
							helpers.errorLog(error)
							res.json(error)
						} else { res.json(results.two) }
					})
					break
			case "debug":
				pipeline.exportToSheets(function(error, pipelineData) {
					if (error) {
						helpers.errorLog(error)
						res.json(error)
					}else { res.json(pipelineData) }
				})
				break
			case "protected":
				helpers.setOpportunityStatus(req.body.opportunities, req.body.status, function(error) {
					if (error) {
						helpers.errorLog(error)
						res.json(error)
					} else { res.json({message: "Success!"}) }
				})
				break
			default:
				res.json({message: "Default case, No Update."})
		}
	})

// Update a specific opportunity in the sales_pipeline table from
// an xlsx sheet attached to an opportunity object in salesforce
router.route('/trigger')
	.post(function(req, res) {
		async.waterfall([
			async.apply(parser.parseExcelSheet, req.body),
			xlsxHandler.updateDatabaseFromXlsx
		], function(error, results){
			if (error) {
				helpers.errorLog(error)
				res.json(error)
			} else { res.json({ message: 'Trigger Done' }) }
		})
	})

// Start server
app.listen(port)
console.log('Heroku station is operational on port ' + port)
