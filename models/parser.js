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
* @returns JSON format object of estimated forecasted hours for each role/week
*/
var parseExcelSheet = function(b64String, callback) {
	// Create xlsx objects and determine indexes
	var workbook = xlsx.read(b64String, {type: 'base64'})	
	var sheet 	 = workbook.Sheets[workbook.SheetNames[2]]
	// Template indexes are hardcoded here
	var indexes = {
		dataRowStart: 18,
		dataColStart: 28,
		headerRow: 17,
		headerCol: 1,
		subTotalIndex: 0
	}
	var temp = getSubTotalIndex(sheet, indexes)
	indexes[subTotalIndex] = temp
	console.log(indexes.subTotalIndex)

	// Parse the sheet if valid
	if(!sheetIsValidFormat(workbook, sheet, indexes)) {
		console.log('invalid format')
		callback(undefined)
	} else {
		var sheetData = {}
		var colEnd = getColumnLimit(sheet, indexes.subTotalRow, indexes.dataColStart, 3)
		//var initialDate = getCellValue(sheet, indexes.headerRow, indexes.dataColStart, 'w')
		// Iterate over the roles column until subtotal is reached
		//	* For each role, grab each estimated hour for each week date
		//  * If a role, date, or hour is empty, do nothing
		while(getCellValue(sheet, indexes.dataRowStart, 1, 'v') != 'Subtotal') {
			var role = getCellValue(sheet, indexes.dataRowStart, 1, 'v')
			if(role != '') {
				sheetData[role] = {}
				for(var i = indexes.dataColStart; i < colEnd; i++) {
					var date = moment(new Date(getCellValue(sheet, indexes.headerRow, i, 'w')))
							   .format('MM/DD/YYYY')
					if(date != '') {
						var hours = getCellValue(sheet, indexes.dataRowStart, i, 'v')
						if(hours != '') {
							sheetData[role][date] = hours
						}
					}
				}
			}
			indexes.dataRowStart += 1
		}
		callback(sheetData)
	}
}

/**
* @function getCellValue
* @desc Return the value of cell (row, col) in the sheet.
* @param {worksheet} sheet - xlsx sheet object
* @param {int} row - row of cell
* @param {int} col - column of cell
* @param {string} type - type of data returned E.G v (raw) or w (formatted)
* @returns Value of cell of (row, col)
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
* @param {int} dataColStart - numeric index of column where subtotal data begins
* @param {int} n - number of consecutive 0.00 values before stop
* @returns {int} colEnd - numeric index of last column of row data
*/
function getColumnLimit(sheet, subTotalRow, dataColStart, n) {	
	var colEnd
	var currentCol = dataColStart
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

/**
* @function getSubTotalIndex
* @desc Finds numeric row index of cell with value 'Subtotal'.
* @param {worksheet} sheet - xlsx worksheet object
* @param indexes - JSON formatted object of numeric indexes of key rows/cols
* @returns numeric row index of cell containing 'Subtotal'
*/
function getSubTotalIndex(sheet, indexes) {
	var subTotalIndex = indexes.headerRow
		max = 75
	while(subTotalIndex < max) {
		if(getCellValue(sheet, subTotalIndex, indexes.headerCol, 'v') == 'Subtotal') {
			return subTotalIndex
		} else {
			subTotalIndex++
		}
	}
	return 0
}

/**
* @function sheetIsValidFormat
* @desc Validates the sheet format.
* @param {workbook} - xlsx workbook object
* @param {worksheet} - xlsx worksheet object
* @param indexes - JSON formatted object of numeric indexes of key rows/cols
* @returns true/false sheet valid status
*/
function sheetIsValidFormat(workbook, sheet, indexes) {
	var valid = true
	// Validate sheet at index 2 is 'Estimate'
	if(workbook.Props.SheetNames[2] != 'Estimate') 
		valid = false

	// Verify Role* column
	if(getCellValue(sheet, indexes.headerRow, indexes.headerCol, 'v') != 'Role*')
		valid = false

	// Verify Responsibilities column
	if(getCellValue(sheet, indexes.headerRow, indexes.headerCol + 1, 'v') != 'Responsibilities')
		valid = false

	// Verify label cells "Total Cost" and "Total Billable"
	if(getCellValue(sheet, indexes.subTotalRow + 1, indexes.dataColStart - 1, 'v') != 'Total Cost')
		valid = false

	if(getCellValue(sheet, indexes.subTotalRow + 2, indexes.dataColStart - 2, 'v') != 'Total Billable')
		valid = false

	// Verify subtotal row
	if(getCellValue(sheet, indexes.subTotalRow, indexes.headerCol, 'v') != 'Subtotal')
		valid = false

	return valid
}

module.exports.parseExcelSheet = parseExcelSheet





