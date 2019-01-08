class FilterSolutionsByDuration
{
    static initial()
    {
        return 't'
    }

    constructor(maxDurationInMinutes)
    {
        this.maxDurationInMinutes = maxDurationInMinutes
    }

    toString()
    {
        return `${this.constructor.initial()}${this.maxDurationInMinutes}`
    }

    isValid()
    {
        return this.maxDurationInMinutes != null
    }

    doFilter(solutions)
    {
        return solutions.filter(s => s.duration().asMinutes() <= this.maxDurationInMinutes)
    }
}

class FilterSolutionsByPrice
{
    static initial()
    {
        return 'p'
    }

    constructor(maxPrice)
    {
        this.maxPrice = maxPrice
    }
    
    toString()
    {
        return `${this.constructor.initial()}${this.maxPrice}`
    }

    isValid()
    {
        return this.maxPrice != null
    }

    doFilter(solutions)
    {
        return solutions.filter(s => s.price <= this.maxPrice)
    }
}

module.exports = { FilterSolutionsByDuration, FilterSolutionsByPrice }