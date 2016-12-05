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
		flagCol: 4,
		projectedHrs: 0,
		projectedHrsCol: 0
	}

	// Get the estimate sheet from the workbook
	getEstimateSheet(xlsx.read(body.b64, {type: 'base64'}), function( error, sheet, sheetNum) {
		// Return if the estimate sheet isn't found
		if ( error ) {
			process.nextTick(function(){ callback(null, undefined) }) }
		else {
			// Estimate sheet was found, proceed
			var sheet = sheet

			// Get the bottom row of the data and the header
			async.parallel({
				one: async.apply(getBottomRow, sheet, indexes),
				two: async.apply(getHeaderStart, sheet, indexes)
			}, function(error, results) {
				// Return if either the bottom row or header weren't found
				if (error) { process.nextTick(function(){ callback(error, undefined) })}
				else {
					// Bottom row and header were found, proceed
					// Set indexes that were found above
					indexes.bottomRow = results.one
					indexes.topRow = results.two
					indexes.dataRowStart = results.two + 1
					indexes.projectedHrs = getCellValue(sheet, indexes.bottomRow, indexes.projectedHrsCol, 'v')

					console.log(indexes.projectedHrs)

					// Parse the sheet if valid
					if(!sheetIsValidFormat(workbook, sheet, indexes)) {
						process.nextTick(function(){ callback(null, undefined) })
					} else {
						// Sheet is valid, proceed
						var sheetData = {},
							colEnd,
							year

						// Get limits of the allocation area of the spreadsheet
						async.parallel({
							one: async.apply(getColumnLimit, sheet, indexes, indexes.dataColStart, 3),
							two: async.apply(getYear, sheet, indexes),
							three: async.apply(getColumnStart, sheet, indexes.topRow)
						}, function(error, results) {
							// Return if the indexes were not found
							if (error) { process.nextTick(function(){ callback(error, undefined) }) }
							else {
								// Indexes were found, set and proceed
								console.log('results.three: '+results.three)
								colEnd = results.one
								year = results.two
								indexes.dataColStart = results.three
								// Calculate the startDate from mm/dd on sheet
								var startDate = moment(new Date(getCellValue(sheet, indexes.topRow, indexes.dataColStart, 'w') + '/' + year))
												   .format('MM/DD/YYYY')

								// Get allocation information per role and assign in JSON
								async.whilst(
									function(){ return getCellValue(sheet, indexes.dataRowStart, 1, 'v') != 'Subtotal' },
									function(callback){
										var role = getCellValue(sheet, indexes.dataRowStart, 1, 'v')
										// Check if a role name was found on the row
										if(role != '') {
											// Role was found, set Role
											role = mapRole(role)
											// Check if this is the first of this role found
											if(!sheetData[role]) {
												// Create a key for the role in the JSON
												sheetData[role] = {}
											}
											// Create key for THIS role in the JSON by using the row number
											sheetData[role][indexes.dataRowStart] = {}

											// Build the allocation JSON
											var weekOffset = 0
											// Get all week allocations from the columns in the spreadsheet

											console.log('colEnd: '+colEnd)
											console.log('colStart'+indexes.dataColStart)
											console.log('number of cols: '+(colEnd-indexes.dataColStart))

											async.times(colEnd-indexes.dataColStart, function(n, next){
												var hours = getCellValue(sheet, indexes.dataRowStart, indexes.dataColStart+n, 'v')
												/*
												* Check if hours were found
												* assign hours and weekOffset to THIS role if found
												* else increment weekOffset and continue
												*/
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
												// Move to the next Row(Role) in the spreadsheet
												indexes.dataRowStart++
												process.nextTick(callback)
											})
										} else {
											// A role name was not found on this row, increment and move to next Row
											indexes.dataRowStart++
											process.nextTick(callback)
										}
									}, function(error){
										if (error) {  process.nextTick(function(){ callback(error) }) }
										// Create the JSON to be returned
										var opportunityData = {
											sheetData: 			sheetData,
											opportunityName: 	body.opportunityName,
											startDate: 			startDate
										}
										process.nextTick(function(){ callback(null, opportunityData) })
									}
								)
							}
						})
					}
				}
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
		indexQA = splitRole.indexOf('QA')

	// Check for Sr.
	if(indexSr > -1) {
		splitRole[indexSr] = 'Senior'
		//mappedRole = Array.prototype.join.call(splitRole, ' ')
	}

	// Check for QA
	if(indexQA > -1) {
		splitRole[indexQA] = 'Quality Assurance'
		//mappedRole = Array.prototype.join.call(splitRole, ' ')
	}

	// Check for Senior or Associate prefix
	if(splitRole[0] == 'Senior' || splitRole[0] == 'Associate') {
		var temp = splitRole[0]
		splitRole.shift()
		splitRole[splitRole.length] = splitRole[splitRole.length] + ','
		splitRole.push(temp)
		//mappedRole = splitRole + ', ' + temp
	}

	return (Array.prototype.join.call(splitRole, ' ')).replace('*','')
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
function getColumnLimit(sheet, indexes, dataColStart, num, callback) {	
	var colEnd,
		sheet = sheet,
		currentCol = dataColStart,
		done = false,
		hoursCount = 0

	async.whilst(
		function() { return !done },
		function(callback) {

			// Get the projected hours for the current week
			var weeklyHrs = getCellValue(sheet, indexes.bottomRow + 1, currentCol, 'v')
			console.log('weeklyHrs: '+weeklyHrs+', weeklyHrs == "" -> '+(weeklyHrs === ''))
			// Check if we have reached the end of the sheet, returning ''
			if ( weeklyHrs === '' ) {
				done = true
				colEnd = currentCol
				process.nextTick(function(){ callback(null, done) })
			} else {

				// Add the projected hours for the week to the hours count
				hoursCount += parseInt( weeklyHrs )

				// Check if we have hit all of the projected hours
				if ( hoursCount == indexes.projectedHrs ) {
					done = true
					colEnd = currentCol
					process.nextTick(function(){ callback(null, done) })
				} else {
					// Increment to the next week
					currentCol++
					process.nextTick(function(){ callback(null, done) })
				}
			}

		}, function(error, done) {
			if (error) { process.nextTick(function(){ callback(error, null) }) }
			console.log('in callback: '+colEnd)
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
		max = 150,
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
		found = false,
		xSheet = sheet

	async.whilst(
		function(){ return (maxIter < 10 && !found) },
		function(callback) {

			if(getCellValue(xSheet, rowStart+maxIter, indexes.topCol, 'v').startsWith('Role')) {
				found = true
				var sheet  = xSheet
				var headerRow = rowStart+maxIter
				async.detect([indexes.topCol, indexes.topCol+1, indexes.topCol+2, indexes.topCol+3, indexes.topCol+4, indexes.topCol+5],
					function(col, callback) {
						if ( getCellValue(sheet, headerRow, col, 'v').indexOf('Hours') > -1 ) {
							process.nextTick(function(){ callback(null, true) })
						}
					}, function(error, result) {
						if ( result ) {
							tempIndex = result
							indexes.projectedHrsCol = result
						}
					})
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
* @function getSheetTabNumber
* @desc Get and then set the proper sheet of the estimate workbook
* @param wb
* @returns {sheet} the estimate sheet in the workbook
*/
function getEstimateSheet(wb, callback) {
	var workbook = wb
	async.detect(workbook.SheetNames, function(sheetName, callback) {
		if ( sheetName.toLowerCase() == 'estimate' ) {
			process.nextTick(function(){ callback(null, true) })
		}
	}, function(error, result) {
		if ( result ) {
			process.nextTick(function(){
				callback(null, workbook.Sheets[result])
			})
		} else {
			process.nextTick(function(){
				callback(new Error('Could not find Estimate tab in spreadsheet'), null)
			})
		}
	})
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
		//0: (workbook.Props.SheetNames[2] == 'Estimate'),
		0: (getCellValue(sheet, indexes.topRow, indexes.topCol, 'v').startsWith('Role')), // test first 4 chars
		1: (getCellValue(sheet, indexes.topRow, indexes.topCol + 1, 'v').startsWith('Resp')),// test first 4 chars
		2: (getCellValue(sheet, indexes.bottomRow, indexes.topCol, 'v') == 'Subtotal'),
		3: (getCellValue(sheet, indexes.flagRow, indexes.flagCol, 'v').toUpperCase() != 'DO NOT UPDATE')
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






