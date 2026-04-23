export const BASE_URL = 'https://www.atacadoideal.com.br'
export const DELAY = 500
export const CONCURRENCY = 10

export const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
}

export const SESSION_COOKIE = process.env.IDEAL_SESSION_COOKIE || ''
