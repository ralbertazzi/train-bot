heroku info -s # find web_url
heroku config:set DEPLOY_URL=<web_url>
heroku config:set BOT_TOKEN=<telegram_bot_token>
heroku config:add TZ=Europe/Rome
git push heroku master
heroku ps:scale web=1