module.exports = Drive

// Module level vars
var google = require('googleapis')
var googleAuth = require('google-auth-library')
var cache = require('node-cache')
var SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly']

function Drive() {
	this.credentials = {
		client_id: "495458014485-sna9qsdtheiq02ou4imhjme970eunb2u.apps.googleusercontent.com",
		project_id: "steel-climber-138714","auth_uri":"https://accounts.google.com/o/oauth2/auth",
		token_uri: "https://accounts.google.com/o/oauth2/token",
		auth_provider_x509_cert_url :"https://www.googleapis.com/oauth2/v1/certs",
		client_secret: "QofGs7YtazeGvYwV5CvAavDN",
		redirect_uris: ["https://restful-predictions.herokuapp.com/oauthcallback"],
		javascript_origins: ["https://restful-predictions.herokuapp.com"]
	}
	authorize(listFiles)
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(callback) {
	var instance = this
	var clientSecret = instance.credentials.client_secret
	var clientId = instance.credentials.client_id
	var redirectUrl = instance.credentials.redirect_uris[0]
	var auth = new googleAuth()
	var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl)

	// Check if we have previously stored a token.
	cache.get("token", function(err, value) {
		if(!err) {
			if(value == undefined) {
	    		console.log('token not cached')
				getNewToken(oauth2Client, callback)
			} else { 
				console.log('token cached')
				oauth2Client.credentials = JSON.parse(value);
  				callback(oauth2Client);
			}
		} else {
			console.log('cache get err')
		}
	})
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to cache be used in later program executions.
 *
 * @param {Object} token The token to store to cache.
 */
function storeToken(token) {
    cache.set("token", token, function(err, success) {
		if(!err && success)
			callback()
		else {
			callback(err)
		}
	})
}

/**
 * Lists the names and IDs of up to 10 files.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listFiles(auth) {
  var service = google.drive('v3');
  service.files.list({
    auth: auth,
    pageSize: 10,
    fields: "nextPageToken, files(id, name)"
  }, function(err, response) {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    }
    var files = response.files;
    if (files.length == 0) {
      console.log('No files found.');
    } else {
      console.log('Files:');
      for (var i = 0; i < files.length; i++) {
        var file = files[i];
        console.log('%s (%s)', file.name, file.id);
      }
    }
  })
}