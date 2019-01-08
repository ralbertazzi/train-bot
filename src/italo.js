const rp = require('request-promise-native')
const moment = require('moment')
const Solution = require('./solution')

// See API usage: https://github.com/SimoDax/RapidoTreno/blob/master/src/ItaloApiRequest.cpp

const apiUrl = "https://big.ntvspa.it/BIG/v6/rest/BookingManager.svc/GetAvailableTrains"

const ITALO_STATIONS = {
    "BOLOGNA CENTRALE": "BC_",
    "BRESCIA": "BSC",
    "FERRARA": "F__",
    "FIRENZE S. M. NOVELLA": "SMN",
    "MILANO CENTRALE": "MC_",
    "RHO-FIERA MILANO": "RRO",
    "MILANO ROGOREDO": "RG_",
    "NAPOLI CENTRALE": "NAC",
    "PADOVA": "PD_",
    "REGGIO EMILIA AV": "AAV",
    "ROMA TERMINI": "RMT",
    "ROMA TIBURTINA": "RTB",
    "SALERNO": "SAL",
    "TORINO PORTA NUOVA": "TOP",
    "TORINO PORTA SUSA": "OUE",
    "VENEZIA MESTRE": "VEM",
    "VENEZIA S. LUCIA": "VSL",
    "VERONA PORTA NUOVA": "VPN",
    "MILANO ( TUTTE LE STAZIONI )": "MI0",
    "ROMA ( TUTTE LE STAZIONI )": "RM0"
}

function buildSolution(journey)
{
    if (!journey.Fares || journey.Fares.length == 0)
        return null

    let min_price = 10000
    let offer_name = null

    for (let fare of journey.Fares)
    {
        if (fare.FullFarePrice < min_price)
        {
            min_price = fare.FullFarePrice
            offer_name = fare.ClassOfServiceName
        }
    }

    function parseDate(date)
    {
        // example_date = "/Date(1547904900000+0100)/"
        let d = date.substring(6, date.length - 2)
        return  moment(d, 'xZ', true)
    }

    return new Solution(parseDate(journey.STD), parseDate(journey.STA), 'ITL', offer_name, min_price)
}

async function apiCall(startItaloCode, endItaloCode, date)
{
    date = date.clone()
    date.utc(true)

    let startOfDay = date.clone().startOf('day')
    let endOfDay = startOfDay.clone().add(23, 'hours').add(59, 'minutes')

    try {
        const body = await rp({
            method: 'POST',
            url: apiUrl,
            json: {
                Login: {
                    Domain: 'WWW',
                    Username: 'WWW_Anonymous',
                    Password: 'Accenture$1'
                },
                GetAvailableTrains: {
                RoundTrip: false,
                    DepartureStation: startItaloCode,
                    ArrivalStation: endItaloCode,
                    IntervalStartDateTime: `/Date(${startOfDay.format('x')})/`,
                    IntervalEndDateTime: `/Date(${endOfDay.format('x')})/`,
                    OverrideIntervalTimeRestriction: true,
                    AdultNumber: 1,
                    ChildNumber: 0,
                    SeniorNumber: 0,
                    SourceSystem: 2,
                    IsGuest: true,
                    CurrencyCode: 'EUR'
                }
            }
        });

        return body.JourneyDateMarkets[0].Journeys        
    }
    catch (err) {
        return null;
    }
}

async function getItaloSolutions(startStation, endStation, date)
{
    let startItaloCode = ITALO_STATIONS[startStation]
    let endItaloCode = ITALO_STATIONS[endStation]

    let journeys = await apiCall(startItaloCode, endItaloCode, date)
    if (journeys)
    {
        let solutions = journeys.map(j => buildSolution(j.Segments[0]))
        return solutions.filter(s => s != null)
    }
    else return []
}

module.exports = getItaloSolutions