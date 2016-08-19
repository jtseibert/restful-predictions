//*************************************
/**
* @module Parser
* @desc Scrapes estimated forecasted hours for each role and week from
ESTIMATE xlsx file.
*/
//*************************************
var xlsx = require('xlsx')
var moment = require('moment')
var helpers = require('./helpers')
//*************************************

/**
* @function parseExcelSheet
* @desc Returns a JSON formatted object of estimated forecasted hours for role/
week combinations from a base64 encoded string. The base64 string is converted into a 
xlsx workbook object for parsing using the xlsx library.
* @param {string} - body - https body from SalesForce
* @param callback - callback function to handle xlsx data
* @returns JSON format object of estimated forecasted hours for each role/week, and opportunity name
*/
var parseExcelSheet = function(body, callback) {
	var workbook = xlsx.read(body.b64, {type: 'base64'})	
	var sheet 	 = workbook.Sheets[workbook.SheetNames[2]]
	// Template indexes are hardcoded here
	// Top row/col refers to upper left cell B18
	// Bottom row/col refers to lower right cell I61
	var indexes = {
		dataRowStart: 18,
		dataColStart: 28,
		topRow: 17,
		topCol: 1,
		bottomRow: 0,
		bottomCol: 8,
		flagRow: 0,
		flagCol: 4
	}
	var temp = getBottomRow(sheet, indexes)
	indexes.bottomRow = temp

	// Parse the sheet if valid
	if(!sheetIsValidFormat(workbook, sheet, indexes)) {
		helpers.errorLog(new Error('attachment failed to validate')
		console.log('sheet failed to validate')
		callback(undefined)
	} else {
		var sheetData = {}
		var colEnd = getColumnLimit(sheet, indexes.bottomRow, indexes.dataColStart, 3)
		var year = getYear(sheet, indexes)

		// Iterate over the roles column until subtotal is reached
		//	* For each role, grab each estimated hour for each week date
		//  * If a role, date, or hour is empty, do nothing
		while(getCellValue(sheet, indexes.dataRowStart, indexes.topCol, 'v') != 'Subtotal') {
			var role = getCellValue(sheet, indexes.dataRowStart, indexes.topCol, 'v')
			if(role != '') {
				role = mapRole(role)
				if(!sheetData[role]) {
					sheetData[role] = {}
				}
				for(var i = indexes.dataColStart; i < colEnd; i++) {
					var date = moment(new Date(getCellValue(sheet, indexes.topRow, i, 'w') + '/' + year))
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
		var opportunityData = {
			sheetData: sheetData,
			opportunityName: body.opportunityName
		}
		callback(opportunityData)
	}
}

module.exports.parseExcelSheet = parseExcelSheet
//*************************************

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
//*************************************

/**
* @function getYear
* @desc Determines year from current month and opportunity start month.
Assumes forecast will not be more than 1 year out.
* @param {worksheet} sheet - xlsx sheet object
* @param indexes - JSON formatted object of numeric indexes of key rows/cols
*/
function getYear(sheet, indexes) {
	var opportunityDate = getCellValue(sheet, indexes.topRow, indexes.dataColStart, 'w')
	var opportunityMonth = opportunityDate.split('/')[0]
	var opportunityYear

	var today = new Date()
	var currentMonth = today.getMonth()
	var currentYear = today.getFullYear()

	if(currentMonth - opportunityMonth < 0) {
		opportunityYear = currentYear
	} else {
		opportunityYear = currentYear + 1
	}
	return opportunityYear
}
//*************************************

/**
* @function mapRole
* @desc Maps any conflict roles to match the Heroku database list of roles.
* @param {string} role - role to be mapped
* @returns {string} mappedRole - new or same role
*/
function mapRole(role) {
	// Check for trailing and leading whitespace
	var mappedRole = role.trim()
	// Check for * in the last character
	if(mappedRole.slice(-1) == '*') {
		mappedRole = mappedRole.substring(0, mappedRole.length - 1)
	}

	// Check for Senior or Associate prefix
	var splitRole = mappedRole.split(' ')
	if(splitRole[0] == 'Senior' || splitRole[0] == 'Associate') {
		var temp = splitRole[0]
		splitRole.shift()
		splitRole = Array.prototype.join.call(splitRole, ' ')
		mappedRole = splitRole + ', ' + temp
	}

	// Check for QA
	splitRole = mappedRole.split(' ')
	if(splitRole[0] == 'QA') {
		splitRole.shift()
		splitRole = Array.prototype.join.call(splitRole, ' ')
		mappedRole = 'Quality Assurance ' + splitRole

	}
	return mappedRole
}
//*************************************

/**
* @function getColumnLimit
* @desc Determines the stop point for each row iteration by scanning for
n consecutive 0.00 values in the subtotal row.
* @param {worksheet} sheet - xlsx sheet object
* @param {int} bottomRow - numeric index of the row for subtotals
* @param {int} dataColStart - numeric index of column where subtotal data begins
* @param {int} n - number of consecutive 0.00 values before stop
* @returns {int} colEnd - numeric index of last column of row data
*/
function getColumnLimit(sheet, bottomRow, dataColStart, n) {	
	var colEnd
	var currentCol = dataColStart
	var done = false
	var consecutiveCheck = true
	while(!done) {
		for(var i = currentCol; i < currentCol + n; i++) {
			consecutiveCheck = consecutiveCheck && (getCellValue(sheet, bottomRow, i, 'v') == 0.00)
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
//*************************************

/**
* @function getBottomRow
* @desc Finds numeric row index of cell with value 'Subtotal'.
* @param {worksheet} sheet - xlsx worksheet object
* @param indexes - JSON formatted object of numeric indexes of key rows/cols
* @returns numeric row index of cell containing 'Subtotal'
*/
function getBottomRow(sheet, indexes) {
	var bottomRow = indexes.topRow
		max = 75
	while(bottomRow < max) {
		if(getCellValue(sheet, bottomRow, indexes.topCol, 'v') == 'Subtotal') {
			return bottomRow
		} else {
			bottomRow++
		}
	}
	return 0
}
//*************************************

/**
* @function sheetIsValidFormat
* @desc Validates the sheet format.
* @param {workbook} workbook - xlsx workbook object
* @param {worksheet} sheet - xlsx worksheet object
* @param indexes - JSON formatted object of numeric indexes of key rows/cols
* @returns true/false sheet valid status
*/
function sheetIsValidFormat(workbook, sheet, indexes) {
	var isValid = true
	var tests = {
		0: (workbook.Props.SheetNames[2] == 'Estimate'),
		1: (getCellValue(sheet, indexes.topRow, indexes.topCol, 'v') == 'Role*'),
		2: (getCellValue(sheet, indexes.topRow, indexes.topCol + 1, 'v') == 'Responsibilities'),
		3: (getCellValue(sheet, indexes.topRow, indexes.bottomCol, 'v') == 'Projected Non-Billable Revenue'),
		4: (getCellValue(sheet, indexes.bottomRow + 1, indexes.bottomCol, 'v') == 'Total Cost'),
		5: (getCellValue(sheet, indexes.bottomRow, indexes.topCol, 'v') == 'Subtotal'),
		6: (getCellValue(sheet, indexes.flagRow, indexes.flagCol, 'v').toUpperCase() != 'DO NOT UPDATE')
	}

	for(var test in tests) {
		console.log('test '+test+' is: '+tests[test])
		isValid = isValid && tests[test]
	}
	return isValid
}
//*************************************






