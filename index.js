require('dotenv').config()
const startBot = require('./src/bot')
const buildServer = require('./src/server')

startBot()
buildServer().listen(3000)