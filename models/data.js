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
	    if (err)
	        console.log('GET Error: ', JSON.stringify(err)) 
	    
	    var factMap 				= data.factMap,
	    	groupingsDown 			= data.groupingsDown.groupings,
	    	groupingsAcross 		= data.groupingsAcross.groupings,
	    	returnData				= {},
	    	employeeKey,
	        projectKey,
	        weekKey,
	        valueKey
	   

	    for (var key in factMap) {

		    valueKey = key
			splitKey = key.split('!')
			weekKey = splitKey[1]
			splitKey = splitKey[0].split('_')
			employeeKey = splitKey[0]
			if (splitKey.length > 1){
				projectKey = splitKey[1]
			} else {
				projectKey = "T"
			}

			if (!(weekKey == "T" || employeeKey == "T" || projectKey == "T")){
				console.log('weekKey: ' + weekKey + "\temployeeKey: " + employeeKey + "\tprojectKey: " + projectKey + "\n")

				returnData[key] = {
					"Resource: Resource Name": groupingsDown[employeeKey].label,
					"Project": groupingsDown[employeeKey].groupings[projectKey].label,
				 	"Start Date": groupingsAcross[weekKey].label,
				 	"Estimated Hours": factMap[key].aggregates[0].value
				}
			}
		}
	    callback(data)
	})  



	// below was used in GoogleScript
	// var factMap = responseData.factMap,
 //        groupingsDown = responseData.groupingsDown.groupings,
 //        groupingsAcross = responseData.groupingsAcross.groupings,
 //        reportExtendedMetadata = responseData.reportExtendedMetadata,
 //        groupingColumnInfo = reportExtendedMetadata.groupingColumnInfo,
 //        detailColumnInfo = reportExtendedMetadata.detailColumnInfo,
 //        codeMap = {},
 //        map = [],
 //        sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet(),
 //        employeeCell,
 //        projectCell,
 //        weekCell,
 //        valueCell,
 //        data = {},
 //        employeeKey,
 //        projectKey,
 //        weekKey,
 //        valueKey,
 //        splitKey,
 //        carrierID = 1,
 //        headers = {},
 //        codeMap = {}
    
 //    //sets grouping headers
 //    var AcrossGroupings = true
 //    headers['grouping'] = {
 //      'down': {},
 //      'across': {}
 //    }
 //    for (var key in groupingColumnInfo){
 //      if (groupingColumnInfo[key].groupingLevel == 0)
 //        AcrossGroupings = !AcrossGroupings
      
 //      if (groupingColumnInfo[key].groupingLevel != 0 && AcrossGroupings == false)
 //        headers.grouping.down[groupingColumnInfo[key].groupingLevel] = groupingColumnInfo[key].label
 //      else if(groupingColumnInfo[key].groupingLevel != 0 && AcrossGroupings == true)
 //        headers.grouping.across[groupingColumnInfo[key].groupingLevel] = groupingColumnInfo[key].label
 //      else if(AcrossGroupings == false)
 //        headers.grouping.down[groupingColumnInfo[key].groupingLevel] = groupingColumnInfo[key].label
 //      else
 //        headers.grouping.across[groupingColumnInfo[key].groupingLevel] = groupingColumnInfo[key].label
 //    }
    
 //    //sets detail headers
 //    headers['detail'] = {}
 //    var detailNumber = 0
 //    for (var key in detailColumnInfo){
 //      headers.detail[detailNumber] = detailColumnInfo[key].label
 //      detailNumber++
 //    }

 //    var carrierInt = 1
 //    for (var down in headers.grouping.down){
 //      sheet.getRange(1,carrierInt).setValue(headers.grouping.down[down])
 //      carrierInt++
 //    }
 //    for (var across in headers.grouping.across){
 //      sheet.getRange(1,carrierInt).setValue(headers.grouping.across[across])
 //      carrierInt++
 //    }
 //    for (var detail in headers.detail){
 //      sheet.getRange(1,carrierInt).setValue(headers.detail[detail])
 //      carrierInt++
 //    }
    
 //    for (var key in factMap) {
      
      
 //      valueKey = key
 //      splitKey = key.split('!')
 //      weekKey = splitKey[1]
 //      splitKey = splitKey[0].split('_')
 //      employeeKey = splitKey[0]
 //      if (splitKey.length > 1){
 //        projectKey = splitKey[1]
 //      } else {
 //        projectKey = "T"
 //      }
      
 //      if (!(weekKey == "T" || employeeKey == "T" || projectKey == "T")){
 //        console.log('weekKey: ' + weekKey + "\temployeeKey: " + employeeKey + "\tprojectKey: " + projectKey + "\n")
        
 //        data[key] = {
 //          "project": groupingsDown[employeeKey].groupings[projectKey].label,
 //          "employee": groupingsDown[employeeKey].label,
 //          "week": groupingsAcross[weekKey].label
 //        }
        
 //        employeeCell = sheet.getRange(carrierID+1,1)
 //        projectCell = sheet.getRange(carrierID+1,2)
 //        weekCell = sheet.getRange(carrierID+1,3)
 //        valueCell = sheet.getRange(carrierID+1,4)
 //        employeeCell.setValue(data[key].employee)
 //        projectCell.setValue(data[key].project)
 //        weekCell.setValue(data[key].week)
 //        valueCell.setValue(factMap[key].aggregates[0].value)
 //        carrierID++
 //      }
 //    }


}