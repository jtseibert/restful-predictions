// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express'),
	app        = express(),
	bodyParser = require('body-parser'),
	authenticate = require('./models/authenticate')

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

var port = process.env.PORT || 5000        // set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router()              // get an instance of the express Router

// test route to make sure everything is working (accessed at GET http://localhost:5000/api)
router.get('/', function(req, res) {
    res.json({ message: 'hooray! welcome to our api!' })
})

// more routes for our API will happen here
router.route('/:username/:password')
	.get(function(req, res) {
		var authenticate = new Authenticate(req.params.username, req.params.password)
		authenticate.getToken()
		res.json(authenticate.token.token)
	})

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router)

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port)
