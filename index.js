require('dotenv').config()
const Telegraf = require('telegraf')
const moment = require('moment')
const getTrenitaliaSolutions = require('./trenitalia')

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

    return `${getTime(sol.departuretime)} -> ${getTime(sol.arrivaltime)} (${sol.duration}) - ${sol.price}€`
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
    return moment(input_date, ['DD/MM/YYYY', 'DD/MM'], true)
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
        let solutions = await getTrenitaliaSolutions(startStation, endStation, date)
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