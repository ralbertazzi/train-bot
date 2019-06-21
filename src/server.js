const express = require('express')
const moment = require('moment')
const bodyParser = require('body-parser');
const getTrenitaliaSolutions = require('./trenitalia')
const getItaloSolutions = require('./italo')

function sortSolutionsByDepartureTime(solutions)
{
    solutions.sort((s1, s2) => s1.departuretime.diff(s2.departuretime))
}

function parseInputDate(input_date)
{
    return moment(input_date, ['D/M/YYYY', 'D/M'], true)
}

function build_server()
{
    var app = express();

    app.use(bodyParser.json());
    
    app.post('/trains', async function(request, response){

        let { startStation, endStation, date } = request.body
        date = parseInputDate(date)
        
        let solutions = await Promise.all([
            getTrenitaliaSolutions(startStation, endStation, date),
            getItaloSolutions(startStation, endStation, date)
        ])
    
        solutions = [].concat.apply([], solutions)
        sortSolutionsByDepartureTime(solutions)

        solutionsJson = solutions.map(s => s.toJson())
        response.send(solutionsJson);
    });

    return app
}


module.exports = build_server