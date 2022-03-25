import json
from importlib.resources import path

from tests import resources
from train_bot.italo import _process_response


def test_process_response() -> None:
    with path(resources, "italo_response.json") as file:
        with file.open("r") as fp:
            response = json.load(fp)

    _process_response(response)
