

function Data(token, id) {
	this.token = token
	this.path = token.token.instance_url + '/services/data/v35.0/analytics/reports/' + id
	this.json
} 

module.exports = Data

Data.prototype.getData = function(oauth2, callback) {
	console.log(this.token.token)
	console.log(this.path)

	parameters = {
		access_token: this.token.token.access_token
	}

	oauth2.api('GET', this.path, parameters, function (err, data) {
	        	if (err){
	        		console.log('GET Error: ', JSON.stringify(err)) 
	        	}
	            // console.log(data)
	            this.json = data
	    	}
	    )
    callback(this.json)
}