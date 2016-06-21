//data.js
//input: 
	//json object: token
	//String: id
//output:
	//json object data
	
module.exports = Data

function Data(token, id) {
	this.token = token
	this.path = 'https://org360.my.salesforce.com/services/data/v35.0/analytics/reports/' + id
} 

Data.prototype.getData = function(oauth2, callback) {
	console.log(this.token)
	console.log(this.path)

	parameters = {
		access_token: this.token
	}

	oauth2.api('GET', this.path, parameters, function (err, data) {
	    if (err) {
	        console.log('GET Error: ', JSON.stringify(err)) 
	    }
	        callback(data)
	})  
}