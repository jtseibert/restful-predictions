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
var async = require('async')
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

	async.parallel({
		one: async.apply(getBottomRow, sheet, indexes),
		two: async.apply(getHeaderStart, sheet, indexes)
	}, function(error, results) {
		if (error) { process.nextTick(function(){ callback(error, undefined) })}
		indexes.bottomRow = results.one
		indexes.topRow = results.two
		indexes.dataRowStart = results.two + 1

		// Parse the sheet if valid
		if(!sheetIsValidFormat(workbook, sheet, indexes)) {
			process.nextTick(function(){ callback(null, undefined) })
		} else {
			var sheetData = {},
				colEnd,
				year

			async.parallel({
				one: async.apply(getColumnLimit, sheet, indexes.bottomRow, indexes.dataColStart, 3),
				two: async.apply(getYear, sheet, indexes),
				three: async.apply(getColumnStart, sheet, indexes.topRow)
			}, function(error, results) {
				if (error) { process.nextTick(function(){ callback(error, undefined) }) }
				colEnd = results.one
				year = results.two
				indexes.dataColStart = results.three
				var startDate = moment(new Date(getCellValue(sheet, indexes.topRow, indexes.dataColStart, 'w') + '/' + year))
								   .format('MM/DD/YYYY')

				async.whilst(
					function(){ return getCellValue(sheet, indexes.dataRowStart, 1, 'v') != 'Subtotal' },
					function(callback){
						var role = getCellValue(sheet, indexes.dataRowStart, 1, 'v')
						if(role != '') {
							role = mapRole(role)
							if(!sheetData[role]) {
								sheetData[role] = {}
							}
							sheetData[role][indexes.dataRowStart] = {}

							var weekOffset = 0
							async.times(colEnd-indexes.dataColStart, function(n, next){
								var hours = getCellValue(sheet, indexes.dataRowStart, indexes.dataColStart+n, 'v')
								if (hours != '') {
									sheetData[role][indexes.dataRowStart][weekOffset] = hours
									weekOffset++
									next(null)
								} else {
									weekOffset++
									next(null)
								}
							}, function(error) {
								if (error) { process.nextTick(function(){ callback(error) }) }
								indexes.dataRowStart++
								process.nextTick(callback)
							})
						} else {
							indexes.dataRowStart++
							process.nextTick(callback)
						}
					}, function(error){
						if (error) {  process.nextTick(function(){ callback(error) }) }
						var opportunityData = {
							sheetData: 			sheetData,
							opportunityName: 	body.opportunityName,
							startDate: 			startDate
						}
						process.nextTick(function(){ callback(null, opportunityData) })
					}
				)
			})
		}
	})
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
function getYear(sheet, indexes, callback) {
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
	process.nextTick(function(){ callback(null, opportunityYear) })
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
	var mappedRole = role.trim(),
		splitRole = mappedRole.split(' '),
		indexSr = splitRole.indexOf('Sr.'),
		indexQA = splitRole.indexOf('QA'),
		indexFound
	// Check for * in the last character
	if(mappedRole.slice(-1) == '*') {
		mappedRole = mappedRole.substring(0, mappedRole.length - 1)
	}

	// Check for Sr.
	if(indexSr > -1) {
		splitRole[indexSr] = 'Senior'
		mappedRole = Array.prototype.join.call(splitRole, ' ')
	}

	// Check for Senior or Associate prefix
	if(splitRole[0] == 'Senior' || splitRole[0] == 'Associate') {
		var temp = splitRole[0]
		splitRole.shift()
		splitRole = Array.prototype.join.call(splitRole, ' ')
		mappedRole = splitRole + ', ' + temp
	}

	// Check for QA
	if(indexQA > -1) {
		splitRole[indexQA] = 'Quality Assurance'
		mappedRole = Array.prototype.join.call(splitRole, ' ')
	}

	return mappedRole

	// async.waterfall([
	// 	function(callback) {
	// 		console.log(role)
	// 		var mappedRole = role.trim(),
	// 			splitRole = mappedRole.split(' '),
	// 			indexSr = splitRole.indexOf('Sr.'),
	// 			indexQA = splitRole.indexOf('QA')
	// 		// Check for * in the last character
	// 		if(mappedRole.slice(-1) == '*') {
	// 			mappedRole = mappedRole.substring(0, mappedRole.length - 1)
	// 			process.nextTick(function(){ callback(null, mappedRole, splitRole, indexSr, indexQA) })
	// 		} else {
	// 			process.nextTick(function(){ callback(null, mappedRole, splitRole, indexSr, indexQA) })
	// 		}
	// 	},
	// 	function(mappedRole, splitRole, indexSr, indexQA, callback) {
	// 		// Check for Sr.
	// 		console.log('two: '+mappedRole)
	// 		if(indexSr > -1) {
	// 			splitRole[indexSr] = 'Senior'
	// 			mappedRole = Array.prototype.join.call(splitRole, ' ')
	// 			process.nextTick(function(){ callback(null, mappedRole, splitRole, indexSr, indexQA) })
	// 		} else {
	// 			process.nextTick(function(){ callback(null, mappedRole, splitRole, indexSr, indexQA) })
	// 		}
	// 	},
	// 	function(mappedRole, splitRole, indexSr, indexQA, callback) {
	// 		// Check for Senior or Associate prefix
	// 		console.log('three: '+mappedRole)
	// 		if(splitRole[0] == 'Senior' || splitRole[0] == 'Associate') {
	// 			var temp = splitRole[0]
	// 			splitRole.shift()
	// 			splitRole = Array.prototype.join.call(splitRole, ' ')
	// 			mappedRole = splitRole + ', ' + temp
	// 			process.nextTick(function(){ callback(null, mappedRole, splitRole, indexSr, indexQA) })
	// 		} else {
	// 			process.nextTick(function(){ callback(null, mappedRole, splitRole, indexSr, indexQA) })
	// 		}
	// 	},
	// 	function(mappedRole, splitRole, indexSr, indexQA, callback) {
	// 		// Check for QA
	// 		console.log('four: '+mappedRole)
	// 		if(indexQA > -1) {
	// 			splitRole[indexQA] = 'Quality Assurance'
	// 			mappedRole = Array.prototype.join.call(splitRole, ' ')
	// 			process.nextTick(function(){ callback(null, mappedRole) })
	// 		} else {
	// 			process.nextTick(function(){ callback(null, mappedRole) })
	// 		}
	// 	}
	// ], function(error, mappedRole) {
	// 	console.log(mappedRole)
	// 	return mappedRole
	// })
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
function getColumnLimit(sheet, bottomRow, dataColStart, num, callback) {	
	var colEnd
	var currentCol = dataColStart
	var done = false
	var consecutiveCheck = true
	async.whilst(
		function() { return !done },
		function(callback) {
			async.times(num, function(n, next){
				consecutiveCheck = consecutiveCheck && (getCellValue(sheet, bottomRow + 1, n+currentCol, 'v') == 0.00)
				next(null)
			}, function(error) {
				// When consecutiveCheck == false, there exists at least 1 nonzero value
				if(!consecutiveCheck) {
					currentCol += num
					consecutiveCheck = true
					process.nextTick(callback)
				} else {
					done = true
					colEnd = currentCol
					process.nextTick(function(){ callback(null, colEnd) })
				}
			})
		}, function(error, colEnd) {
			if (error) { process.nextTick(function(){ callback(error, null) }) }
			process.nextTick(function(){ callback(null, colEnd) })
		}
	)
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
function getColumnStart(sheet, topRow, callback) {	
	var topRow,
		curCol = 1,
		max = 40,
		found = false,
		curCellValue

	async.whilst(
		function() { return (curCol < max && !found) },
		function(callback) {
			curCellValue = getCellValue(sheet, topRow, curCol, 'v')
			if (curCellValue === parseInt(curCellValue, 10)) {
				found = true
				process.nextTick(function(){ callback(null, found, curCol) })
			} else {
				curCol++
				process.nextTick(function(){ callback(null, found, curCol) })
			}
		}, function(error, found, startCol) {
			if (error) { process.nextTick(function(){ callback(error, null) }) }
			console.log('StartCol: '+startCol)
			process.nextTick(function(){ callback(null, startCol) })
		}
	)
}
//*************************************

/**
* @function getBottomRow
* @desc Finds numeric row index of cell with value 'Subtotal'.
* @param {worksheet} sheet - xlsx worksheet object
* @param indexes - JSON formatted object of numeric indexes of key rows/cols
* @returns numeric row index of cell containing 'Subtotal'
*/
function getBottomRow(sheet, indexes, callback) {
	var bottomRow = indexes.topRow,
		max = 100,
		found = false
	async.whilst(
		function(){ return (bottomRow < max && !found)},
		function(callback){
			if (getCellValue(sheet, bottomRow, indexes.topCol, 'v') == 'Subtotal') {
				found = true
				process.nextTick(function(){ callback(null, found, bottomRow) })
			} else {
				bottomRow++
				process.nextTick(function(){ callback(null, found, bottomRow) })
			}
		}, function(error, found, bottomRow) {
			if (error) { process.nextTick(function(){ callback(error, null) }) }
			else if (found) { process.nextTick(function(){ callback(null, bottomRow) })}
			else { process.nextTick(function(){ callback(new Error('Could not find bottomRow of xlsx'), null) })}

		}
	)
}
//*************************************

/**
* @function getHeaderStart
* @desc Get the row number for the headers in the sheet.
* @param sheet
* @param indexes
* @returns {integer} row number of header start
*/
function getHeaderStart(sheet, indexes, callback) {
	var rowStart = 12,
		maxIter = 0,
		found = false
	async.whilst(
		function(){ return (maxIter < 10 && !found) },
		function(callback) {
			if(getCellValue(sheet, rowStart+maxIter, indexes.topCol, 'v').startsWith('Role')) {
				found = true
				process.nextTick(function(){ callback(null, found, rowStart+maxIter) })
			} else {
				maxIter++
				process.nextTick(function(){ callback(null, found, rowStart+maxIter) })
			}
		}, function(error, found, headerStart) {
			if (error) { process.nextTick(function(){ callback(error, null) }) }
			else if(found) { process.nextTick(function(){ callback(null, headerStart) }) }
			else { process.nextTick(function(){ callback(new Error('Could not find Headers in xlsx'), null) })}
		}
	)
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
	var isValid = true,
		errorDescription = 'Sheet validation test(s) '
	var tests = {
		0: (workbook.Props.SheetNames[2] == 'Estimate'),
		1: (getCellValue(sheet, indexes.topRow, indexes.topCol, 'v').startsWith('Role')), // test first 4 chars
		2: (getCellValue(sheet, indexes.topRow, indexes.topCol + 1, 'v').startsWith('Resp')),// test first 4 chars
		// 3: (getCellValue(sheet, indexes.topRow, indexes.bottomCol, 'v') == 'Projected Non-Billable Revenue'),
		// 4: (getCellValue(sheet, indexes.bottomRow + 1, indexes.bottomCol, 'v') == 'Total Cost'),
		3: (getCellValue(sheet, indexes.bottomRow, indexes.topCol, 'v') == 'Subtotal'),
		4: (getCellValue(sheet, indexes.flagRow, indexes.flagCol, 'v').toUpperCase() != 'DO NOT UPDATE')
	}

	for(var test in tests) {
		if(!tests[test]){
			errorDescription = errorDescription+test+', '
		}
		isValid = isValid && tests[test]
	}
	if(!isValid){
		helpers.errorLog(new Error(''+errorDescription+'failed. See assumptions tab in spreadsheet'))
		return isValid
	} else { return isValid }
}
//*************************************






