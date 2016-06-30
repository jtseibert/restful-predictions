//server.js

//Initialize dependencies
var express			= require('express'),
	app        		= express(),
	bodyParser 		= require('body-parser'),
	Allocation 		= require('./models/allocation'),
	async			= require('async'),
	UpdateDB 		= require('./models/updateDB'),
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

//database
var pg = require('pg')
pg.defaults.ssl = true

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

router.route('/updateDB')
	.post(function(req,res){
		update = new UpdateDB(req.body)
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err;
			update.updateDB(client,function(err){
				if (err)
					res.send(err)
				res.json({message: 'Success!'})
			})
		})
	})

router.route('/omit')
	.post(function(req,res){
		omit = new Omit(req.body)
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err;
			omit.updateOmit(client,function(err){
				if (err)
					res.send(err)
				res.json({message: 'Success!'})
			})
		})
	})

router.route('/undoOmit')
	.post(function(req,res){
		omit = new Omit(req.body)
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err;
			omit.undoOmit(client,function(err){
				if (err)
					res.send(err)
				res.json({message: 'Success!'})
			})
		})
	})

router.route('/getFromOmit')
	.get(function(req, res) {
		omit = new Omit("foo")
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err;
			omit.getOpportunities(client, function(err, response){
				if (err)
					res.send(err)
				res.json(response)
			})
		})
	})

router.route('/clearDB')
	.get(function(req,res){
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			client.query('delete from sales_pipeline *')
			client.query('delete from omit *')
		})
		res.json({message: 'Success!'})
		client.end();
	})

/*
router.route('/displayOptions')
	.get(function(req, res) {
		//input irrelevant to query
		importFile = new Import('foo')
		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err;
			importFile.displayOptions(client, function(err, result){
				if (err)
					res.send(err)
				res.json(result)
				client.end()
			})
		})		
	})*/

//Register routes
//All of our routes will be prefixed with /api
app.use('/api', router)

//Start server
app.listen(port);
console.log('Magic happens on port ' + port)
