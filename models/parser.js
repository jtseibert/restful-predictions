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
	var lastCol = getColumnLimit(sheet, indexes.subTotalRow, indexes.colStart, 3)
	var initialDate = getCellValue(sheet, indexes.dateRow, indexes.colStart, 'w')
	console.log(initialDate)
	console.log(lastCol)
	/*while(checkCell(sheet, rowStart, 1, 'v') != 'Subtotal') {
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
	}*/
	//console.log(projectSizeData)
}

function getCellValue(sheet, row, col, type) {
	if(sheet[xlsx.utils.encode_cell({r:row,c:col})] != undefined) {
		console.log(JSON.stringify(sheet[xlsx.utils.encode_cell({r:row,c:col})]))
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
	var lastCol
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
			lastCol = currentCol
		}
	}
	return lastCol
}

module.exports.parseExcelSheet = parseExcelSheet





