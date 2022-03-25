from datetime import datetime
from typing import Optional

import click

from train_bot.companies import retrieve_solutions
from train_bot.filters import DurationFilter, Filter, PriceFilter, do_filter
from train_bot.models import Solution


def _filter(
    solutions: list[Solution], time: Optional[int], price: Optional[float]
) -> list[Solution]:
    filters: list[Filter] = []
    if time:
        filters.append(DurationFilter.from_minutes(time))
    if price:
        filters.append(PriceFilter(price))

    if not filters:
        return solutions

    return do_filter(solutions, filters)


def _show(solutions: list[Solution]) -> None:

    from rich.console import Console
    from rich.table import Table

    table = Table(title="Search results")

    table.add_column("Company", justify="center", style="cyan")
    table.add_column("Dep Time", justify="center", style="magenta")
    table.add_column("Arr Time", justify="center", style="magenta")
    table.add_column("Duration", justify="center", style="green")
    table.add_column("Price (€)", justify="center", style="bold red")

    for solution in solutions:
        table.add_row(
            solution.company,
            solution.departure_time_local,
            solution.arrival_time_local,
            solution.duration,
            str(solution.price),
        )

    console = Console()
    console.print(table)


@click.command("Fetch train solutions")
@click.option("--from", "from_", help="Departure station.", required=True, type=str)
@click.option("--to", help="Arrival station.", required=True, type=str)
@click.option(
    "--on", help="The travel date.", required=True, type=click.DateTime(formats=["%d/%m/%Y"])
)
@click.option(
    "-t",
    "--time",
    help="Filter by maximum travel time (in minutes)",
    type=int,
    required=False,
    default=None,
)
@click.option(
    "-p",
    "--price",
    help="Filter by maximum price (in EUR)",
    type=float,
    required=False,
    default=None,
)
def main(
    from_: str,
    to: str,
    on: datetime,
    time: Optional[int],
    price: Optional[float],
) -> None:
    solutions = retrieve_solutions(
        departure=from_,
        arrival=to,
        date=on,
    )
    solutions = _filter(solutions, time, price)
    _show(solutions)


if __name__ == "__main__":
    main()
