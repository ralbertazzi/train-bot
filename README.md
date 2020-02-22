# train-bot

This Telegram Bot queries italian train companies Trenitalia and Italo and gets back the list of available train for a certain day, with its minimum available price.

Example usage:

```/bomi 19/01/2019```: available trains from Bologna Centrale to Milano Centrale on 19 jan 2019

```/bomi 20/01/2019 p25 t80```: available trains from Bologna Centrale to Milano Centrale on 19 jan 2019 with price <= 25€ and travel time <= 80 minutes

Available routes:
- `bomi`: BOLOGNA CENTRALE -> MILANO CENTRALE
- `mibo`: MILANO CENTRALE -> BOLOGNA CENTRALE
- `vmmi`: VENEZIA MESTRE -> MILANO CENTRALE
- `mivm`: VENEZIA MESTRE -> MILANO CENTRALE


## Development

Project is deployed on Google Cloud Run.
To set the Telegram Webhook use [this simple API call](https://medium.com/@xabaras/setting-your-telegram-bot-webhook-the-easy-way-c7577b2d6f72)
