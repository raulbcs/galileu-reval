import sqlite3

from .config import DB_PATH

UPSERT_SQL = """
INSERT INTO produtos (
    id, supplier, codigo, nome, descricao, marca, ean, referencia, ncm,
    peso, altura, largura, comprimento, embalagem, imagem_url, preco, estoque,
    url, categoria, ean_caixa, origem, atualizado_em
) VALUES (
    'ideal:' || ?, 'ideal', ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, ?, ?, ?, ?,
    ?, ?, ?, ?, datetime('now')
)
ON CONFLICT(supplier, codigo) DO UPDATE SET
    nome=excluded.nome, descricao=excluded.descricao, marca=excluded.marca,
    ean=excluded.ean, referencia=excluded.referencia, ncm=excluded.ncm,
    peso=excluded.peso, altura=excluded.altura, largura=excluded.largura,
    comprimento=excluded.comprimento, embalagem=excluded.embalagem,
    imagem_url=excluded.imagem_url, preco=excluded.preco, estoque=excluded.estoque,
    url=excluded.url, categoria=excluded.categoria, ean_caixa=excluded.ean_caixa,
    origem=excluded.origem, atualizado_em=excluded.atualizado_em
"""


def connect():
    db = sqlite3.connect(str(DB_PATH), timeout=60, isolation_level="IMMEDIATE")
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA synchronous=NORMAL")
    db.execute("PRAGMA busy_timeout=30000")
    return db


def init():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = connect()
    db.executescript("""
        CREATE TABLE IF NOT EXISTS produtos (
            id TEXT PRIMARY KEY,
            supplier TEXT NOT NULL,
            codigo TEXT NOT NULL,
            nome TEXT NOT NULL,
            descricao TEXT,
            marca TEXT,
            ean TEXT,
            referencia TEXT,
            ncm TEXT,
            peso REAL,
            altura REAL,
            largura REAL,
            comprimento REAL,
            embalagem TEXT,
            imagem_url TEXT,
            preco REAL,
            estoque TEXT,
            lista TEXT,
            cfop TEXT,
            cst TEXT,
            icms REAL,
            origem_descricao TEXT,
            inf_adicionais TEXT,
            url TEXT,
            categoria TEXT,
            ean_caixa TEXT,
            origem TEXT,
            codigo_barras TEXT,
            codigo_barras_unit TEXT,
            codigo_barras_master TEXT,
            procedencia TEXT,
            reposicao INTEGER DEFAULT 0,
            atualizado_em TEXT,
            deleted_at TEXT,
            UNIQUE(supplier, codigo)
        );

        CREATE INDEX IF NOT EXISTS idx_produtos_supplier ON produtos(supplier);
        CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome);
        CREATE INDEX IF NOT EXISTS idx_produtos_marca ON produtos(marca);
        CREATE INDEX IF NOT EXISTS idx_produtos_ean ON produtos(ean);
        CREATE INDEX IF NOT EXISTS idx_produtos_deleted ON produtos(deleted_at);

        CREATE TABLE IF NOT EXISTS product_status_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            produto_id TEXT NOT NULL,
            supplier TEXT NOT NULL,
            evento TEXT NOT NULL,
            criado_em TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_status_log_produto ON product_status_log(produto_id);

        CREATE TABLE IF NOT EXISTS ideal_subcategorias (
            slug TEXT PRIMARY KEY,
            total_paginas INTEGER DEFAULT 0,
            produtos_encontrados INTEGER DEFAULT 0,
            status TEXT DEFAULT 'pendente',
            atualizado_em TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS ideal_produtos_queue (
            codigo TEXT PRIMARY KEY,
            url TEXT,
            nome TEXT,
            descricao TEXT,
            marca TEXT,
            categoria TEXT,
            ean TEXT,
            sku_fabricante TEXT,
            ncm TEXT,
            embalagem TEXT,
            ean_caixa TEXT,
            origem TEXT,
            altura_cm TEXT,
            largura_cm TEXT,
            comprimento_cm TEXT,
            peso_kg TEXT,
            imagem_url TEXT,
            preco REAL,
            disponivel INTEGER,
            dados_completos INTEGER DEFAULT 0,
            criado_em TEXT DEFAULT (datetime('now')),
            atualizado_em TEXT DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_ideal_produtos_pendentes ON ideal_produtos_queue(dados_completos);
    """)
    db.commit()
    db.close()


def upsert_subcategoria(db, slug, total_paginas, produtos_encontrados, status):
    db.execute("""
        INSERT INTO ideal_subcategorias (slug, total_paginas, produtos_encontrados, status)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(slug) DO UPDATE SET
            total_paginas = excluded.total_paginas,
            produtos_encontrados = excluded.produtos_encontrados,
            status = excluded.status,
            atualizado_em = datetime('now')
    """, (slug, total_paginas, produtos_encontrados, status))


def upsert_queue_produto(db, codigo, url, nome="", marca="", slug="", preco=None):
    db.execute("""
        INSERT INTO ideal_produtos_queue (codigo, url, nome, marca, preco)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(codigo) DO UPDATE SET
            url = COALESCE(NULLIF(excluded.url, ''), ideal_produtos_queue.url),
            nome = COALESCE(NULLIF(excluded.nome, ''), ideal_produtos_queue.nome),
            marca = COALESCE(NULLIF(excluded.marca, ''), ideal_produtos_queue.marca),
            preco = COALESCE(excluded.preco, ideal_produtos_queue.preco),
            atualizado_em = datetime('now')
    """, (codigo, url, nome, marca, preco))


