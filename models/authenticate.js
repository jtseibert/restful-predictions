
module.exports = Authenticate

function Authenticate(username, password, credentials) {
    this.token;
    this.hostURL;
    this.path = '/services/data/v35.0/analytics/reports/';
    this.tokenConfig = {
        grant_type: 'password',
        username: username,
        password: password,
        client_id: credentials.clientID,
        client_secret: credentials.clientSecret
    }
}

Authenticate.prototype.getToken = function(oauth2, callback) {
    oauth2.password.getToken(this.tokenConfig, function saveToken(error, result) {
        if (error) { 
            console.log('Access Token Error', JSON.stringify(error)) 
        }
        else {
            this.token = oauth2.accessToken.create(result)
            this.hostURL = this.token.token.instance_url
            //console.log(this.token.token)
            callback(this.token)
        }   
    })
}












