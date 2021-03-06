const request = require('request')
const rp = require('request-promise-native')
const moment = require('moment')
const Solution = require('./solution')
const { range, zip } = require('./utils')

/**
 * See Api usage:
 *  https://github.com/SimoDax/Trenitalia-API/wiki/API-Trenitalia---lefrecce.it
 *  https://github.com/TrinTragula/api-trenitalia
 */ 

const apiUrl = "https://www.lefrecce.it/msite/api/"

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
        return null
    })
}

async function getSolutions(partenza, arrivo, data, ora) {

    const cookieJar = request.jar()

    try {
        const body = await rp({
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
        });
        let solutions = JSON.parse(body);
        solutions.forEach(solution => {
            solution.departuretime = moment(solution.departuretime, 'x');
            solution.arrivaltime = moment(solution.arrivaltime, 'x');
        });
        solutions = solutions.filter(solution => solution.departuretime.hour() == ora);
        let details = await Promise.all(solutions.map(s => getMinPrice(s.idsolution, cookieJar)));
        return zip(solutions, details).map(data => {
            const solution = data[0], offer = data[1];
            return new Solution(solution.departuretime, solution.arrivaltime, 'FS', offer.name, offer.price)
        })
    }
    catch (err) {
        return null;
    }
}

async function getTrenitaliaSolutions(startStation, endStation, date)
{
    date = date.format('DD/MM/YYYY')
    let solutions = await Promise.all(range(6, 24).map(n => getSolutions(startStation, endStation, date, n)))
    solutions = [].concat.apply([], solutions)
    return solutions.filter(s => s != null)
}

module.exports = getTrenitaliaSolutions
