#!/usr/bin/env bash
set -euo pipefail

# ── Config ────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="$PROJECT_ROOT/db/catalogo.db"
BASE_URL="https://www.atacadoideal.com.br"
DELAY=1.0
RETRIES=3
BATCH_SIZE=50
WORKERS=2

[[ -f "$PROJECT_ROOT/.env" ]] && { set -a; source "$PROJECT_ROOT/.env"; set +a; }

SESSION_COOKIE="${IDEAL_SESSION_COOKIE:-}"
USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
ACCEPT_HDR="text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
ACCEPT_LANG="pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"

# ── Logging ───────────────────────────────────────────────────
log() {
    local level="$1"; shift
    local prefix=""
    [[ -n "${WORKER_ID:-}" ]] && prefix="W${WORKER_ID} "
    echo "$(date +%H:%M:%S) ${prefix}${level} $*" >&2
}

# ── HTTP ──────────────────────────────────────────────────────
http_get() {
    local url="$1"
    local attempt=0

    local curl_args=(
        -sS --max-time 20
        -H "User-Agent: $USER_AGENT"
        -H "Accept: $ACCEPT_HDR"
        -H "Accept-Language: $ACCEPT_LANG"
    )
    [[ -n "$SESSION_COOKIE" ]] && curl_args+=(-b "PHPSESSID=$SESSION_COOKIE")

    while (( attempt < RETRIES )); do
        local body http_code
        body=$(curl "${curl_args[@]}" -o - -w '\n%{http_code}' "$url" 2>/dev/null) || {
            attempt=$((attempt + 1))
            log "WARN" "Curl error: $url (tentativa $attempt)"
            (( attempt < RETRIES )) && sleep $((2 ** (attempt - 1)))
            continue
        }
        http_code=$(echo "$body" | tail -1)
        body=$(echo "$body" | sed '$d')

        if [[ "$http_code" == "200" ]]; then
            echo "$body"
            return 0
        elif [[ "$http_code" == "404" ]]; then
            log "WARN" "404: $url"
            return 1
        else
            log "WARN" "$http_code: $url (tentativa $((attempt + 1)))"
        fi
        attempt=$((attempt + 1))
        (( attempt < RETRIES )) && sleep $((2 ** (attempt - 1)))
    done
    return 1
}

# ── Database ──────────────────────────────────────────────────
db_exec() {
    sqlite3 "$DB_PATH" -cmd ".timeout 30000" "$@"
}

db_query() {
    sqlite3 "$DB_PATH" -cmd ".timeout 30000" -separator $'\t' "$@"
}

db_init() {
    mkdir -p "$(dirname "$DB_PATH")"
    db_exec "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;" >/dev/null 2>&1
    db_exec <<'DDL'
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
CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    produto_id TEXT NOT NULL,
    supplier TEXT NOT NULL,
    preco_anterior REAL,
    preco_novo REAL NOT NULL,
    criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_price_history_produto ON price_history(produto_id);
CREATE TRIGGER IF NOT EXISTS trg_price_change
AFTER UPDATE ON produtos
FOR EACH ROW
WHEN NEW.preco IS NOT NULL AND OLD.preco IS NOT NEW.preco
BEGIN
    INSERT INTO price_history (produto_id, supplier, preco_anterior, preco_novo)
    VALUES (NEW.id, NEW.supplier, OLD.preco, NEW.preco);
END;
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
DDL
}

# ── SQL helpers ───────────────────────────────────────────────
sql_escape() {
    local s="$1"
    s="${s//\'/\'\'}"
    echo "$s"
}

null_or_str() {
    [[ -n "$1" ]] && echo "'$(sql_escape "$1")'" || echo "NULL"
}

null_or_float() {
    local v="$1"
    [[ -z "$v" ]] && { echo "NULL"; return; }
    v="${v/,/.}"
    echo "$v" | grep -qE '^[0-9]+(\.[0-9]+)?$' && echo "$v" || echo "NULL"
}

