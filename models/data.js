//Private
// var oauth2 = require('simple-oauth2')

// var credentials = {
//         clientID: '3MVG9uudbyLbNPZMn2emQiwwmoqmcudnURvLui8uICaepT6Egs.LFsHRMAnD00FSog.OXsLKpODzE.jxi.Ffu',
//         clientSecret: '625133588109438640',
//         site: 'https://login.salesforce.com',
//         authorizationPath: '/services/oauth2/authorize',
//         tokenPath: '/services/oauth2/token',
//         revokePath: '/services/oauth2/revoke'
//     }

// // Initialize the OAuth2 Library
// var oauth2 = oauth2(credentials)

function Data(token, id) {
	this.token = token
	this.path = token.token.instance_url + 'services/data/v35.0/analytics/reports/' + id
	this.json
} 

module.exports = Data

Data.prototype.getData = function(oauth2, callback) {
	console.log(this.token.token.access_token)
	this.json = oauth2.api('GET', this.path, {
	        'Authorization': 'Bearer ' + this.token.token.access_token,
	        'Content-Type' : 'application/json'
	        }, function (err, data) {
	            console.log(data)
	    	}
	    )
    callback(this.json)
}