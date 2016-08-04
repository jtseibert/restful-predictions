/**
* parser.js
* @desc parse a xls sheet from sf

*/
var xlsx = require('xlsx')
var moment = require('moment')

var parseExcelSheet = function(b64String) {
	var workbook = xlsx.read(b64String, {type: 'base64'})
	var sheet 	 = workbook.Sheets[workbook.SheetNames[2]]
	var indexes = {
		rowStart: 18,
		colStart: 28,
		dateRow: 17,
		subTotalRow: 60
	}
	var sheetData = {}
	var colEnd = getColumnLimit(sheet, indexes.subTotalRow, indexes.colStart, 3)
	//var initialDate = getCellValue(sheet, indexes.dateRow, indexes.colStart, 'w')
	// Iterate over the roles column until subtotal is reached
	//	* For each role, grab each estimated hour for each week date
	//  * If a role, date, or hour is empty, do nothing
	while(getCellValue(sheet, indexes.rowStart, 1, 'v') != 'Subtotal') {
		var role = getCellValue(sheet, indexes.rowStart, 1, 'v')
		if(role != '') {
			sheetData[role] = {}
			for(var i = indexes.colStart; i < colEnd; i++) {
				var date = moment(new Date(getCellValue(sheet, indexes.dateRow, i, 'w')))
						   .format('MM/DD/YYYY')
				if(date != '') {
					var hours = getCellValue(sheet, indexes.rowStart, i, 'v')
					if(hours != '') {
						sheetData[role][date] = hours
					}
				}
			}
		}
		indexes.rowStart += 1
	}
	console.log(sheetData)
}

function getCellValue(sheet, row, col, type) {
	if(sheet[xlsx.utils.encode_cell({r:row,c:col})] != undefined) {
		return sheet[xlsx.utils.encode_cell({r:row,c:col})][type]
	} else {
		return ''
	}
}

// Search for n consecutive 0.00's in the 'Subtotal' row
function getColumnLimit(sheet, subTotalRow, colStart, n) {
	// Verify correct row
	if(getCellValue(sheet, subTotalRow, 1, 'v') != 'Subtotal') {
		return 0
	}
	var colEnd
	var currentCol = colStart
	var done = false
	var consecutiveCheck = true
	while(!done) {
		for(var i = currentCol; i < currentCol + n; i++) {
			consecutiveCheck = consecutiveCheck && (getCellValue(sheet, subTotalRow, i, 'v') == 0.00)
		}
		// When consecutiveCheck == false, there exists at least 1 nonzero value
		if(!consecutiveCheck) {
			currentCol += n
			consecutiveCheck = true
		} else {
			done = true
			colEnd = currentCol
		}
	}
	return colEnd
}

module.exports.parseExcelSheet = parseExcelSheet