# ── Atomic claims ─────────────────────────────────────────────
db_claim_next_subcategoria() {
    sqlite3 "$DB_PATH" -cmd ".timeout 30000" <<'SQL'
BEGIN IMMEDIATE;
CREATE TEMP TABLE IF NOT EXISTS _claimed(slug TEXT);
DELETE FROM _claimed;
INSERT INTO _claimed(slug)
    SELECT slug FROM ideal_subcategorias WHERE status = 'pendente' LIMIT 1;
UPDATE ideal_subcategorias
    SET status = 'processando', atualizado_em = datetime('now')
    WHERE slug = (SELECT slug FROM _claimed) AND (SELECT slug FROM _claimed) IS NOT NULL;
SELECT slug FROM _claimed;
COMMIT;
SQL
}

db_claim_next_produtos() {
    sqlite3 "$DB_PATH" -cmd ".timeout 30000" -separator $'\t' <<'SQL'
BEGIN IMMEDIATE;
CREATE TEMP TABLE IF NOT EXISTS _batch(codigo TEXT, url TEXT);
DELETE FROM _batch;
INSERT INTO _batch(codigo, url)
    SELECT codigo, url FROM ideal_produtos_queue
    WHERE dados_completos = 0 LIMIT 50;
UPDATE ideal_produtos_queue
    SET dados_completos = 2
    WHERE codigo IN (SELECT codigo FROM _batch);
SELECT codigo, url FROM _batch;
COMMIT;
SQL
}

# ── Phase 1: Collect ─────────────────────────────────────────
get_subcategory_slugs() {
    local html
    html=$(http_get "$BASE_URL/") || return 1

    echo "$html" \
        | grep -oE 'href="https://www\.atacadoideal\.com\.br/[^"]+"' \
        | sed 's|href="https://www\.atacadoideal\.com\.br/||; s|"$||' \
        | grep -E '^[a-z0-9][a-z0-9/-]*[a-z0-9]$' \
        | grep '/' \
        | grep -vE '^(quemsomos|politica|igualdade|marcas|novidades|promocoes|vem-ai|m/|components/|controllers/|c/)' \
        | sort -u
}

seed_subcategorias() {
    local slugs="$1"
    [[ -z "$slugs" ]] && return
    {
        echo "BEGIN IMMEDIATE;"
        while IFS= read -r slug; do
            [[ -z "$slug" ]] && continue
            echo "INSERT OR IGNORE INTO ideal_subcategorias (slug) VALUES ('${slug}');"
        done <<< "$slugs"
        echo "COMMIT;"
    } | db_exec
}

get_pagination_info() {
    local html="$1"
    local pages
    pages=$(echo "$html" | grep -oE 'data-pages="[0-9]+"' | grep -oE '[0-9]+' | head -1)
    echo "${pages:-1}"
}

parse_products_from_html() {
    local html="$1"
    local tmpdir
    tmpdir=$(mktemp -d)
    echo "$html" > "$tmpdir/page.html"

    # Extract codes and URLs from product links
    grep -oE 'href="https://www\.atacadoideal\.com\.br/[a-z0-9-]+-[0-9]+-[0-9]+"' "$tmpdir/page.html" \
        | sed 's/href="//;s/"$//' \
        | awk -F/ '{
            n = split($NF, a, "-")
            code = a[n-1]
            print code "\t" $0
        }' | sort -u -k1,1 > "$tmpdir/urls.tsv"

    # Extract card data: codigo, nome, marca
    grep -oE 'data-codigo-produto="[0-9]+"[^>]*data-nome="[^"]*"[^>]*data-marca="[^"]*"' "$tmpdir/page.html" \
        | sed -E 's/data-codigo-produto="([0-9]+)"[^>]*data-nome="([^"]*)"[^>]*data-marca="([^"]*)"/\1\t\2\t\3/' \
        | sort -u -k1,1 > "$tmpdir/cards.tsv"

    # Extract card data: codigo, preco
    grep -oE 'data-codigo-produto="[0-9]+"[^>]*data-preco="[0-9.]+"' "$tmpdir/page.html" \
        | sed -E 's/data-codigo-produto="([0-9]+)"[^>]*data-preco="([0-9.]+)"/\1\t\2/' \
        | sort -u -k1,1 > "$tmpdir/precos.tsv"

    # Join urls + cards + precos
    join -t $'\t' -a1 "$tmpdir/urls.tsv" "$tmpdir/cards.tsv" \
        | join -t $'\t' -a1 - "$tmpdir/precos.tsv"

    rm -rf "$tmpdir"
}

