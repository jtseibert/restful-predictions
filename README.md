# restful-predictions
a forecast system hosted by Heroku, implemented with nodejs

Generate and view jsdoc documentation nodejs source by running:
```
npm install
./node_modules/.bin/jsdoc src/* -d documentation
open ./documentation/index.html
```

View the Heroku app dashboard at:
(https://dashboard.heroku.com/apps/restful-predictions)

To restart heroku and view heroku logs for this app, install the Heroku CLI by following the instructions here: (https://devcenter.heroku.com/articles/heroku-command)

To restart, run:

`heroku restart --app restful-predictions`

To view most recent logs, run:

`heroku logs --tail --app restful-predictions`
