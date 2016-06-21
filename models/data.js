//data.js
//input: 
	//json object: token
	//String: id
//output:
	//json object data
	
module.exports = Data

function Data(instance, accessToken, id) {
	this.accessToken = accessToken
	this.path = 'https://' + instance + '/services/data/v35.0/analytics/reports/' + id
} 

Data.prototype.getData = function(oauth2, callback) {
	console.log(this.accessToken)
	console.log(this.path)

	parameters = {
		access_token: this.accessToken
	}

	oauth2.api('GET', this.path, parameters, function (err, data) {
	    if (err) {
	        console.log('GET Error: ', JSON.stringify(err)) 
	    }
	        callback(data)
	})  
}