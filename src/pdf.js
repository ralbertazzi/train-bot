const PdfPrinter = require('pdfmake');

// Define font files
var fonts = {
    Helvetica: {
      normal: 'Helvetica',
      bold: 'Helvetica-Bold',
      italics: 'Helvetica-Oblique',
      bolditalics: 'Helvetica-BoldOblique'
    }
}

const TIME_COLUMNM_NAME = 'Time'

function solutionsToPdf(startStation, endStation, days, solutions_by_day)
{
    var printer = new PdfPrinter(fonts);

    let headers = days.map(d => { return { text: d.format('ddd DD/MM'), style: 'tableHeader' } })
    headers = [TIME_COLUMNM_NAME].concat(headers)

    let solutions = [].concat.apply([], solutions_by_day)
    let solutions_aggregate = {}

    for(let solution of solutions)
    {
        let key = solution.tableKey()
        if (key in solutions_aggregate)
            solutions_aggregate[key].push(solution)
        else
            solutions_aggregate[key] = [solution]
    }

    let times = Object.keys(solutions_aggregate)
    times.sort()

    let rows = times.map(time => {
        let time_solutions = solutions_aggregate[time]
        return headers.map(h => {

            if (h == TIME_COLUMNM_NAME)
                return time

            for (let ts of time_solutions)
            {
                if (ts.getDay() == h.text)
                    return ts.formattedPrice()
            }

            return ''
        })
    })

    var docDefinition = {
        content: [
            `${startStation} -> ${endStation}`,
            {
                table: {
                    headerRows: 1,
                    body: [headers].concat(rows)
                },
                layout: 'lightHorizontalLines'
            },
        ],
        styles: {
            tableHeader: {
                bold: true,
                fontSize: 13,
                color: 'black'
            }
        },
        defaultStyle: {
            font: 'Helvetica'
        }
    };
    
    var pdfDoc = printer.createPdfKitDocument(docDefinition);
	pdfDoc.end();

    return pdfDoc
}

module.exports = solutionsToPdf