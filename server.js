// server.js

// Initialize dependencies
var	newRelic		= require('newrelic')

var	allocation 		= require('./src/allocation'),
	async			= require('async'),
	bodyParser 		= require('body-parser'),
	capacity        = require('./src/capacity'),
	express			= require('express'),
	forecast 		= require('./src/forecast'),
	helpers			= require('./src/helpers'),
	Opportunity 	= require('./src/opportunity'),
	parser          = require('./src/parser'),
	pg 				= require('pg'),
	pipeline 		= require('./src/pipeline'),
	utilities		= require('./src/utilities'),
	xlsxHandler   	= require('./src/xlsxHandler')

var app = express()
var router = express.Router()

app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({limit: '1gb', extended: true }))
app.use('/api', router)

pg.defaults.ssl = true
pg.defaults.poolSize = 10

var port = process.env.PORT || 5000

// Define routes
router.route('/query')
	.post(function(req, res) {
		helpers.query(req.body.query, req.body.values, function(results) {
			console.log(JSON.stringify(results))
			res.json(results)
		})
	})

// Import allocation|sales_pipeline|capacity|forecast
router.route('/:instance/DATA_Allocation/:accessToken')
	.get(function(req, res) {
		var accessToken = req.params.accessToken,
			instance    = req.params.instance
		allocation.queryAllocation(accessToken, instance, function(allocationData) {
			res.json(allocationData)
		})
	})
	   
router.route('/:instance/DATA_Sales_Pipeline/:accessToken')
	.get(function(req, res) {
		var accessToken = req.params.accessToken,
			instance    = req.params.instance
		pipeline.queryPipeline(accessToken, instance, function(pipelineData) {
			pipeline.applyDB(pipelineData,function(result){
				async.each(result, function(row){
					if (row.length != 12)
						console.log(row)
				})
				console.log(result)
				res.json(result)
			})
		})
	})

router.route('/:instance/DATA_Capacity/:accessToken')
	.get(function(req, res) {
		var accessToken = req.params.accessToken,
			instance    = req.params.instance
		capacity.queryCapacity(accessToken, instance, function(capacityData) {
			res.json(capacityData)
		})
	})

router.route('/DATA_Forecast')
	.post(function(req, res) {
		forecast = new forecast(pg, req.body, function() {
			forecast.create(function() {
				res.json(forecast.returnData)
				delete forecast
			})
		})
	})
//********
// Add/update opportunities
router.route('/addOpportunity')
	.post(function(req,res) {
		console.log('addOpportunity')
		opportunity = new Opportunity(req.body)
		opportunity.add(async, pg, function(err) {
			if (err)
				res.send(err)
			else
				res.json({message: 'Success!'})
			delete opportunity
		})
	})

router.route('/updateOpportunity')
	.post(function(req, res) {
		opportunity = new Opportunity(req.body)
		opportunity.update(pg, function(err) {
			if(err) 
				res.send(err)
			else
				res.json({message: 'Success!'})
			delete opportunity
		})
	})
//*********

router.route('/trigger')
	.post(function(req, res) {
		parser.parseExcelSheet(req.body, function(opportunityData) {
			if(opportunityData != undefined) {
				xlsxHandler.updateDatabase(opportunityData, function(status) {
					res.json({message: status})
				})
			}		
		})
	})

// Start server
app.listen(port)
console.log('Heroku station is operational on port ' + port)
