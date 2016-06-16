function Data(token, id) {
	this.token = token
	this.path = token.token.instance_url + 'services/data/v35.0/analytics/reports/' + id
} 

Data.prototype.getData() {
	console.log(this.token.token.access_token)
    oauth2.api('GET', this.path, {
        'Authorization': 'Bearer ' + this.token.token.access_token,
        'Content-Type' : 'application/json'
        }, function (err, data) {
            console.log(data)
    })
}