const Telegraf = require('telegraf')
const session = require('telegraf/session')
const moment = require('moment')
const getTrenitaliaSolutions = require('./trenitalia')
const getItaloSolutions = require('./italo')
const { FilterSolutionsByDuration, FilterSolutionsByPrice } = require('./filters')
const solutionsToPdf = require('./pdf')
const { range } = require('./utils')


function parseInputDate(input_date)
{
    return moment(input_date, ['D/M/YYYY', 'D/M'], true)
}

function parseIntParam(arg)
{
    if (arg.length == 1) 
        return null

    let param = parseInt(arg.substring(1))
    return isNaN(param) ? null : param
}

function parseFilter(arg)
{
    switch(arg.charAt(0))
    {
        case FilterSolutionsByDuration.initial():
            return new FilterSolutionsByDuration(parseIntParam(arg))

        case FilterSolutionsByPrice.initial():
            return new FilterSolutionsByPrice(parseIntParam(arg))

        default:
            return null
    }
}

function parseSearchDays(args)
{
    for (let arg of args)
        if (arg.charAt(0) == 'd')
        {
            let search_days = parseIntParam(arg)
            if (search_days != null && search_days >= 0)
                return search_days
        }

    return 0
}

function sortSolutionsByDepartureTime(solutions)
{
    solutions.sort((s1, s2) => s1.departuretime.diff(s2.departuretime))
}

function getReplyButtons()
{
    return Telegraf.Extra.markup(m => m.inlineKeyboard([
        m.callbackButton('◀️ Previous Day', 'previousDay'),
        m.callbackButton('AB 🔀 BA', 'invert'),
        m.callbackButton('Next Day ▶️', 'nextDay')
    ]))
}

function getTitle(ctx)
{
    let { startStation, endStation, date, filters } = ctx.session

    let title = `\`${date.format('ddd DD/MM/YYYY')} | ${startStation} -> ${endStation}`

    if (filters.length > 0)
        title += ' | ' + filters.map(f => f.toString()).join(' ')

    return title + '\`\n\n'
}

async function getTrenitaliaAndItaloSolutions(startStation, endStation, date, filters)
{
    let solutions = await Promise.all([
        getTrenitaliaSolutions(startStation, endStation, date),
        getItaloSolutions(startStation, endStation, date)
    ])

    solutions = [].concat.apply([], solutions)
    sortSolutionsByDepartureTime(solutions)

    for (let filter of filters)
        solutions = filter.doFilter(solutions)

    return solutions
}

async function getSingleDaySolutions(ctx, startStation, endStation, date, filters)
{
    ctx.session = { startStation, endStation, date, filters }

    let solutions = await getTrenitaliaAndItaloSolutions(startStation, endStation, date, filters)

    if (solutions.length > 0)
    {
        let replyMessage = solutions.map(s => s.toString()).join('\n')
        await ctx.replyWithMarkdown(getTitle(ctx) + replyMessage, getReplyButtons())
    }    
    else
        await ctx.replyWithMarkdown(getTitle(ctx) + 'No solution 😔', getReplyButtons())
}


async function getMultipleDaysSolutions(ctx, startStation, endStation, date, filters, offset)
{
    let days = range(-offset, offset + 1).map(off =>  date.clone().add(off, 'days'))

    let all_days_solutions = await Promise.all(days.map(offset_date =>
        getTrenitaliaAndItaloSolutions(startStation, endStation, offset_date, filters)
    ))

    let pdfDoc = solutionsToPdf(startStation, endStation, days, all_days_solutions)

    let filename = `trains_${days[0].format('DD-MM')}_to_${days[days.length - 1].format('DD-MM')}`
    if (filters.length > 0)
        filename += '_' + filters.map(f => f.toString()).join('_')
    filename += '.pdf'

    await ctx.replyWithDocument({ source: pdfDoc, filename: filename})
}

async function parseAndAnswer(ctx, startStation, endStation)
{
    console.log(ctx.message.text)
    let args = ctx.message.text.split(' ')

    let date = parseInputDate(args[1])
    if (!date.isValid())
    {
        await ctx.reply('Missing or bad formatted date 😱 Check /help')
        return
    }

    let filters = []
    if (args.length > 2)
        for (let i = 2; i < args.length; i++)
        {
            let filter = parseFilter(args[i])
            if (filter && filter.isValid())
                filters.push(filter)
        }

    let days = parseSearchDays(args)
    if (days == 0)
    {
        await getSingleDaySolutions(ctx, startStation, endStation, date, filters)
    }
    else
    {
        await getMultipleDaysSolutions(ctx, startStation, endStation, date, filters, days)
    }

    
}

async function prevNextDay(ctx, action)
{
    let session = ctx.session
    if (session.date)
    {
        let newDate = session.date.clone()
        if (action === 'prev')
            newDate.subtract(1, 'day')
        else if (action === 'next')
            newDate.add(1, 'day')

        await getSingleDaySolutions(ctx, session.startStation, session.endStation, newDate, session.filters)
    }
    else noSessionMessage(ctx)
}

async function invertStations(ctx)
{
    let session = ctx.session
    if (session.startStation)
    {
        await getSingleDaySolutions(ctx, session.endStation, session.startStation, session.date, session.filters)
    }
    else await noSessionMessage(ctx)
}

async function noSessionMessage(ctx)
{
    await ctx.reply('No session found. Please manually search for something.')
}

async function startBot()
{
    const bot = new Telegraf(process.env.BOT_TOKEN)
    bot.use(session())
    bot.start((ctx) => ctx.reply('Welcome!'))
    bot.help((ctx) => ctx.reply('Usage: /MIBO DD/MM[/YYYY] [p24] [t70]'))
    bot.command('mibo', async (ctx) => await parseAndAnswer(ctx, "MILANO CENTRALE", "BOLOGNA CENTRALE"))
    bot.command('bomi', async (ctx) => await parseAndAnswer(ctx, "BOLOGNA CENTRALE", "MILANO CENTRALE"))
    bot.command('vmmi', async (ctx) => await parseAndAnswer(ctx, "VENEZIA MESTRE", "MILANO CENTRALE"))
    bot.command('mivm', async (ctx) => await parseAndAnswer(ctx, "MILANO CENTRALE", "VENEZIA MESTRE"))
    bot.action('previousDay', async (ctx) => await prevNextDay(ctx, 'prev'))
    bot.action('nextDay', async (ctx) => await prevNextDay(ctx, 'next'))
    bot.action('invert', async (ctx) => await invertStations(ctx))

    if (process.env.NODE_ENV === 'production')
    {
        console.log('Starting bot in WebHook mode')

        const PORT = process.env.PORT || 3000;
        await bot.telegram.setWebhook(`${process.env.DEPLOY_URL}/bot`);
        bot.startWebhook(`/bot`, null, PORT)
    }
    else
    {
        console.log('Starting bot in polling mode')
        bot.startPolling()
    }
}

module.exports = startBot
