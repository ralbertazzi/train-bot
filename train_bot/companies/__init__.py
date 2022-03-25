from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

from train_bot.companies.italo import retrieve_italo_solutions
from train_bot.companies.trenitalia import retrieve_trenitalia_solutions
from train_bot.models import Solution


def retrieve_solutions(departure: str, arrival: str, date: datetime) -> list[Solution]:
    funcs = [retrieve_italo_solutions, retrieve_trenitalia_solutions]
    with ThreadPoolExecutor(max_workers=len(funcs)) as pool:
        futures = [pool.submit(func, departure, arrival, date) for func in funcs]

        solutions = []
        for future in as_completed(futures):
            solutions.extend(future.result())

    return sorted(solutions, key=lambda s: s.departure_time)
