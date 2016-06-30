//server.js

//Initialize dependencies
var express			= require('express'),
	app        		= express(),
	bodyParser 		= require('body-parser'),
	Allocation 		= require('./models/allocation'),
	async			= require('async'),
	Opportunity 	= require('./models/opportunity'),
	Pipeline 		= require('./models/pipeline'),
	Omit 			= require('./models/omit')

app.use(bodyParser.json({ limit: '50mb' }))
app.use(bodyParser.urlencoded({limit: '1gb', extended: true }))

var port = process.env.PORT || 5000

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
var pg = require('pg')
pg.defaults.ssl = true

//Create SF routes
router.route('/:instance/Allocation/:accessToken')
	.get(function(req,res){
		allocation = new Allocation(req.params.instance, req.params.accessToken)
		allocation.getAllocation(oauth2,function(result){
			console.log('should be returning json')
			res.json(result)
		})
	})

router.route('/:instance/Sales_Pipeline/:accessToken')
	.get(function(req, res) {
		pipeline = new Pipeline(req.params.instance, req.params.accessToken)
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err;
			pipeline.getPipeline(client, oauth2, function(result) {
				res.json(result)
				client.end()
			})
		})
	})

//Create sales_pipeline DB routes
router.route('/addOpportunity')
	.post(function(req,res){
		opportunity = new Opportunity(req.body)
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err;
			opportunity.add(client,function(err){
				if (err)
					res.send(err)
				res.json({message: 'Success!'})
			})
		})
	})

router.route('/removeOpportunity')
	.post(function(req,res){
		opportunity = new Opportunity(req.body)
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err;
			opportunity.remove(client,function(err){
				if (err)
					res.send(err)
				res.json({message: 'Success!'})
			})
		})
	})

//Create omit DB routes
router.route('/addOmit')
	.post(function(req,res){
		omit = new Omit(req.body)
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err;
			omit.add(client,function(err){
				if (err)
					res.send(err)
				res.json({message: 'Success!'})
			})
		})
	})

router.route('/removeOmit')
	.post(function(req,res){
		omit = new Omit(req.body)
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err;
			omit.remove(client,function(err){
				if (err)
					res.send(err)
				res.json({message: 'Success!'})
			})
		})
	})

router.route('/getOmit')
	.get(function(req, res) {
		omit = new Omit("")
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err;
			omit.getOmit(client, function(err, response){
				if (err)
					res.send(err)
				res.json(response)
			})
		})
	})

//Create general DB routes
router.route('/clearDB')
	.get(function(req,res){
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			client.query('delete from sales_pipeline *')
			client.query('delete from omit *')
		})
		res.json({message: 'Success!'})
		client.end();
	})

//Register routes
//All of our routes will be prefixed with /api
app.use('/api', router)

//Start server
app.listen(port);
console.log('Magic happens on port ' + port)
