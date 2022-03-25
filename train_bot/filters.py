from abc import ABC, abstractmethod
from datetime import timedelta

from train_bot.models import Solution


class Filter(ABC):
    @abstractmethod
    def filter(self, solution: Solution) -> bool:
        """Return True if the solution is ok, False otherwise."""


class DurationFilter(Filter):
    def __init__(self, duration: timedelta) -> None:
        self._duration = duration

    @classmethod
    def from_string(cls, text: str) -> "DurationFilter":
        return DurationFilter.from_minutes(int(text))

    @classmethod
    def from_minutes(cls, minutes: int) -> "DurationFilter":
        return DurationFilter(timedelta(minutes=minutes))

    def filter(self, solution: Solution) -> bool:
        return solution.arrival_time - solution.departure_time <= self._duration


class PriceFilter(Filter):
    def __init__(self, price: float) -> None:
        self._price = price

    @classmethod
    def from_string(cls, text: str) -> "PriceFilter":
        return PriceFilter(float(text))

    def filter(self, solution: Solution) -> bool:
        return solution.price <= self._price


def do_filter(solutions: list[Solution], filters: list[Filter]) -> list[Solution]:
    if not filters:
        return solutions

    return [solution for solution in solutions if all(f.filter(solution) for f in filters)]


FILTERS = {
    "p": PriceFilter,
    "t": DurationFilter,
}
