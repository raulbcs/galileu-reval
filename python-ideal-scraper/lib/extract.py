"""Fase 2: extrai dados completos de cada produto via JSON-LD."""

import json
import logging
import re
import time

from bs4 import BeautifulSoup

from . import db
from .config import DELAY
from .fetch import get

log = logging.getLogger("scraper")

BATCH_SIZE = 50


def parse_product_page(url, codigo):
    """Extrai dados de um produto da página de detalhe."""
    resp = get(url)
    if not resp:
        return None

    data = {"url": url, "codigo": codigo}
    html = resp.text

    soup = BeautifulSoup(html, "html.parser")
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            ld = json.loads(script.string, strict=False)
        except (json.JSONDecodeError, TypeError):
            continue
        if not isinstance(ld, dict) or ld.get("@type") != "Product":
            continue

        data["nome"] = ld.get("name", "")
        data["descricao"] = ld.get("description", "")
        data["imagem_url"] = ld.get("image", "")
        data["ean"] = ld.get("gtin13", "")
        data["sku_fabricante"] = ld.get("mpn", "")
        data["altura_cm"] = ld.get("height", "")
        data["largura_cm"] = ld.get("width", "")
        data["comprimento_cm"] = ld.get("depth", "")
        data["peso_kg"] = ld.get("weight", "")
        brand = ld.get("brand", {})
        if isinstance(brand, dict):
            data["marca"] = brand.get("name", "")
        data["categoria"] = ld.get("category", "")

        offers = ld.get("offers", {})
        if isinstance(offers, dict):
            price = offers.get("price")
            data["preco"] = float(price) if price else None
            avail = offers.get("availability", "")
            data["disponivel"] = 1 if "InStock" in str(avail) else 0
        break

    def feature(cls):
        m = re.search(rf'<li class="product__features--{cls}">(.*?)</li>', html)
        if m:
            text = BeautifulSoup(m.group(1), "html.parser").get_text(strip=True)
            return re.sub(r"^[^:]+:\s*", "", text)
        return ""

    def dimension(cls):
        m = re.search(rf'<li class="product__dimensions--{cls}">(.*?)</li>', html)
        if m:
            text = BeautifulSoup(m.group(1), "html.parser").get_text(strip=True)
            nums = re.findall(r"[\d.,]+", text)
            return nums[0].replace(",", ".") if nums else ""
        return ""

    if not data.get("marca"):
        data["marca"] = feature("marca")
    data["ncm"] = feature("ncm")
    data["embalagem"] = feature("embalagem-nome")
    data["ean_caixa"] = feature("embalagem-ean")
    data["origem"] = feature("origem")
    if not data.get("altura_cm"):
        data["altura_cm"] = dimension("altura")
    if not data.get("largura_cm"):
        data["largura_cm"] = dimension("largura")
    if not data.get("comprimento_cm"):
        data["comprimento_cm"] = dimension("comprimento")
    if not data.get("peso_kg"):
        data["peso_kg"] = dimension("peso")

    return data


def run():
    """Fase 2: workers pegam batches de produtos da fila."""
    conn = db.connect()

    pendentes = db.count_pendentes(conn)
    completos = db.count_completos(conn)
    log.info("Fase 2: %d completos, %d pendentes", completos, pendentes)

    if not pendentes:
        log.info("Nenhum produto pendente.")
        conn.close()
        return

    processed = 0
    errors = 0

    while True:
        batch = db.claim_next_produtos(conn, BATCH_SIZE)
        if not batch:
            break

        batch_start = time.time()
        results = []
        for row in batch:
            codigo, url = row["codigo"], row["url"]
            data = parse_product_page(url, codigo)
            if data:
                results.append((codigo, data))
            else:
                errors += 1
            time.sleep(DELAY)

        # Flush: atualiza fila + upsert na tabela principal
        conn.execute("BEGIN IMMEDIATE")
        try:
            for codigo, data in results:
                db.update_queue_dados(conn, codigo, data)
            conn.execute("COMMIT")
        except Exception:
            conn.execute("ROLLBACK")
            raise

        processed += len(batch)
        batch_time = time.time() - batch_start
        remaining = db.count_pendentes(conn)
        nome = (results[-1][1].get("nome", ""))[:50] if results else "?"
        log.info(
            "[%d extraídos | %d na fila] %s (%.1fs) | erros: %d",
            processed, remaining, nome, batch_time, errors,
        )

    total_completos = db.count_completos(conn)
    log.info("Fase 2 completa: %d produtos com dados | %d erros", total_completos, errors)
    conn.close()
