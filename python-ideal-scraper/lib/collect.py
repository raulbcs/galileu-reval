"""Fase 1: coleta URLs de produtos via fila de subcategorias."""

import logging
import re
import time

from . import db
from .config import BASE_URL, DELAY
from .fetch import get

log = logging.getLogger("scraper")


def get_subcategory_slugs():
    log.info("Coletando subcategorias do menu...")
    resp = get(BASE_URL + "/")
    if not resp:
        log.error("Falha ao carregar homepage")
        return []

    slugs = set()
    for a in re.finditer(r'href="https://www\.atacadoideal\.com\.br/([^"]+)"', resp.text):
        path = a.group(1)
        if not re.match(r"^[a-z0-9][a-z0-9/-]*[a-z0-9]$", path):
            continue
        if "/" not in path:
            continue
        ignore = (
            "quemsomos", "politica", "igualdade", "marcas", "novidades",
            "promocoes", "vem-ai", "m/", "components/", "controllers/", "c/",
        )
        if any(path.startswith(p) for p in ignore):
            continue
        slugs.add(path)

    log.info("Encontradas %d subcategorias", len(slugs))
    return sorted(slugs)


def seed_subcategorias(conn, slugs):
    """Popula a tabela de subcategorias com status 'pendente'."""
    conn.execute("BEGIN IMMEDIATE")
    for slug in slugs:
        conn.execute(
            "INSERT OR IGNORE INTO ideal_subcategorias (slug) VALUES (?)",
            (slug,),
        )
    conn.execute("COMMIT")


def get_pagination_info(html):
    m = re.search(r'data-pages="(\d+)"', html)
    return int(m.group(1)) if m else 1


def parse_products_from_html(html, slug):
    """Extrai produtos do HTML em memória. Retorna lista de dicts."""
    products = []
    seen = set()

    for a in re.finditer(
        r'href="(https://www\.atacadoideal\.com\.br/([a-z0-9-]+)-(\d+)-(\d+))"',
        html,
    ):
        code = a.group(3)
        if code in seen:
            continue
        seen.add(code)

        nome = ""
        marca = ""
        preco = None
        card = re.search(
            rf'data-codigo-produto="{re.escape(code)}"[^>]*'
            rf'data-nome="([^"]*)"[^>]*data-marca="([^"]*)"',
            html,
        )
        if card:
            nome = card.group(1)
            marca = card.group(2)
        preco_match = re.search(
            rf'data-codigo-produto="{re.escape(code)}"[^>]*data-preco="([\d.]+)"',
            html,
        )
        if preco_match:
            preco = float(preco_match.group(1))

        products.append({
            "codigo": code,
            "url": a.group(1),
            "nome": nome,
            "marca": marca,
            "preco": preco,
            "slug": slug,
        })

    return products


def flush_to_db(conn, products, slug, pages, status="ok"):
    """Grava batch de produtos no DB em uma transação."""
    conn.execute("BEGIN IMMEDIATE")
    try:
        for p in products:
            db.upsert_queue_produto(conn, p["codigo"], p["url"], p["nome"], p["marca"], p["slug"], p.get("preco"))
        db.upsert_subcategoria(conn, slug, pages, len(products), status)
        conn.execute("COMMIT")
    except Exception:
        conn.execute("ROLLBACK")
        raise


def run():
    """Fase 1: workers pegam subcategorias da fila."""
    conn = db.connect()
    slugs = get_subcategory_slugs()
    seed_subcategorias(conn, slugs)

    total = len(slugs)
    log.info("Iniciando %d subcategorias via fila", total)

    processed = 0

    while True:
        slug = db.claim_next_subcategoria(conn)
        if not slug:
            break

        processed += 1
        slug_start = time.time()

        resp = get(f"{BASE_URL}/{slug}")
        if not resp:
            db.upsert_subcategoria(conn, slug, 0, 0, "erro")
            conn.commit()
            continue

        pages = get_pagination_info(resp.text)
        all_products = parse_products_from_html(resp.text, slug)

        for page in range(2, pages + 1):
            time.sleep(DELAY)
            resp = get(f"{BASE_URL}/{slug}?page={page}&slug={slug}")
            if not resp:
                log.warning("  %s pág %d/%d: falhou", slug, page, pages)
                break
            page_products = parse_products_from_html(resp.text, slug)
            if not page_products:
                break
            all_products.extend(page_products)

        flush_to_db(conn, all_products, slug, pages)

        slug_time = time.time() - slug_start
        pendentes = conn.execute("SELECT COUNT(*) FROM ideal_subcategorias WHERE status = 'pendente'").fetchone()[0]
        total_produtos = db.count_queue(conn)

        log.info(
            "[%d feitas | %d na fila] %s → %d produtos (%d págs, %.1fs) | DB: %d",
            processed, pendentes, slug, len(all_products), pages, slug_time, total_produtos,
        )

        time.sleep(DELAY)

    total_produtos = db.count_queue(conn)
    log.info("Fase 1 completa: %d produtos únicos no banco", total_produtos)
    conn.close()
