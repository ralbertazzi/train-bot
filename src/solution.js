const moment = require('moment')

class Solution {

    constructor(departuretime, arrivaltime, company, offer, price)
    {
        this.departuretime = departuretime
        this.arrivaltime = arrivaltime
        this.company = company
        this.offer = offer
        this.price = price
    }

    duration()
    {
        return moment.duration(this.arrivaltime.diff(this.departuretime))
    }


    _formatTime(moment_date)
    {
        return moment_date.format('HH:mm')
    }

    _formatDuration(moment_duration)
    {
        // https://stackoverflow.com/questions/13262621/how-do-i-use-format-on-a-moment-js-duration
        return moment.utc(moment_duration.as('ms')).format('HH:mm')
    }

    _formatPrice(price)
    {
        return price.toString().padStart(5)
    }

    getDay()
    {
        return this.departuretime.format('ddd DD/MM')
    }

    formattedPrice()
    {
        return this._formatPrice(this.price)
    }

    tableKey()
    {
        return `${this._formatTime(this.departuretime)} -> ${this._formatTime(this.arrivaltime)} (${this._formatDuration(this.duration())}) ${this.company}`
    }

    toString()
    {
        return `${this._formatTime(this.departuretime)} -> ${this._formatTime(this.arrivaltime)} (${this._formatDuration(this.duration())})  - ${this.formattedPrice()}€  -  ${this.company}`
    }
}

module.exports = Solution