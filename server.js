//server.js

//Initialize dependencies
var newRelic		= require('newrelic'),
	express			= require('express'),
	app        		= express(),
	bodyParser 		= require('body-parser'),
	Allocation 		= require('./models/allocation'),
	async			= require('async'),
	Opportunity 	= require('./models/opportunity'),
	Pipeline 		= require('./models/pipeline'),
	Omit 			= require('./models/omit'),
	pg 				= require('pg'),
	ProjectSize 	= require('./models/projectSize'),
	Roles 			= require('./models/roles'),
	Cache           = require('node-cache')

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
	.get(function(req,res){
		value = cache.get("allocation")
		if(value == undefined) {
			console.log('allocation cache undefined')
			allocation = new Allocation(req.params.instance, req.params.accessToken)
			allocation.get(oauth2, cache, function(result){
				res.json(result)
				delete allocation
			})	
		} else {
			console.log('allocation cached, ret')
			res.json(value)
		}
    })
	   
router.route('/:instance/DATA_Sales_Pipeline/:accessToken')
	.get(function(req, res) {
		var pipeline,
			instance = req.params.instance,
			accessToken = req.params.accessToken
		value = cache.get("sales_pipeline")
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err
			pipeline = new Pipeline(instance, accessToken, client)
			if(value == undefined) {
		    	console.log('sales pipeline cache undefined')
				pipeline.get(client, oauth2, async, cache, function(result) {
					pipeline.applyDB(client, async, result, function(result){
						res.json(result)
						delete pipeline
					})
				})
			} else { 
				console.log('sales pipeline cached, ret')
				pipeline.cachedGet(client, async, value, function(result) {
					res.json(result)
					delete pipeline
				})
			}
			client.end()
		})
	})

//Create sales_pipeline DB routes
router.route('/addOpportunity')
	.post(function(req,res){
		opportunity = new Opportunity(req.body)
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err
			opportunity.add(client,function(err){
				if (err)
					res.send(err)
				res.json({message: 'Success!'})
				delete opportunity
			})
		})
	})

router.route('/removeOpportunity')
	.post(function(req,res){
		opportunity = new Opportunity(req.body)
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err
			opportunity.remove(client,function(err){
				if (err)
					res.send(err)
				res.json({message: 'Success!'})
				delete opportunity
			})
		})
	})

router.route('/getOpportunity')
	.get(function(req, res) {
		opportunities = new Opportunity("")
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err
			opportunities.get(client, function(err, response){
				if (err)
					res.send(err)
				res.json(response)
				delete opportunities
			})
		})
	})

//Create omit DB routes
router.route('/addOmit')
	.post(function(req,res){
		omit = new Omit(req.body)
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err
			omit.add(client,function(err){
				if (err)
					res.send(err)
				res.json({message: 'Success!'})
				delete omit
			})
		})
	})

router.route('/removeOmit')
	.post(function(req,res){
		omit = new Omit(req.body)
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err
			omit.remove(client,function(err){
				if (err)
					res.send(err)
				res.json({message: 'Success!'})
				delete omit
			})
		})
	})

router.route('/getOmit')
	.get(function(req, res) {
		omit = new Omit("")
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err
			omit.get(client, function(err, response){
				if (err)
					res.send(err)
				res.json(response)
				delete omit
			})
		})
	})

//Create project_sizes routes
router.route('/addProjectSize')
	.post(function(req,res){
		projectSize = new ProjectSize(req.body)
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err
			projectSize.add(client,function(err){
				if (err)
					res.send(err)
				res.json({message: 'Success!'})
				delete projectSize
			})
		})
	})

router.route('/removeProjectSize')
	.post(function(req,res){
		projectSize = new ProjectSize(req.body)
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err
			projectSize.remove(client,function(err){
				if (err)
					res.send(err)
				res.json({message: 'Success!'})
				delete projectSize
			})
		})
	})

router.route('/updateProjectSize')
	.post(function(req,res){
		projectSize = new ProjectSize(req.body)
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err
			projectSize.update(client,function(err){
				if (err)
					res.send(err)
				res.json({message: 'Success!'})
				delete projectSize
			})
		})
	})

router.route('/getProjectSize')
	.get(function(req,res){
		projectSize = new ProjectSize("")
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err
			projectSize.get(client,function(err,response){
				if (err)
					res.send(err)
				res.json(response)
				delete projectSize
			})
		})
	})

router.route('/editProjectSize')
	.post(function(req,res){
		projectSize = new ProjectSize(req.body)
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err
			projectSize.edit(client,function(err,response){
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
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err
			roles.get(client,function(err,response){
				if (err)
					res.send(err)
				res.json(response)
				delete roles
			})
		})
	})

//Register routes
//All of our routes will be prefixed with /api
app.use('/api', router)

//Start server
app.listen(port)
console.log('Magic happens on port ' + port)
