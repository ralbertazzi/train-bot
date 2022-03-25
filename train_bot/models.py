from dataclasses import dataclass
from datetime import datetime, timezone
from functools import lru_cache
from typing import cast


@lru_cache(maxsize=1)
def local_tz() -> timezone:
    return cast(timezone, datetime.now().astimezone().tzinfo)


@dataclass(frozen=True)
class Solution:
    departure_time: datetime
    arrival_time: datetime
    price: float
    company: str

    @property
    def departure_time_local(self) -> str:
        return self.departure_time.astimezone(tz=local_tz()).strftime("%H:%M")

    @property
    def arrival_time_local(self) -> str:
        return self.arrival_time.astimezone(tz=local_tz()).strftime("%H:%M")

    @property
    def duration(self) -> str:
        return str(self.arrival_time - self.departure_time)[:-3]

    def __repr__(self) -> str:
        return "{company} | {departure_time} -> {arrival_time} | {price}".format(
            company=self.company,
            departure_time=self.departure_time_local,
            arrival_time=self.arrival_time_local,
            price=round(self.price, 2),
        )