def upsert_produto(db, data):
    """Upsert produto na tabela principal 'produtos'."""
    def _float(v):
        if not v or v == "":
            return None
        try:
            return float(str(v).replace(",", "."))
        except (ValueError, TypeError):
            return None

    db.execute(UPSERT_SQL, (
        str(data.get("codigo", "")),
        str(data.get("codigo", "")),
        data.get("nome", ""),
        data.get("descricao") or None,
        data.get("marca") or None,
        data.get("ean") or None,
        data.get("sku_fabricante") or None,
        data.get("ncm") or None,
        _float(data.get("peso_kg")),
        _float(data.get("altura_cm")),
        _float(data.get("largura_cm")),
        _float(data.get("comprimento_cm")),
        data.get("embalagem") or None,
        data.get("imagem_url") or None,
        _float(data.get("preco")),
        data.get("estoque") or None,
        data.get("url") or None,
        data.get("categoria") or None,
        data.get("ean_caixa") or None,
        data.get("origem") or None,
    ))


def count_queue(db):
    return db.execute("SELECT COUNT(*) FROM ideal_produtos_queue").fetchone()[0]


def count_pendentes(db):
    return db.execute("SELECT COUNT(*) FROM ideal_produtos_queue WHERE dados_completos = 0").fetchone()[0]


def count_completos(db):
    return db.execute("SELECT COUNT(*) FROM ideal_produtos_queue WHERE dados_completos = 1").fetchone()[0]


def claim_next_subcategoria(conn):
    conn.execute("BEGIN IMMEDIATE")
    row = conn.execute(
        "SELECT slug FROM ideal_subcategorias WHERE status = 'pendente' LIMIT 1"
    ).fetchone()
    if row:
        conn.execute(
            "UPDATE ideal_subcategorias SET status = 'processando' WHERE slug = ?",
            (row["slug"],),
        )
    conn.execute("COMMIT")
    return row["slug"] if row else None


def claim_next_produtos(conn, batch_size=50):
    conn.execute("BEGIN IMMEDIATE")
    rows = conn.execute(
        "SELECT codigo, url FROM ideal_produtos_queue WHERE dados_completos = 0 LIMIT ?",
        (batch_size,),
    ).fetchall()
    if rows:
        codigos = [r["codigo"] for r in rows]
        placeholders = ",".join("?" * len(codigos))
        conn.execute(
            f"UPDATE ideal_produtos_queue SET dados_completos = 2 WHERE codigo IN ({placeholders})",
            codigos,
        )
    conn.execute("COMMIT")
    return rows


def update_queue_dados(db, codigo, data):
    """Atualiza dados completos na fila e faz upsert na tabela principal."""
    db.execute("""
        UPDATE ideal_produtos_queue SET
            nome = ?, descricao = ?, marca = ?, categoria = ?,
            ean = ?, sku_fabricante = ?, ncm = ?, embalagem = ?,
            ean_caixa = ?, origem = ?,
            altura_cm = ?, largura_cm = ?, comprimento_cm = ?, peso_kg = ?,
            imagem_url = ?,
            preco = ?, disponivel = ?,
            dados_completos = 1,
            atualizado_em = datetime('now')
        WHERE codigo = ?
    """, (
        data.get("nome", ""), data.get("descricao", ""), data.get("marca", ""),
        data.get("categoria", ""), data.get("ean", ""), data.get("sku_fabricante", ""),
        data.get("ncm", ""), data.get("embalagem", ""), data.get("ean_caixa", ""),
        data.get("origem", ""), data.get("altura_cm", ""), data.get("largura_cm", ""),
        data.get("comprimento_cm", ""), data.get("peso_kg", ""), data.get("imagem_url", ""),
        data.get("preco"), data.get("disponivel"),
        codigo,
    ))
    upsert_produto(db, data)


def stats():
    db = connect()
    total = count_queue(db)
    completos = count_completos(db)
    subcats_ok = db.execute("SELECT COUNT(*) FROM ideal_subcategorias WHERE status = 'ok'").fetchone()[0]
    subcats_total = db.execute("SELECT COUNT(*) FROM ideal_subcategorias").fetchone()[0]
    marcas = db.execute("SELECT COUNT(DISTINCT marca) FROM ideal_produtos_queue WHERE marca != ''").fetchone()[0]
    com_ean = db.execute("SELECT COUNT(*) FROM ideal_produtos_queue WHERE ean != '' AND ean IS NOT NULL").fetchone()[0]

    print(f"\n  Banco: {DB_PATH}")
    print(f"  Fila: {total} ({completos} completos, {total - completos} pendentes)")
    print(f"  Subcategorias: {subcats_ok}/{subcats_total}")
    print(f"  Marcas: {marcas} | Com EAN: {com_ean}")

    print("\n  Top 10 marcas:")
    for row in db.execute(
        "SELECT marca, COUNT(*) as n FROM ideal_produtos_queue WHERE marca != '' GROUP BY marca ORDER BY n DESC LIMIT 10"
    ):
        print(f"    {row['marca']}: {row['n']}")

    print("\n  Top 10 categorias:")
    for row in db.execute(
        "SELECT categoria, COUNT(*) as n FROM ideal_produtos_queue WHERE categoria != '' GROUP BY categoria ORDER BY n DESC LIMIT 10"
    ):
        print(f"    {row['categoria']}: {row['n']}")

    db.close()
