//authenticate.js
//input: 
    //String: username
    //String: password
    //JSON: credentials
//output:
    //JSON: access_token

//Export functions
module.exports = Authenticate

//Authenticate constructor
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

//Get token using Authenticate credentials
Authenticate.prototype.getToken = function(oauth2, callback) {
    //Attempt to get token
    oauth2.password.getToken(this.tokenConfig, function saveToken(error, result) {
        if (error) { //On error
            console.log('Access Token Error', JSON.stringify(error)) 
        }
        else { // n success
            this.token = oauth2.accessToken.create(result)
            this.hostURL = this.token.token.instance_url
            //Return the newly created token
            callback(this.token)
        }   
    })
}