flush_to_db() {
    local products_file="$1"
    local slug="$2"
    local pages="$3"
    local status="${4:-ok}"
    local count
    count=$(wc -l < "$products_file" | tr -d ' ')

    {
        echo "BEGIN IMMEDIATE;"
        while IFS=$'\t' read -r code url nome marca preco; do
            [[ -z "$code" ]] && continue
            printf "INSERT INTO ideal_produtos_queue (codigo, url, nome, marca, preco) VALUES ('%s', '%s', '%s', '%s', %s) ON CONFLICT(codigo) DO UPDATE SET url = COALESCE(NULLIF(excluded.url, ''), ideal_produtos_queue.url), nome = COALESCE(NULLIF(excluded.nome, ''), ideal_produtos_queue.nome), marca = COALESCE(NULLIF(excluded.marca, ''), ideal_produtos_queue.marca), preco = COALESCE(excluded.preco, ideal_produtos_queue.preco), atualizado_em = datetime('now');\n" \
                "$code" "$(sql_escape "$url")" "$(sql_escape "${nome:-}")" "$(sql_escape "${marca:-}")" "${preco:-NULL}"
        done < "$products_file"
        printf "INSERT INTO ideal_subcategorias (slug, total_paginas, produtos_encontrados, status) VALUES ('%s', %d, %d, '%s') ON CONFLICT(slug) DO UPDATE SET total_paginas = excluded.total_paginas, produtos_encontrados = excluded.produtos_encontrados, status = excluded.status, atualizado_em = datetime('now');\n" \
            "$slug" "$pages" "$count" "$status"
        echo "COMMIT;"
    } | db_exec
}

run_collect() {
    local slugs
    slugs=$(get_subcategory_slugs)
    local total
    total=$(echo "$slugs" | grep -c . || true)
    log "INFO" "Encontradas $total subcategorias"

    seed_subcategorias "$slugs"
    log "INFO" "Iniciando $total subcategorias via fila"

    local processed=0
    while true; do
        local slug
        slug=$(db_claim_next_subcategoria) || break
        [[ -z "$slug" ]] && break

        processed=$((processed + 1))
        local slug_start
        slug_start=$(date +%s)

        local html
        html=$(http_get "$BASE_URL/$slug") || {
            db_exec "UPDATE ideal_subcategorias SET status = 'erro', atualizado_em = datetime('now') WHERE slug = '${slug}';"
            continue
        }

        local pages
        pages=$(get_pagination_info "$html")

        local tmpdir
        tmpdir=$(mktemp -d)
        parse_products_from_html "$html" > "$tmpdir/products.tsv"

        for ((page=2; page<=pages; page++)); do
            sleep "$DELAY"
            local page_html
            page_html=$(http_get "$BASE_URL/$slug?page=${page}&slug=${slug}") || {
                log "WARN" "$slug pag $page/$pages: falhou"
                break
            }
            parse_products_from_html "$page_html" >> "$tmpdir/products.tsv"
            [[ -s "$tmpdir/products.tsv" ]] || break
        done

        sort -u -k1,1 "$tmpdir/products.tsv" -o "$tmpdir/products.tsv"
        flush_to_db "$tmpdir/products.tsv" "$slug" "$pages"

        local slug_time=$(( $(date +%s) - slug_start ))
        local product_count
        product_count=$(wc -l < "$tmpdir/products.tsv" | tr -d ' ')
        local pendentes
        pendentes=$(db_exec "SELECT COUNT(*) FROM ideal_subcategorias WHERE status = 'pendente';")
        local total_produtos
        total_produtos=$(db_exec "SELECT COUNT(*) FROM ideal_produtos_queue;")
        log "INFO" "[$processed feitas | $pendentes na fila] $slug -> $product_count produtos ($pages pags, ${slug_time}s) | DB: $total_produtos"

        rm -rf "$tmpdir"
        sleep "$DELAY"
    done

    local total_produtos
    total_produtos=$(db_exec "SELECT COUNT(*) FROM ideal_produtos_queue;")
    log "INFO" "Fase 1 completa: $total_produtos produtos unicos no banco"
}

