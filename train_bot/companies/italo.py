from datetime import datetime, timezone

import requests

from train_bot.models import Solution

_STATIONS = {
    "BOLOGNA CENTRALE": "BC_",
    "BRESCIA": "BSC",
    "FERRARA": "F__",
    "FIRENZE S. M. NOVELLA": "SMN",
    "MILANO CENTRALE": "MC_",
    "RHO-FIERA MILANO": "RRO",
    "MILANO ROGOREDO": "RG_",
    "NAPOLI CENTRALE": "NAC",
    "PADOVA": "PD_",
    "REGGIO EMILIA AV": "AAV",
    "ROMA TERMINI": "RMT",
    "ROMA TIBURTINA": "RTB",
    "SALERNO": "SAL",
    "TORINO PORTA NUOVA": "TOP",
    "TORINO PORTA SUSA": "OUE",
    "VENEZIA MESTRE": "VEM",
    "VENEZIA S. LUCIA": "VSL",
    "VERONA PORTA NUOVA": "VPN",
    "MILANO ( TUTTE LE STAZIONI )": "MI0",
    "ROMA ( TUTTE LE STAZIONI )": "RM0",
}

_LOGIN_URL = "https://big.ntvspa.it/BIG/v7/Rest/SessionManager.svc/Login"
_API_URL = "https://big.ntvspa.it/BIG/v7/Rest/BookingManager.svc/GetAvailableTrains"


def _get_signature() -> str:
    """
    API usage example: https://github.com/SimoDax/Italo-API/wiki/API-Italo
    """
    response = requests.post(
        url=_LOGIN_URL,
        json={
            "Login": {"Domain": "WWW", "Username": "WWW_Anonymous", "Password": "Accenture$1"},
            "SourceSystem": 1,
        },
    )
    response.raise_for_status()
    data = response.json()
    return data["Signature"]


def _make_request(departure: str, arrival: str, date: datetime, signature: str) -> dict:
    """
    API usage example: https://github.com/SimoDax/Italo-API/wiki/API-Italo
    """
    day_start = date.replace(hour=0, minute=0, second=0, tzinfo=timezone.utc)
    day_end = date.replace(hour=22, minute=59, second=59, tzinfo=timezone.utc)

    response = requests.post(
        url=_API_URL,
        json={
            "Signature": signature,
            "SourceSystem": 2,
            "GetAvailableTrains": {
                "RoundTrip": False,
                "DepartureStation": departure,
                "ArrivalStation": arrival,
                "IntervalStartDateTime": f"/Date({int(day_start.timestamp() * 1000)}+0000)/",
                "IntervalEndDateTime": f"/Date({int(day_end.timestamp() * 1000)}+0000)/",
                "OverrideIntervalTimeRestriction": True,
                "AdultNumber": 1,
                "ChildNumber": 0,
                "InfantNumber": 0,
                "SeniorNumber": 0,
                "IsGuest": True,
                "CurrencyCode": "EUR",
            },
        },
    )
    response.raise_for_status()
    return response.json()


def _parse_date(italo_date: str) -> datetime:
    the_date = italo_date[6:-2]
    unix_seconds = int(the_date[:-5]) // 1000
    tz = datetime.strptime(the_date[-5:], "%z").tzinfo
    return datetime.fromtimestamp(unix_seconds, tz=tz)


def _build_solution(segment: dict) -> Solution:
    fares = segment["Fares"]

    min_price: float = 1_000_000
    min_idx: int = -1
    for idx, fare in enumerate(fares):
        if fare["FullFarePrice"] < min_price:
            min_price = fare["FullFarePrice"]
            min_idx = idx

    return Solution(
        departure_time=_parse_date(segment["STD"]),
        arrival_time=_parse_date(segment["STA"]),
        price=min_price,
        company="ITALO",
    )


def _process_response(data: dict) -> list[Solution]:
    journeys = data["JourneyDateMarkets"][0]["Journeys"]
    return [_build_solution(journey["Segments"][0]) for journey in journeys]


def retrieve_italo_solutions(
    departure: str,
    arrival: str,
    date: datetime,
) -> list[Solution]:
    signature = _get_signature()
    response = _make_request(
        departure=_STATIONS[departure],
        arrival=_STATIONS[arrival],
        date=date,
        signature=signature,
    )
    solutions = _process_response(response)
    return solutions


if __name__ == "__main__":
    signature = _get_signature()
    response = _make_request(
        departure=_STATIONS["BOLOGNA CENTRALE"],
        arrival=_STATIONS["MILANO CENTRALE"],
        date=datetime(2022, 2, 10),
        signature=signature,
    )
    solutions = _process_response(response)

    import pprint

    pprint.pprint(solutions)

    import json

    with open("italo_response.json", "w") as f:
        json.dump(response, f)
