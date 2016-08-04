// server.js

// Initialize dependencies
var	newRelic		= require('newrelic')

var	allocation 		= require('./models/allocation3'),
	async			= require('async'),
	bodyParser 		= require('body-parser'),
	Cache           = require('node-cache'),
	Capacity        = require('./models/capacity'),
	express			= require('express'),
	Forecast 		= require('./models/forecast2'),
	jsdiff 			= require('diff'),
	Omit 			= require('./models/omit'),
	Opportunity 	= require('./models/opportunity'),
	pg 				= require('pg'),
	Pipeline 		= require('./models/pipeline'),
	ProjectSize 	= require('./models/projectSize'),
	xlsx            = require('xlsx')
require('colors')

var app = express()
var router = express.Router()

app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({limit: '1gb', extended: true }))
app.use('/api', router)
pg.defaults.ssl = true

var port = process.env.PORT || 5000,
	cache = new Cache()

// Helper function to query any table in database
function query(query, callback) {
	q = query
	pg.connect(process.env.DATABASE_URL, function(err, client) {
		console.log("query is: " + q)
		var query = client.query(q)
		query.on("row", function (row, result) {
			console.log(row)
			result.addRow(row)
		})
		query.on("end", function (result) {
			process.nextTick(function() {callback(result.rows)})
		})
	})
}

// Setup oauth2 with connected app credentials
var oauth2 = require('simple-oauth2'),
	credentials = {
        clientID: '3MVG9uudbyLbNPZMn2emQiwwmoqmcudnURvLui8uICaepT6Egs.LFsHRMAnD00FSog.OXsLKpODzE.jxi.Ffu',
        clientSecret: '625133588109438640',
        site: 'https://login.salesforce.com',
        authorizationPath: '/services/oauth2/authorize',
        tokenPath: '/services/oauth2/token',
        revokePath: '/services/oauth2/revoke'
    }

// Initialize the OAuth2 Library
var oauth2 = oauth2(credentials)

// Define routes
router.route('/query')
	.post(function(req, res) {
		query(req.body.query, function(results) {
			res.json(results)
		})
	})

// Import allocation/sales_pipeline/capacity/forecast
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
		var pipeline = new Pipeline(async, req.params.instance, req.params.accessToken, pg, function() {
			cache.get("sales_pipeline", function(err, value) {
				if(!err) {
					if(value == undefined) {
			    		console.log('sales_pipeline data not cached')
						pipeline.get(oauth2, async, cache, function(result) {
							pipeline.applyDB(async, result, function(){
								res.json(pipeline.returnData)
								delete pipeline
							})
						})
					} else { 
						console.log('sales_pipeline cached, returning')
						pipeline.applyDB(async, value, function() {
							res.json(pipeline.returnData)
							delete pipeline
						})
					}
				} else {
					res.json({message: err})
					delete pipeline
				}
			})
		})
	})

router.route('/:instance/DATA_Capacity/:accessToken')
	.get(function(req, res) {
		var capacity = new Capacity(req.params.instance, req.params.accessToken)
		capacity.get(oauth2, function(result) {
			capacity.updateDB(pg, function() {
				console.log('deleting capacity obj')
				delete capacity
			})
			res.json(capacity.returnData)
		})
	})

router.route('/DATA_Forecast')
	.post(function(req, res) {
		forecast = new Forecast(pg, req.body, function() {
			forecast.create(function() {
				res.json(forecast.returnData)
				// async.each(forecast.returnData, function(row){
				// })
				delete forecast
			})
		})
	})

// Add/update/remove opportunities
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

router.route('/removeOpportunity')
	.post(function(req,res) {
		opportunity = new Opportunity(req.body)
		opportunity.remove(async, pg,function(err) {
			if (err)
				res.send(err)
			else
				res.json({message: 'Success!'})
			delete opportunity
		})
	})