# ── Phase 2: Extract ──────────────────────────────────────────
extract_json_ld_product() {
    local html="$1"
    echo "$html" \
        | awk '/<script type="application\/ld\+json">/ { found=1; next } found && /<\/script>/ { found=0; exit } found { print }' \
        | tr -d '\r' \
        | tr '\n' ' ' \
        | jq 'select(."@type" == "Product")' 2>/dev/null
}

extract_feature() {
    local html="$1"
    local cls="$2"
    local match
    match=$(echo "$html" | sed -n "s/.*<li class=\"product__features--${cls}\">\\(.*\\)<\\/li>.*/\\1/p" | head -1) || return
    [[ -z "$match" ]] && return
    local text
    text=$(echo "$match" | sed 's/<[^>]*>//g' | xargs)
    echo "$text" | sed 's/^[^:]*:[[:space:]]*//'
}

extract_dimension() {
    local html="$1"
    local cls="$2"
    local match
    match=$(echo "$html" | sed -n "s/.*<li class=\"product__dimensions--${cls}\">\\(.*\\)<\\/li>.*/\\1/p" | head -1) || return
    [[ -z "$match" ]] && return
    local text
    text=$(echo "$match" | sed 's/<[^>]*>//g' | xargs)
    echo "$text" | grep -oE '[0-9]+([.,][0-9]+)?' | head -1 | tr ',' '.'
}

parse_product_page() {
    local url="$1"
    local codigo="$2"

    local html
    html=$(http_get "$url") || return 1

    local json_ld
    json_ld=$(extract_json_ld_product "$html")

    local nome="" descricao="" imagem_url="" ean="" sku_fabricante=""
    local altura="" largura="" comprimento="" peso="" marca="" categoria=""
    local preco="" disponivel="0"

    if [[ -n "$json_ld" ]]; then
        nome=$(echo "$json_ld" | jq -r '.name // ""')
        descricao=$(echo "$json_ld" | jq -r '.description // ""')
        imagem_url=$(echo "$json_ld" | jq -r '.image // ""')
        ean=$(echo "$json_ld" | jq -r '.gtin13 // ""')
        sku_fabricante=$(echo "$json_ld" | jq -r '.mpn // ""')
        altura=$(echo "$json_ld" | jq -r '.height // ""')
        largura=$(echo "$json_ld" | jq -r '.width // ""')
        comprimento=$(echo "$json_ld" | jq -r '.depth // ""')
        peso=$(echo "$json_ld" | jq -r '.weight // ""')
        marca=$(echo "$json_ld" | jq -r '.brand.name // ""')
        categoria=$(echo "$json_ld" | jq -r '.category // ""')
        preco=$(echo "$json_ld" | jq -r '.offers.price // ""')
        local avail
        avail=$(echo "$json_ld" | jq -r '.offers.availability // ""')
        [[ "$avail" == *"InStock"* ]] && disponivel="1"
    fi

    # Fallback features
    [[ -z "$marca" ]] && marca=$(extract_feature "$html" "marca") || true
    local ncm=""
    ncm=$(extract_feature "$html" "ncm") || true
    local embalagem=""
    embalagem=$(extract_feature "$html" "embalagem-nome") || true
    local ean_caixa=""
    ean_caixa=$(extract_feature "$html" "embalagem-ean") || true
    local origem=""
    origem=$(extract_feature "$html" "origem") || true

    # Fallback dimensions
    [[ -z "$altura" ]] && { altura=$(extract_dimension "$html" "altura") || true; }
    [[ -z "$largura" ]] && { largura=$(extract_dimension "$html" "largura") || true; }
    [[ -z "$comprimento" ]] && { comprimento=$(extract_dimension "$html" "comprimento") || true; }
    [[ -z "$peso" ]] && { peso=$(extract_dimension "$html" "peso") || true; }

    printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
        "$codigo" "$url" "$nome" "$descricao" "$marca" "$categoria" \
        "$ean" "$sku_fabricante" "$ncm" "$embalagem" "$ean_caixa" "$origem" \
        "$altura" "$largura" "$comprimento" "$peso" "$imagem_url" "$preco" "$disponivel"
}

