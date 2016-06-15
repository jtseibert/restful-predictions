// requires
var https = require('https'),
    http = require('http'),
    oauth2 = require('simple-oauth2'),
    bufferJson = require('buffer-json')

/* For oauth2 authentication and token handling */

    // Set the configuration settings
var credentials = {
        clientID: '3MVG9uudbyLbNPZMn2emQiwwmoqmcudnURvLui8uICaepT6Egs.LFsHRMAnD00FSog.OXsLKpODzE.jxi.Ffu',
        clientSecret: '625133588109438640',
        site: 'https://login.salesforce.com',
        authorizationPath: '/services/oauth2/authorize',
        tokenPath: '/services/oauth2/token',
        revokePath: '/services/oauth2/revoke'
    },
    token,
    options,
    hostURL

// Initialize the OAuth2 Library
var oauth2 = oauth2(credentials)

// Authorization uri definition
var authorization_uri = oauth2.authCode.authorizeURL({
        redirect_uri: 'https://hello-world360.herokuapp.com/callback',
        scope: 'full'
    })




    // var code = req.query.code

    // oauth2.authCode.getToken({
    //     code: code,
    //     grant_type: 'authorization_uri',
    //     client_id: credentials.clientID,
    //     client_secret: credentials.clientSecret,
    //     redirect_uri: 'https://hello-world360.herokuapp.com/callback'
    // }, saveToken)

    // function saveToken(error, result) {
    //     console.log('entering saveToken')
    //     if (error) { console.log('Access Token Error', error.message); }
    //     token = oauth2.accessToken.create(result)
        
    //     hostURL = token.token.instance_url.replace('https://', '')

    //     options = {
    //         host: hostURL,
    //         port: 443,
    //         path: '/services/data/v35.0/analytics/reports/00Oa0000008r7sg',
    //         method: 'GET',
    //         headers: {
    //             'Authorization': 'Bearer ' + token.token.access_token,
    //             'Content-Type': 'application/json'
    //         }
    //     }
    // }

    // res.render('data')
function Authenticate(username, password){
    var token,
        tokenConfig = {
            this.username: username,
            this.password: password
        }

    oauth2.password.getToken(tokenConfig, function saveToken(error, result) {
        if (error) { console.log('Access Token Error', error.message) }
        token = oauth2.accessToken.create(result)

        oauth2.api('GET', '/users', {
            access_token: token.token.access_token
        }, function (err, data) {
            console.log(data)
        })
    })
}

// Initial page redirecting to Salesforce
// app.get('/auth', function (req, res) {
//     res.redirect(authorization_uri)
// })
/************************************************/