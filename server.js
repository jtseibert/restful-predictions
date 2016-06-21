//server.js

//Initialize dependencies
var express			= require('express'),
	app        		= express(),
	bodyParser 		= require('body-parser'),
	Authenticate 	= require('./models/authenticate')
	Data 			= require('./models/data'),
	async			= require('async')

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

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

//Declare module level variables for authentication
// var token,
// 	json

router.route('/:instance/:accessKey/:id')
	.get(function(req,res){
		data = new Data(req.params.instance, req.params.accessKey, req.params.id)
		data.getData(oauth2,function(result){
			res.json(result)
		})
	})

	// .get(function(req, res) {
	// 	async.series([
	//         function(callback) {
	//         	console.log('entering first method')
	//         	authenticate = new Authenticate(req.params.username, req.params.password, credentials)
	// 			authenticate.getToken(oauth2, function(result){
	// 				token = result
	// 				callback()
	// 			})
	//         },
	//         function(callback) {
	//         	console.log('entering second method')
	//         	data = new Data(token, req.params.id)
	// 			data.getData(oauth2, function(result){
	// 				json = result
	// 				callback()
	// 			})
	//         }
	//     ], function(err) {
	//         if (err) return next(err);
	//         console.log('should be printing...')
	//         res.json(json);
	//     });
	// })

//Register routes
//All of our routes will be prefixed with /api
app.use('/api', router)

//Start server
app.listen(port);
console.log('Magic happens on port ' + port)
