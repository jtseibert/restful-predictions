
app.get('/getData', function(req, res) {
    var req = https.request(options, function(res){
        var data = "";
        var label = "hi"

        res.on('data', function(d){
            data += d;
        });

        res.on('error', (e) => {
            console.log('Error found');
            console.error(e);
        });

        res.on('end', function(err, res) {
            console.log('ENTER IF DATA, PRINTING DATA');
            data = JSON.parse(data.toString('utf-8'));
            // console.log(data.factMap["T!T"].aggregates[0].label);
            label = data.factMap["T!T"].aggregates[0].label
            console.log('label: ' + label)
            var xls = json2xls(data.factMap)
            fs.writeFileSync('../factMap.xlsx',xls,'binary')      
        })
    })
    req.end()
    res.render('data')
});