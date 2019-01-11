const range = (start, end) => Array.from({length: (end - start)}, (_, k) => k + start)

// https://stackoverflow.com/questions/4856717/javascript-equivalent-of-pythons-zip-function
const zip = (...rows) => [...rows[0]].map((_,c) => rows.map(row => row[c]))

module.exports = { range, zip }