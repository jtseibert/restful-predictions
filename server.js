//server.js

//Initialize dependencies
var express			= require('express'),
	app        		= express(),
	bodyParser 		= require('body-parser'),
	Data 			= require('./models/data'),
	async			= require('async'),
	Table 			= require('./models/table')

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
var pg = require('pg');
pg.defaults.ssl = true;

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
		table = new Table(req.body)


		pg.connect(process.env.DATABASE_URL, function(err, client) {
			if (err) throw err;
			// console.log('Connected to postgres! Getting schemas...');
			// client.query('SELECT table_schema,table_name FROM information_schema.tables;')
			// client.query("CREATE TABLE IF NOT EXISTS emps(firstname varchar(64), lastname varchar(64))");
			// // client.query("INSERT INTO emps(firstname, lastname) values($1, $2)", ['Ronald', 'McDonald']);
			// // client.query("INSERT INTO emps(firstname, lastname) values($1, $2)", ['Mayor', 'McCheese']);
			// var query = client.query("SELECT firstname, lastname FROM emps ORDER BY lastname, firstname");
			// query.on("row", function (row, result) {
			// 	result.addRow(row);
			// });
			// query.on("end", function (result) {
			// 	console.log(JSON.stringify(result.rows, null, "    "));
			// 	client.end();
			// });
			table.saveTable(client,function(err){
				if (err)
					res.send(err)
				console.log(client.query('SELECT * FROM allocation_reports'))
				res.json({message: 'Success!'})
			})
		})
		// send table to pg
	})

//Register routes
//All of our routes will be prefixed with /api
app.use('/api', router)

//Start server
app.listen(port);
console.log('Magic happens on port ' + port)
