/**
* parser.js
* @desc parse a xls sheet from sf

*/
var xlsx = require('xlsx')

var parseExcelSheet = function(b64String) {
	var workbook = xlsx.read(b64String, {type: 'base64'})
	var sheet 	 = workbook.Sheets[workbook.SheetNames[2]]
	
	var rowStart = 18,
	  	colStart = 28,
	  	dateRow = 17
	var projectSizeData = {}

	while(checkCell(sheet, rowStart, 1, 'v') != 'Subtotal') {
		var cellValue = checkCell(sheet, rowStart, 1, 'v')
		//console.log("cell val is " + cellValue)
		if(cellValue != '') {
			projectSizeData[cellValue] = {}
			var date
			for(var i = 0; i < 19; i++) {//temp 
				date = checkCell(sheet, dateRow, colStart+i, 'w')
				if(date != '') {
					projectSizeData[cellValue][date] = checkCell(sheet, rowStart, colStart+i, 'v')
				}
			}
		}
		rowStart++
	}
	console.log(projectSizeData)
}

function checkCell(sheet, row, col, type) {
	if(sheet[xlsx.utils.encode_cell({r:row,c:col})] != undefined) {
		console.log("inner val is " + sheet[xlsx.utils.encode_cell({r:row,c:col})][type])
		return sheet[xlsx.utils.encode_cell({r:row,c:col})][type]
	} else {
		return ''
	}
}

module.exports.parseExcelSheet = parseExcelSheet