flush_extract_results() {
    local results="$1"
    [[ -z "$results" ]] && return

    {
        echo "BEGIN IMMEDIATE;"
        while IFS=$'\t' read -r codigo url nome descricao marca categoria \
            ean sku_fabricante ncm embalagem ean_caixa origem \
            altura largura comprimento peso imagem_url preco disponivel; do
            [[ -z "$codigo" ]] && continue

            printf "UPDATE ideal_produtos_queue SET nome='%s', descricao='%s', marca='%s', categoria='%s', ean='%s', sku_fabricante='%s', ncm='%s', embalagem='%s', ean_caixa='%s', origem='%s', altura_cm='%s', largura_cm='%s', comprimento_cm='%s', peso_kg='%s', imagem_url='%s', preco=%s, disponivel=%s, dados_completos=1, atualizado_em=datetime('now') WHERE codigo='%s';\n" \
                "$(sql_escape "$nome")" "$(sql_escape "$descricao")" "$(sql_escape "$marca")" "$(sql_escape "$categoria")" \
                "$(sql_escape "$ean")" "$(sql_escape "$sku_fabricante")" "$(sql_escape "$ncm")" "$(sql_escape "$embalagem")" \
                "$(sql_escape "$ean_caixa")" "$(sql_escape "$origem")" \
                "$(sql_escape "$altura")" "$(sql_escape "$largura")" "$(sql_escape "$comprimento")" "$(sql_escape "$peso")" \
                "$(sql_escape "$imagem_url")" "$(null_or_float "$preco")" "$(null_or_str "$disponivel")" "$codigo"

            printf "INSERT INTO produtos (id, supplier, codigo, nome, descricao, marca, ean, referencia, ncm, peso, altura, largura, comprimento, embalagem, imagem_url, preco, estoque, url, categoria, ean_caixa, origem, atualizado_em) VALUES ('ideal:%s', 'ideal', '%s', '%s', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, '%s', %s, %s, %s, datetime('now')) ON CONFLICT(supplier, codigo) DO UPDATE SET nome=excluded.nome, descricao=excluded.descricao, marca=excluded.marca, ean=excluded.ean, referencia=excluded.referencia, ncm=excluded.ncm, peso=excluded.peso, altura=excluded.altura, largura=excluded.largura, comprimento=excluded.comprimento, embalagem=excluded.embalagem, imagem_url=excluded.imagem_url, preco=excluded.preco, estoque=excluded.estoque, url=excluded.url, categoria=excluded.categoria, ean_caixa=excluded.ean_caixa, origem=excluded.origem, atualizado_em=excluded.atualizado_em;\n" \
                "$codigo" "$codigo" "$(sql_escape "$nome")" "$(null_or_str "$descricao")" "$(null_or_str "$marca")" \
                "$(null_or_str "$ean")" "$(null_or_str "$sku_fabricante")" "$(null_or_str "$ncm")" \
                "$(null_or_float "$peso")" "$(null_or_float "$altura")" "$(null_or_float "$largura")" \
                "$(null_or_float "$comprimento")" "$(null_or_str "$embalagem")" "$(null_or_str "$imagem_url")" \
                "$(null_or_float "$preco")" "$(null_or_str "$disponivel")" \
                "$(sql_escape "$url")" "$(null_or_str "$categoria")" "$(null_or_str "$ean_caixa")" "$(null_or_str "$origem")"
        done <<< "$results"
        echo "COMMIT;"
    } | db_exec
}

