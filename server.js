//server.js

//Initialize dependencies
var newRelic		= require('newrelic'),
	express			= require('express'),
	app        		= express(),
	bodyParser 		= require('body-parser'),
	Allocation2 	= require('./models/allocation2'),
	async			= require('async'),
	Opportunity 	= require('./models/opportunity'),
	Pipeline 		= require('./models/pipeline'),
	Omit 			= require('./models/omit'),
	pg 				= require('pg'),
	ProjectSize 	= require('./models/projectSize'),
	Roles 			= require('./models/roles'),
	Cache           = require('node-cache'),
	Capacity        = require('./models/capacity'),
	Forecast 		= require('./models/forecast2'),
	xlsx            = require('xlsx'),
	Drive 			= require('./models/drive'),
	base64    		= require('base-64'),
	utf8  			= require('utf8'),
	zip				= require('node-zip'),
	jsdiff 			= require('diff')


	require('colors')


app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({limit: '1gb', extended: true }))

var port = process.env.PORT || 5000,
	cache = new Cache()

//Setup oauth2
var oauth2 = require('simple-oauth2'),
	credentials = {
        clientID: '3MVG9uudbyLbNPZMn2emQiwwmoqmcudnURvLui8uICaepT6Egs.LFsHRMAnD00FSog.OXsLKpODzE.jxi.Ffu',
        clientSecret: '625133588109438640',
        site: 'https://login.salesforce.com',
        authorizationPath: '/services/oauth2/authorize',
        tokenPath: '/services/oauth2/token',
        revokePath: '/services/oauth2/revoke'
    }

//Initialize the OAuth2 Library
var oauth2 = oauth2(credentials)

//Setup routes for API
var router = express.Router()

//Database
pg.defaults.ssl = true

//Create SF routes
router.route('/:instance/DATA_Allocation/:accessToken')
	.get(function(req, res) {
		var allocation = new Allocation2(req.params.instance, req.params.accessToken)
		cache.get("allocation", function(err, value) {
			if(!err) {
				if(value == undefined) {
		    		console.log('allocation data not cached')
					allocation.getReportData(oauth2, cache, function(allocationData) {
						res.json(allocationData)
						delete allocation
					})
				} else { 
					console.log('allocation data cached, returning')
					res.json(value)
					delete allocation
				}
			} else {
				res.json({message: err})
				delete allocation
			}
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
			capacity.updateDB(pg, function(){
				console.log('deleting capacity obj')
				delete capacity
			})
			res.json(capacity.returnData)
		})
	})

//Create sales_pipeline DB routes
router.route('/updateCapacity')
	.post(function(req, res) {
		var capacity = new Capacity(null, null, req.body)
		capacity.updateDB(pg, function(){
			console.log('deleting capacity obj')
			delete capacity
		})
		res.json({message: 'Success!'})
	})

router.route('/addOpportunity')
	.post(function(req,res){
		console.log('addOpportunity')
		opportunity = new Opportunity(req.body)
		opportunity.add(async, pg,function(err){
			if (err)
				res.send(err)
			res.json({message: 'Success!'})
			delete opportunity
		})
	})

router.route('/removeOpportunity')
	.post(function(req,res){
		opportunity = new Opportunity(req.body)
		opportunity.remove(async, pg,function(err){
			if (err)
				res.send(err)
			res.json({message: 'Success!'})
			delete opportunity
		})
	})

router.route('/getOpportunity')
	.get(function(req, res) {
		console.log('getOpportunity')
		opportunities = new Opportunity("")
		opportunities.get(pg, function(err, response){
			if (err)
				res.send(err)
			res.json(response)
			delete opportunities
		})
	})

//Create omit DB routes
router.route('/addOmit')
	.post(function(req,res){
		omit = new Omit(req.body)
		omit.add(pg,function(err){
			if (err)
				res.send(err)
			res.json({message: 'Success!'})
			delete omit
		})
	})

