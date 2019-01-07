const request = require('request')
const rp = require('request-promise-native')
const moment = require('moment')

const apiUrl = "https://www.lefrecce.it/msite/api/"

const range = (start, end) => Array.from({length: (end - start)}, (_, k) => k + start)

// https://stackoverflow.com/questions/4856717/javascript-equivalent-of-pythons-zip-function
const zip = (...rows) => [...rows[0]].map((_,c) => rows.map(row => row[c]))

function getMinPrice(idsolution, cookieJar)
{
    return rp({
        uri: `${apiUrl}/solutions/${idsolution}/standardoffers`,
        jar: cookieJar
    })
    .then(body => {
        let details = JSON.parse(body);
        let servicelist = details.leglist[0].servicelist

        let available = false
        let min_offer = { price: 100000 }

        for (let service of servicelist)
            if (service.offerlist)
            {
                for (let offer of service.offerlist)
                    if (offer.saleable && offer.available > 0 && offer.name != 'Senior da 60anni' && offer.price < min_offer.price)
                    {
                        min_offer = {
                            name: `${service.name} - ${offer.name}`,
                            price: offer.price
                        }
                        available = true
                    }
            }

        
        if (available)
            return min_offer
        else
            return null
    })
    .catch(err => {
        return null;
    })
}

function getSolutions(partenza, arrivo, data, ora) {

    const cookieJar = request.jar()

    return rp({
        uri: apiUrl + "solutions",
        jar: cookieJar,
        qs: {
            origin: partenza,
            destination: arrivo,
            adate: data,
            atime: ora.toString(),
            adultno: 1,
            childno: 0,
            arflag: "A",
            direction: "A",
            frecce: "true",
            onlyRegional: "false",
        }
    })
    .then(async body => {
        let solutions = JSON.parse(body)
        
        solutions.forEach(solution => {
            solution.departuretime = moment(solution.departuretime, 'x')
            solution.arrivaltime = moment(solution.arrivaltime, 'x')
        })

        solutions = solutions.filter(solution => solution.departuretime.hour() == ora)

        let details = await Promise.all(solutions.map(s => getMinPrice(s.idsolution, cookieJar)))

        return zip(solutions, details).map(data => {
            const solution = data[0], offer = data[1]
            return {
                arrivaltime: solution.arrivaltime,
                departuretime: solution.departuretime,
                offer: offer.name,
                price: offer.price,
                duration: solution.duration
            }
        })
    })
    .catch(err => {
        return null;
    });
}

async function getTrenitaliaSolutions(date)
{
    let solutions = await Promise.all(range(6, 24).map(n => getSolutions("MILANO CENTRALE", "BOLOGNA CENTRALE", date, n)))
    solutions = [].concat.apply([], solutions)
    return solutions.filter(s => s != null)
}

module.exports = getTrenitaliaSolutions
