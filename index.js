require('dotenv').config()
const Telegraf = require('telegraf')
const session = require('telegraf/session')
const moment = require('moment')
const getTrenitaliaSolutions = require('./trenitalia')
const getItaloSolutions = require('./italo')
const { FilterSolutionsByDuration, FilterSolutionsByPrice } = require('./filters')


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
        case FilterSolutionsByDuration.initial():
            return new FilterSolutionsByDuration(parseIntParam(arg))

        case FilterSolutionsByPrice.initial():
            return new FilterSolutionsByPrice(parseIntParam(arg))

        default:
            return null
    }
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

    let title = `\`${date.format('DD/MM/YYYY')} | ${startStation} -> ${endStation}`

    if (filters.length > 0)
        title += ' | ' + filters.map(f => f.toString()).join(' ')

    return title + '\`\n\n'
}

async function getAllSolutions(ctx, startStation, endStation, date, filters)
{
    if (date.isValid())
    {
        ctx.session = { startStation, endStation, date, filters }

        let solutions = await Promise.all([
            getTrenitaliaSolutions(startStation, endStation, date),
            getItaloSolutions(startStation, endStation, date)
        ])

        solutions = [].concat.apply([], solutions)
        sortSolutionsByDepartureTime(solutions)

        for (let filter of filters)
            solutions = filter.doFilter(solutions)
    
        if (solutions.length > 0)
        {
            let replyMessage = solutions.map(s => s.toString()).join('\n')
            ctx.replyWithMarkdown(getTitle(ctx) + replyMessage, getReplyButtons())
        }    
        else
            ctx.replyWithMarkdown(getTitle(ctx) + 'No solution 😔', getReplyButtons())
    }
    else ctx.reply('Missing or bad formatted date 😱 Check /help')
}

async function parseAndAnswer(ctx, startStation, endStation)
{
    console.log(ctx.message.text)
    let args = ctx.message.text.split(' ')

    let date = parseInputDate(args[1])
    let filters = []
    if (args.length > 2)
        for (let i = 2; i < args.length; i++)
        {
            let filter = parseFilter(args[i])
            if (filter && filter.isValid())
                filters.push(filter)
        }

    await getAllSolutions(ctx, startStation, endStation, date, filters)
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

        await getAllSolutions(ctx, session.startStation, session.endStation, newDate, session.filters)
    }
    else noSessionMessage(ctx)
}

async function invertStations(ctx)
{
    let session = ctx.session
    if (session.startStation)
    {
        await getAllSolutions(ctx, session.endStation, session.startStation, session.date, session.filters)
    }
    else noSessionMessage(ctx)
}

function noSessionMessage(ctx)
{
    ctx.reply('No session found. Please manually search for something.')
}


const bot = new Telegraf(process.env.BOT_TOKEN)
bot.use(session())
bot.start((ctx) => ctx.reply('Welcome!'))
bot.help((ctx) => ctx.reply('Usage: /MIBO DD/MM[/YYYY] [p24] [t70]'))
bot.command('MIBO', async (ctx) => await parseAndAnswer(ctx, "MILANO CENTRALE", "BOLOGNA CENTRALE"))
bot.command('BOMI', async (ctx) => await parseAndAnswer(ctx, "BOLOGNA CENTRALE", "MILANO CENTRALE"))
bot.action('previousDay', async (ctx) => await prevNextDay(ctx, 'prev'))
bot.action('nextDay', async (ctx) => await prevNextDay(ctx, 'next'))
bot.action('invert', async (ctx) => await invertStations(ctx))
bot.command('md', (ctx) => ctx.replyWithMarkdown(`Send \`hi\``))

if (process.env.NODE_ENV === 'production')
{
    console.log('Starting bot in WebHook mode')

    const PORT = process.env.PORT || 3000;
    bot.telegram.setWebhook(`${process.env.DEPLOY_URL}/bot${process.env.BOT_TOKEN}`);
    bot.startWebhook(`/bot${process.env.BOT_TOKEN}`, null, PORT)

}
else
{
    console.log('Starting bot in polling mode')
    bot.startPolling()
}
