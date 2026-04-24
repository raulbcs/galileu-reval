import logging
import time

import requests

from .config import HEADERS, SESSION_COOKIE

log = logging.getLogger("scraper")

session = requests.Session()
session.headers.update(HEADERS)
if SESSION_COOKIE:
    session.cookies.set("PHPSESSID", SESSION_COOKIE, domain="www.atacadoideal.com.br")


def get(url, retries=3):
    for attempt in range(retries):
        try:
            resp = session.get(url, timeout=20)
            if resp.status_code == 200:
                return resp
            if resp.status_code == 404:
                log.warning("404: %s", url)
                return None
            log.warning("%d: %s (tentativa %d)", resp.status_code, url, attempt + 1)
        except requests.RequestException as e:
            log.warning("Erro: %s — %s (tentativa %d)", url, e, attempt + 1)
        if attempt < retries - 1:
            time.sleep(2 ** attempt)
    return None
