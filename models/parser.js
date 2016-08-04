/**
* @module Parser
* @desc Scrapes estimated forecasted hours for each role and week from
ESTIMATE xlsx file.
*/
var xlsx = require('xlsx')
var moment = require('moment')

/**
* @function parseExcelSheet
* @desc Returns a JSON formatted object of estimated forecasted hours for role/
week combinations from a base64 encoded string. The base64 string is converted into a 
xlsx workbook object for parsing using the xlsx library.
* @param {string} - b64String - base64 encoded string from SalesForce
*/
var parseExcelSheet = function(b64String) {
	var workbook = xlsx.read(b64String, {type: 'base64'})
	console.log(JSON.stringify(workbook.Props))
	// Validate sheet at index 2 is 'Estimate'
	if(workbook.Props.SheetNames[2] != 'Estimate') {
		return undefined
	}
	var sheet 	 = workbook.Sheets[workbook.SheetNames[2]]
	// Template indexes are hardcoded here
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
	return sheetData
}

/**
* @function getCellValue
* @desc Return the value of cell (row, col) in the sheet.
* @param {worksheet} sheet - xlsx sheet object
* @param {int} row - row of cell
* @param {int} col - column of cell
* @param {string} type - type of data returned E.G v (raw) or w (formatted)
*/
function getCellValue(sheet, row, col, type) {
	if(sheet[xlsx.utils.encode_cell({r:row,c:col})] != undefined) {
		return sheet[xlsx.utils.encode_cell({r:row,c:col})][type]
	} else {
		return ''
	}
}

/**
* @function getColumnLimit
* @desc Determines the stop point for each row iteration by scanning for
n consecutive 0.00 values in the subtotal row.
* @param {worksheet} sheet - xlsx sheet object
* @param {int} subTotalRow - numeric index of the row for subtotals
* @param {int} colStart - numeric index of column where subtotal data begins
* @param {int} n - number of consecutive 0.00 values before stop
*/
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





