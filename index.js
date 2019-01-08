require('dotenv').config()
const Telegraf = require('telegraf')
const moment = require('moment')
const getTrenitaliaSolutions = require('./trenitalia')
const getItaloSolutions = require('./italo')

function getDuration(sol)
{
    return moment.duration(sol.arrivaltime.diff(sol.departuretime))
}

function solutionToString(sol)
{
    function getTime(moment_date)
    {
        return moment_date.format('HH:mm')
    }

    function formatDuration(moment_duration)
    {
        // https://stackoverflow.com/questions/13262621/how-do-i-use-format-on-a-moment-js-duration
        return moment.utc(moment_duration.as('ms')).format('HH:mm')
    }

    function formatPrice(price)
    {
        return price.toString().padStart(5)
    }

    let duration = formatDuration(getDuration(sol))

    return `${getTime(sol.departuretime)} -> ${getTime(sol.arrivaltime)} (${duration})  - ${formatPrice(sol.price)}€  -  ${sol.company}`
}

function filterSolutionsByDuration(solutions, maxDurationInMinutes)
{
    return solutions.filter(s => getDuration(s).asMinutes() <= maxDurationInMinutes)
}

function filterSolutionsByPrice(solutions, maxPrice)
{
    return solutions.filter(s => s.price <= maxPrice)
}

function parseInputDate(input_date)
{
    return moment(input_date, ['D/M/YYYY', 'D/M'], true)
}

function parseFilter(arg)
{
    function parseIntParam(arg)
    {
        if (arg.length == 1) 
            return null

        let param = parseInt(arg.substring(1))
        return isNaN(param) ? null : param
    }

    switch(arg.charAt(0))
    {
        case 't':
            return { func: filterSolutionsByDuration, value: parseIntParam(arg)}

        case 'p':
            return { func: filterSolutionsByPrice, value: parseIntParam(arg)}

        default:
            return null
    }
}

function sortSolutionsByDepartureTime(solutions)
{
    solutions.sort((s1, s2) => s1.departuretime.diff(s2.departuretime))
}

async function getAllSolutions(ctx, startStation, endStation)
{
    console.log(ctx.message.text)
    let args = ctx.message.text.split(' ')

    let date = parseInputDate(args[1])
    let filters = []
    if (args.length > 2)
        for (let i = 2; i < args.length; i++)
            filters.push(parseFilter(args[i]))

    if (date.isValid())
    {
        let solutions = await Promise.all([
            getTrenitaliaSolutions(startStation, endStation, date),
            getItaloSolutions(startStation, endStation, date)
        ])

        solutions = [].concat.apply([], solutions)
        sortSolutionsByDepartureTime(solutions)

        for (let filter of filters)
            if (filter.value)
                solutions = filter.func(solutions, filter.value)
    
        if (solutions.length > 0)
            ctx.reply(solutions.map(s => solutionToString(s)).join('\n'))
        else
            ctx.reply('No solution 😔')
    }
    else ctx.reply('Missing or bad formatted date 😱 Check /help')
}

const bot = new Telegraf(process.env.BOT_TOKEN)
bot.start((ctx) => ctx.reply('Welcome!'))
bot.help((ctx) => ctx.reply('Usage: /MIBO DD/MM[/YYYY] [p24] [t70]'))
bot.command('MIBO', async (ctx) => await getAllSolutions(ctx, "MILANO CENTRALE", "BOLOGNA CENTRALE"))
bot.command('BOMI', async (ctx) => await getAllSolutions(ctx, "BOLOGNA CENTRALE", "MILANO CENTRALE"))
bot.startPolling()