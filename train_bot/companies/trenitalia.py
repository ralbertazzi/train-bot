from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime, timezone
from functools import partial

import requests

from train_bot.models import Solution

_BASE_URL = "https://www.lefrecce.it/msite/api"


@dataclass(frozen=True)
class TrenitaliaSolution:
    solution_id: str
    departure_time: datetime
    arrival_time: datetime

    def __hash__(self) -> int:
        return hash(self.solution_id)


def _make_solutions_request(
    departure: str, arrival: str, date: datetime, session: requests.Session, offset: int = 0
) -> list[dict]:
    """
    Trenitalia API usage examples:
    - https://github.com/SimoDax/Trenitalia-API/wiki/API-Trenitalia---lefrecce.it
    - https://github.com/TrinTragula/api-trenitalia
    """
    response = session.get(
        url=_BASE_URL + "/solutions",
        params={
            "origin": departure,
            "destination": arrival,
            "adate": date.strftime("%d/%m/%Y"),
            "atime": str(date.hour),
            "adultno": "1",
            "offset": str(offset),
            "childno": "0",
            "arflag": "A",
            "direction": "A",
            "frecce": "true",
            "onlyRegional": "false",
        },
    )
    response.raise_for_status()
    return response.json()


def _make_offers_request(solution_id: str, session: requests.Session) -> dict:
    response = session.get(
        url=_BASE_URL + f"/solutions/{solution_id}/standardoffers",
    )
    response.raise_for_status()
    return response.json()


def _parse_solution(obj: dict) -> TrenitaliaSolution:
    return TrenitaliaSolution(
        solution_id=obj["idsolution"],
        departure_time=datetime.fromtimestamp(obj["departuretime"] // 1000, tz=timezone.utc),
        arrival_time=datetime.fromtimestamp(obj["arrivaltime"] // 1000, tz=timezone.utc),
    )


def _request_for_hour(departure: str, arrival: str, date: datetime) -> list[Solution]:
    with requests.Session() as session:
        response = _make_solutions_request(
            departure=departure, arrival=arrival, date=date, session=session
        )
        solutions = [_parse_solution(sol) for sol in response]

        with ThreadPoolExecutor(max_workers=len(solutions)) as pool:
            responses = pool.map(
                partial(_make_offers_request, session=session), [s.solution_id for s in solutions]
            )

        return [
            Solution(
                departure_time=sol.departure_time,
                arrival_time=sol.arrival_time,
                price=5.0,
                company="FS",
            )
            for sol in solutions
            if sol.departure_time.day == date.day
        ]


def retrieve_trenitalia_solutions(departure: str, arrival: str, date: datetime) -> list[Solution]:
    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = [
            pool.submit(_request_for_hour, departure, arrival, date.replace(hour=hour))
            for hour in range(6, 24)
        ]
        responses = []
        for f in as_completed(futures):
            responses.extend(f.result())
        return responses


if __name__ == "__main__":
    response = retrieve_trenitalia_solutions(
        "Bologna Centrale",
        "Milano Centrale",
        datetime(2022, 1, 25, 15, 0, 0, 0),
    )
    #     solutions = sorted(
    #         set(_parse_solution(s) for s in response), key=lambda s: s.departure_time
    #     )

    # print(solutions)
    # print(len(solutions))
