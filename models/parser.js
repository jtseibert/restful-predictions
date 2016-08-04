/**
* parser.js
* @desc parse a xls sheet from sf

*/
var xlsx = require('xlsx')

var parseExcelSheet = function(b64String) {
	var workbook = xlsx.read(b64String, {type: 'base64'})
	var sheet 	 = workbook.Sheets[workbook.SheetNames[2]]
	var indexes = {
		rowStart: 18,
		colStart: 28,
		dateRow: 17,
		subTotalRow: 60
	}
	var projectSizeData = {}
	var stopIndex = getColumnLimit(sheet, indexes.subTotalRow, 3)
	console.log(stopIndex)
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
	//console.log(projectSizeData)
}

function getCellValue(sheet, row, col, type) {
	if(sheet[xlsx.utils.encode_cell({r:row,c:col})] != undefined) {
		return sheet[xlsx.utils.encode_cell({r:row,c:col})][type]
	} else {
		return ''
	}
}

// Search for n consecutive 0.00's in the 'Subtotal' row
function getColumnLimit(sheet, subTotalRow, n) {
	// Verify correct row
	if(getCellValue(sheet, subTotalRow, 1, 'v') != 'Subtotal') {
		return 0
	}
	var stopIndex
	var currentCol = 1
	var done = false
	var continue_ = true
	while(!done) {
		for(var i = currentCol; i < currentCol + n; i++) {
			continue_ = continue_ && (getCellValue(sheet, subTotalRow, i, 'v') == '0.00')
		}
		if(continue_) {
			currentCol += n
		} else {
			done = true
			stopIndex = currentCol
		}
	}
	return stopIndex
}

module.exports.parseExcelSheet = parseExcelSheet