run_extract() {
    local pendentes completos
    completos=$(db_exec "SELECT COUNT(*) FROM ideal_produtos_queue WHERE dados_completos = 1;")
    pendentes=$(db_exec "SELECT COUNT(*) FROM ideal_produtos_queue WHERE dados_completos = 0;")
    log "INFO" "Fase 2: $completos completos, $pendentes pendentes"

    [[ "$pendentes" -eq 0 ]] && { log "INFO" "Nenhum produto pendente."; return; }

    local processed=0 errors=0

    while true; do
        local batch
        batch=$(db_claim_next_produtos) || break
        [[ -z "$batch" ]] && break

        local batch_start results=""
        batch_start=$(date +%s)

        while IFS=$'\t' read -r codigo url; do
            local data
            if data=$(parse_product_page "$url" "$codigo"); then
                results+="${data}"$'\n'
            else
                errors=$((errors + 1))
            fi
            sleep "$DELAY"
        done <<< "$batch"

        flush_extract_results "$results"

        local batch_size
        batch_size=$(echo "$batch" | wc -l | tr -d ' ')
        processed=$((processed + batch_size))
        local remaining
        remaining=$(db_exec "SELECT COUNT(*) FROM ideal_produtos_queue WHERE dados_completos = 0;")
        log "INFO" "[$processed extraidos | $remaining na fila] batch: $batch_size prods ($(($(date +%s) - batch_start))s) | erros: $errors"
    done

    local total_completos
    total_completos=$(db_exec "SELECT COUNT(*) FROM ideal_produtos_queue WHERE dados_completos = 1;")
    log "INFO" "Fase 2 completa: $total_completos produtos com dados | $errors erros"
}

# ── Orchestration ─────────────────────────────────────────────
spawn_workers() {
    local fn="$1"

    if (( WORKERS <= 1 )); then
        "$fn"
        return
    fi

    local pids=()
    for ((i=1; i<=WORKERS; i++)); do
        WORKER_ID=$i "$fn" &
        pids+=($!)
    done

    for pid in "${pids[@]}"; do
        wait "$pid" || true
    done
}

get_all_ideal_codes() {
    local codes
    codes=$(db_query "SELECT codigo FROM produtos WHERE supplier = 'ideal' AND deleted_at IS NULL;")
    if [[ -z "$codes" ]]; then
        echo "[]"
    else
        echo "$codes" | jq -R . | jq -s .
    fi
}

cmd_stats() {
    local total completos subcats_ok subcats_total marcas com_ean
    total=$(db_exec "SELECT COUNT(*) FROM ideal_produtos_queue;")
    completos=$(db_exec "SELECT COUNT(*) FROM ideal_produtos_queue WHERE dados_completos = 1;")
    subcats_ok=$(db_exec "SELECT COUNT(*) FROM ideal_subcategorias WHERE status = 'ok';")
    subcats_total=$(db_exec "SELECT COUNT(*) FROM ideal_subcategorias;")
    marcas=$(db_exec "SELECT COUNT(DISTINCT marca) FROM ideal_produtos_queue WHERE marca != '';")
    com_ean=$(db_exec "SELECT COUNT(*) FROM ideal_produtos_queue WHERE ean != '' AND ean IS NOT NULL;")

    cat >&2 <<EOF
  Banco: $DB_PATH
  Fila: $total ($completos completos, $((total - completos)) pendentes)
  Subcategorias: $subcats_ok/$subcats_total
  Marcas: $marcas | Com EAN: $com_ean

  Top 10 marcas:
$(db_query "SELECT marca, COUNT(*) as n FROM ideal_produtos_queue WHERE marca != '' GROUP BY marca ORDER BY n DESC LIMIT 10;" | awk -F'\t' '{printf "    %s: %s\n", $1, $2}')

  Top 10 categorias:
$(db_query "SELECT categoria, COUNT(*) as n FROM ideal_produtos_queue WHERE categoria != '' GROUP BY categoria ORDER BY n DESC LIMIT 10;" | awk -F'\t' '{printf "    %s: %s\n", $1, $2}')
EOF
}