// Add/remove ommited opportunities
router.route('/addOmit')
	.post(function(req,res) {
		omit = new Omit(req.body)
		omit.add(pg,function(err) {
			if (err)
				res.send(err)
			else
				res.json({message: 'Success!'})
			delete omit
		})
	})

router.route('/removeOmit')
	.post(function(req,res){
		omit = new Omit(req.body)
		omit.remove(pg,function(err) {
			if (err)
				res.send(err)
			else
				res.json({message: 'Success!'})
			delete omit
		})
	})



router.route('/addProjectSize')
	.post(function(req,res){
		projectSize = new ProjectSize(req.body, function() {
			projectSize.add(pg,function(err) {
				if (err)
					res.send(err)
				else
					res.json({message: 'Success!'})
				delete projectSize
			})
		})
	})

router.route('/updateProjectSize')
.post(function(req,res) {
	projectSize = new ProjectSize(req.body, function() { 
		projectSize.update(pg,function(err) {
			if (err)
				res.send(err)
			else
				res.json({message: 'Success!'})
			delete projectSize
		})
	})
})

router.route('/editProjectSize')
	.post(function(req,res) {
		projectSize = new ProjectSize(req.body, function() {
			console.log(projectSize.data)
			projectSize.edit(pg,function(err,response) {
				if (err)
					res.send(err)
				else
					res.json(response)
				delete projectSize
			})
		})	
	})

router.route('/removeProjectSize')
	.post(function(req,res){
		projectSize = new ProjectSize(req.body, function() {
			projectSize.remove(pg,function(err) {
				if (err)
					res.send(err)
				else
					res.json({message: 'Success!'})
				delete projectSize
			})
		})
	})

// Update capacity
router.route('/updateCapacity')
	.post(function(req, res) {
		var capacity = new Capacity(null, null, req.body)
		capacity.updateDB(pg, function() {
			console.log('deleting capacity obj')
			delete capacity
		})
		res.json({message: 'Success!'})
	})

// Debug routes
router.route('/clearDB')
	.post(function(req,res) {
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			client.query('delete from sales_pipeline *')
			client.query('delete from omit *')
		})
		res.json({message: 'Success!'})
	})

// Updates project sizes database with data from SF opportunity attachment
//WIP
router.route('/importProjectSize')
	.post(function(req, res) {
		var workbook = xlsx.read(req.body.b64, {type: 'base64'})
		var sheet = workbook.Sheets[workbook.SheetNames[2]]
		for (var z in sheet) {
    		/* all keys that do not begin with "!" correspond to cell addresses */
   			if(z[0] === '!') continue;
    		//console.log(z + "=" + JSON.stringify(sheet[z].v));
  		}

  		var rowStart = 18
  		var colStart = 28
  		var projectSizeData = {}
  		while(sheet[xlsx.utils.encode_cell({r:rowStart,c:1})].v != 'Subtotal') {
  			var cellValue = sheet[xlsx.utils.encode_cell({r:rowStart,c:1})]
  			console.log('cell is ' + cellValue)
  			if(cellValue != '') {
  				projectSizeData[cellValue] = {}
  				var date
  				for(var i = 0; i < 19; i++) {//temp 
  					date = sheet[xlsx.utils.encode_cell({r:28,c:(colStart+i)})].v
  					projectSizeData[cellValue][date] = sheet[xlsx.utils.encode_cell({r:rowStart,c:(colStart+i)})].v
  				}
  			}
  			rowStart++
  		}
  		console.log(projectSizeData)
		


		//var json = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[2]])
		//console.log("9is: " + sheet[xlsx.utils.encode_cell({r:19,c:7})].v)
		//		console.log("29is: " + sheet[xlsx.utils.encode_cell({r:19,c:28})].v)


		res.send({message: "Success!"})
	})

// Catch timeouts
// app.use(function(req, res, next) {
//     res.setTimeout(5000, function() {
//             res.sendStatus(408);
//         });
//     next();
// });

//Start server
app.listen(port)
console.log('Heroku station is operational on port ' + port)