router.route('/removeOmit')
	.post(function(req,res){
		omit = new Omit(req.body)
		omit.remove(pg,function(err){
			if (err)
				res.send(err)
			res.json({message: 'Success!'})
			delete omit
		})
	})

router.route('/getOmit')
	.get(function(req, res) {
		omit = new Omit("")
		omit.get(pg, function(err, response){
			if (err)
				res.send(err)
			res.json(response)
			delete omit
		})
	})

//Create project_sizes routes
router.route('/addProjectSize')
	.post(function(req,res){
		projectSize = new ProjectSize(req.body, function(){
			projectSize.add(pg,function(err){
				if (err)
					res.send(err)
				res.json({message: 'Success!'})
				delete projectSize
			})
		})
	})

router.route('/removeProjectSize')
	.post(function(req,res){
		projectSize = new ProjectSize(req.body, function(){
			projectSize.remove(pg,function(err){
				if (err)
					res.send(err)
				res.json({message: 'Success!'})
				delete projectSize
			})
		})
	})

router.route('/updateProjectSize')
	.post(function(req,res){
		projectSize = new ProjectSize(req.body, function(){
			projectSize.update(pg,function(err){
				if (err)
					res.send(err)
				res.json({message: 'Success!'})
				delete projectSize
			})
		})
	})

router.route('/getProjectSize')
	.get(function(req,res){
		projectSize = new ProjectSize("", function(){
			projectSize.get(pg,function(err,response){
				if (err)
					res.send(err)
				res.json(response)
				delete projectSize
			})
		})
	})

router.route('/editProjectSize')
	.post(function(req,res){
		projectSize = new ProjectSize(req.body, function(){
			console.log(projectSize.data)
			projectSize.edit(pg,function(err,response){
				if (err)
					res.send(err)
				res.json(response)
				delete projectSize
			})
		})	
	})

//Create general DB routes
router.route('/clearDB')
	.post(function(req,res){
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			client.query('delete from sales_pipeline *')
			client.query('delete from omit *')
		})
		res.json({message: 'Success!'})
	})

//Create roles routes
router.route('/getRoles')
	.get(function(req,res){
		roles = new Roles("")
		roles.get(pg,function(err,response){
			if (err)
				res.send(err)
			res.json(response)
			delete roles
		})
	})

router.route('/DATA_Forecast')
	.post(function(req, res){
		forecast = new Forecast(pg, req.body, function(){
			forecast.create(function(){
				res.json(forecast.returnData)
				// async.each(forecast.returnData, function(row){
				// })
				delete forecast
			})
		})
	})

router.route('/importProjectSize')
	.post(function(req, res){
		//console.log(Object.prototype.toString.call(req.body))
var b = req.body.b64
b = b.replace(' ','')
		var test = "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"
		
		/*var one = test
		var other = b
		 
		var diff = jsdiff.diffChars(one, other)
		 
		diff.forEach(function(part){
		  // green for additions, red for deletions 
		  // grey for common parts 
		  var color = part.added ? 'green' :
		    part.removed ? 'red' : 'grey'
		  process.stderr.write(part.value[color])
		})*/
		 
			//console.log(b)
			//console.log(test == b)
			//var p = b
			//p = p + '=='
			//console.log(p)
			//var bytes = base64.decode(b)
			//console.log(bytes)
			//var text = utf8.decode(bytes)
			//console.log(text)
			
			var workbook = xlsx.read(b, {type: 'base64'})
			var json = xlsx.utils.sheet_to_json(workbook)
			console.log(json)

		res.send({message: "HEYHEYHEYHEYH"})
	})

router.route('/drive')
	.get(function(req, res){
		drive = new Drive()
	})

//Register routes
//All of our routes will be prefixed with /api
app.use(function(req, res, next){
    res.setTimeout(5000, function(){
            res.sendStatus(408);
        });
    next();
});

app.use('/api', router)

//Start server
app.listen(port)
console.log('Heroku is up on port ' + port)