cmd_test() {
    log "INFO" "Modo teste: artesanato/colas..."
    local html
    html=$(http_get "$BASE_URL/artesanato/colas") || return
    local pages
    pages=$(get_pagination_info "$html")

    local tmpdir
    tmpdir=$(mktemp -d)
    parse_products_from_html "$html" > "$tmpdir/all.tsv"

    for ((page=2; page<=pages; page++)); do
        sleep "$DELAY"
        local page_html
        page_html=$(http_get "$BASE_URL/artesanato/colas?page=${page}&slug=artesanato/colas") || continue
        parse_products_from_html "$page_html" >> "$tmpdir/all.tsv"
    done

    local count
    count=$(wc -l < "$tmpdir/all.tsv" | tr -d ' ')
    log "INFO" "Encontrados $count produtos ($pages pags)"

    if (( count > 0 )); then
        local first_code first_url
        IFS=$'\t' read -r first_code first_url _ < <(head -1 "$tmpdir/all.tsv")
        local data
        data=$(parse_product_page "$first_url" "$first_code")
        # Print TSV as simple key=value for readability
        echo "$data" | awk -F'\t' '{
            split("codigo,url,nome,descricao,marca,categoria,ean,sku_fabricante,ncm,embalagem,ean_caixa,origem,altura,largura,comprimento,peso,imagem_url,preco,disponivel", keys, ",")
            for (i = 1; i <= NF; i++) printf "  %-20s %s\n", keys[i] ":", $i
        }' >&2
    fi
    rm -rf "$tmpdir"
}

# ── Main ──────────────────────────────────────────────────────
main() {
    local command=""
    while [[ $# -gt 0 ]]; do
        case "$1" in
            full|urls|extract|test|stats) command="$1"; shift ;;
            -p|--parallel) WORKERS="${2:-2}"; shift 2 ;;
            *) echo "Uso: $0 <full|urls|extract|test|stats> [-p N]" >&2; exit 1 ;;
        esac
    done

    [[ -z "$command" ]] && { echo "Uso: $0 <full|urls|extract|test|stats> [-p N]" >&2; exit 1; }

    # Prioridade baixa: não compete com outros processos do Pi
    renice -n 19 -p $$ >/dev/null 2>&1 || true
    ionice -c 3 -p $$ >/dev/null 2>&1 || true

    # Verifica se sessão é válida antes de raspar
    if [[ "$command" != "stats" ]]; then
        local preco_teste
        preco_teste=$(http_get "$BASE_URL/artesanato/colas" | grep -oE 'data-preco="[0-9.]+"' | head -20)
        local tem_preco
        tem_preco=$(echo "$preco_teste" | grep -vE 'data-preco="0\.00"' | head -1)
        if [[ -z "$tem_preco" ]]; then
            log "ERROR" "Sessão inválida! Preços vieram 0.00 — verifique IDEAL_SESSION_COOKIE no .env"
            exit 1
        fi
        log "INFO" "Sessão OK — preços detectados"
    fi

    db_init

    case "$command" in
        test)    cmd_test ;;
        stats)   cmd_stats ;;
        urls)    spawn_workers run_collect ;;
        extract) spawn_workers run_extract ;;
        full)
            spawn_workers run_collect
            log "INFO" "──────────────────────────────────────────────────"
            log "INFO" "Fase 1 finalizada. Iniciando fase 2..."
            log "INFO" "──────────────────────────────────────────────────"
            spawn_workers run_extract
            get_all_ideal_codes
            ;;
    esac

    log "INFO" "Done!"
}

main "$@"
