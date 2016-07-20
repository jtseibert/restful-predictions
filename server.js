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
	Cache           = require('node-cache'),
	Capacity        = require('./models/capacity')

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
		var allocation = new Allocation(req.params.instance, req.params.accessToken)
		cache.get("allocation", function(err, value) {
			if(!err) {
				if(value == undefined) {
		    		console.log('allocation data not cached')
					allocation.getstuff(oauth2, async, cache, function() {
						res.json(allocation.returnData)
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
		cache.get("capacity", function(err, value) {
			if(!err) {
				if(value == undefined) {
		    		console.log('capacity data not cached')
					capacity.get(oauth2, async, cache, function(result) {
						res.json(capacity.returnData)
						delete capacity
					})
				} else { 
					console.log('capacity cached, returning')
					res.json(value)
					delete capacity
				}
			} else {
				res.json({message: err})
				delete capacity
			}
		})
	})

//Create sales_pipeline DB routes
router.route('/addOpportunity')
	.post(function(req,res){
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
		projectSize = new ProjectSize(req.body)
		projectSize.add(pg,function(err){
			if (err)
				res.send(err)
			res.json({message: 'Success!'})
			delete projectSize
		})
	})

router.route('/removeProjectSize')
	.post(function(req,res){
		projectSize = new ProjectSize(req.body)
		projectSize.remove(pg,function(err){
			if (err)
				res.send(err)
			res.json({message: 'Success!'})
			delete projectSize
		})
	})

router.route('/updateProjectSize')
	.post(function(req,res){
		projectSize = new ProjectSize(req.body)
		projectSize.update(pg,function(err){
			if (err)
				res.send(err)
			res.json({message: 'Success!'})
			delete projectSize
		})
	})

router.route('/getProjectSize')
	.get(function(req,res){
		projectSize = new ProjectSize("")
		projectSize.get(pg,function(err,response){
			if (err)
				res.send(err)
			res.json(response)
			delete projectSize
		})
	})

router.route('/editProjectSize')
	.post(function(req,res){
		projectSize = new ProjectSize(req.body)
		projectSize.edit(pg,function(err,response){
			if (err)
				res.send(err)
			res.json(response)
			delete projectSize
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

router.route('/addRole')
	.post(function(req, res) {
		roles = new Roles(req.body)
		roles.add(pg, function(err, response) {
			if(err)
				res.send(err)
			res.json({message: 'Success!'})
			delete roles
		})
	})

//Register routes
//All of our routes will be prefixed with /api
app.use(function(req, res, next){
    res.setTimeout(5000, function(){
        console.log('Request has timed out, caught by our timeout.');
            res.sendStatus(408);
        });

    next();
});

app.use('/api', router)

//Start server
app.listen(port)
console.log('Heroku is up on port ' + port)
