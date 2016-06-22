//server.js

//Initialize dependencies
var express			= require('express'),
	app        		= express(),
	bodyParser 		= require('body-parser'),
	Data 			= require('./models/data'),
	async			= require('async'),
	Table 			= require('./models/table')

app.use(bodyParser.json())
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

router.route('/:instance/:accessToken/:id')
	.get(function(req,res){
		data = new Data(req.params.instance, req.params.accessToken, req.params.id)
		data.getData(oauth2,function(result){
			console.log('should be returning json')
			res.json(result)
		})
	})

router.route('/table')
	.post(function(req,res){
		//console.log(req.body)
		table = new Table(JSON.parse(req.body));
		table.makeTable(function(err){
			if (err)
				res.send(err)
			res.json({message: 'Success!'})
		})
		// send table to pg
	})

//Register routes
//All of our routes will be prefixed with /api
app.use('/api', router)

//Start server
app.listen(port);
console.log('Magic happens on port ' + port)
