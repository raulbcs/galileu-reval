#!/usr/bin/env python3
"""Scraper Atacado Ideal

Uso:
  uv run python scraper.py full -p 10    # Roda tudo com 10 workers paralelos
  uv run python scraper.py urls -p 10    # Só fase 1
  uv run python scraper.py extract -p 10 # Só fase 2
  uv run python scraper.py test          # Teste rápido
  uv run python scraper.py stats         # Estatísticas
"""

import argparse
import json
import logging
import multiprocessing
import os
import time
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

import sentry_sdk
sentry_sdk.init(dsn=os.environ.get("SENTRY_PYTHON_DSN"))

from lib import db
from lib.collect import run as collect_run, parse_products_from_html, get_pagination_info, flush_to_db
from lib.extract import run as extract_run, parse_product_page
from lib.fetch import get

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-5s %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("scraper")


def _worker(fn, worker_id):
    """Entry point para cada processo worker."""
    root = logging.getLogger()
    root.handlers.clear()
    logging.basicConfig(
        level=logging.INFO,
        format=f"%(asctime)s W{worker_id} %(levelname)-5s %(message)s",
        datefmt="%H:%M:%S",
    )
    fn()


def spawn(fn, num_workers):
    """Spawna N workers que compartilham a mesma fila no DB."""
    if num_workers <= 1:
        fn()
        return

    log.info("Spawnando %d workers para %s...", num_workers, fn.__module__)
    procs = []
    for n in range(1, num_workers + 1):
        p = multiprocessing.Process(target=_worker, args=(fn, n))
        p.start()
        procs.append(p)

    for p in procs:
        p.join()


def cmd_test():
    log.info("Modo teste: artesanato/colas...")
    conn = db.connect()
    resp = get("https://www.atacadoideal.com.br/artesanato/colas")
    if not resp:
        conn.close()
        return
    pages = get_pagination_info(resp.text)
    all_products = parse_products_from_html(resp.text, "artesanato/colas")
    for page in range(2, pages + 1):
        time.sleep(0.5)
        r = get("https://www.atacadoideal.com.br/artesanato/colas?page={}&slug=artesanato/colas".format(page))
        if r:
            all_products.extend(parse_products_from_html(r.text, "artesanato/colas"))
    log.info("Encontrados %d produtos (%d págs)", len(all_products), pages)
    if all_products:
        data = parse_product_page(all_products[0]["url"], all_products[0]["codigo"])
        print(json.dumps(data, ensure_ascii=False, indent=2))
    conn.close()


def get_all_ideal_codes():
    """Lê todos os códigos ideal ativos do DB."""
    conn = db.connect()
    rows = conn.execute(
        "SELECT codigo FROM produtos WHERE supplier = 'ideal' AND deleted_at IS NULL"
    ).fetchall()
    conn.close()
    return [r[0] for r in rows]


def main():
    parser = argparse.ArgumentParser(description="Scraper Atacado Ideal")
    parser.add_argument("command", choices=["urls", "extract", "full", "test", "stats"])
    parser.add_argument("-p", "--parallel", type=int, default=1,
                        help="Número de workers paralelos (default: 1)")
    args = parser.parse_args()

    db.init()

    if args.command == "test":
        cmd_test()
    elif args.command == "stats":
        db.stats()
    elif args.command == "urls":
        spawn(collect_run, args.parallel)
    elif args.command == "extract":
        spawn(extract_run, args.parallel)
    elif args.command == "full":
        spawn(collect_run, args.parallel)
        log.info("─" * 50)
        log.info("Fase 1 finalizada. Iniciando fase 2...")
        log.info("─" * 50)
        spawn(extract_run, args.parallel)
        # Output códigos para Node.js (stdout)
        codes = get_all_ideal_codes()
        print(json.dumps(codes))

    log.info("Done!")


if __name__ == "__main__":
    main()
