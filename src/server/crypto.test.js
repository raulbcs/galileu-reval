import { describe, it, expect, vi } from 'vitest'
import { signSession, verifySession, parseCookies, cachePath } from './crypto'

describe('signSession / verifySession', () => {
  it('assina e verifica uma sessão válida', () => {
    const payload = { exp: Date.now() + 3600000 }
    const cookie = signSession(payload)
    const result = verifySession(cookie)
    expect(result).toMatchObject({ exp: payload.exp })
  })

  it('rejeita cookie adulterado', () => {
    const payload = { exp: Date.now() + 3600000 }
    const cookie = signSession(payload)
    const tampered = cookie + 'x'
    expect(verifySession(tampered)).toBeNull()
  })

  it('rejeita sessão expirada', () => {
    const payload = { exp: Date.now() - 1000 }
    const cookie = signSession(payload)
    expect(verifySession(cookie)).toBeNull()
  })

  it('rejeita cookie malformado (sem ponto)', () => {
    expect(verifySession('invalid')).toBeNull()
  })

  it('rejeita cookie vazio', () => {
    expect(verifySession('')).toBeNull()
  })

  it('rejeita cookie null', () => {
    expect(verifySession(null)).toBeNull()
  })

  it('rejeita cookie com data válida mas assinatura inválida', () => {
    const payload = { exp: Date.now() + 3600000 }
    const cookie = signSession(payload)
    const [data] = cookie.split('.')
    expect(verifySession(`${data}.fakesignature`)).toBeNull()
  })
})

describe('parseCookies', () => {
  it('faz parse de cookie header simples', () => {
    const req = { headers: { cookie: 'session=abc123' } }
    expect(parseCookies(req)).toEqual({ session: 'abc123' })
  })

  it('faz parse de múltiplos cookies', () => {
    const req = { headers: { cookie: 'session=abc; theme=dark' } }
    expect(parseCookies(req)).toEqual({ session: 'abc', theme: 'dark' })
  })

  it('lida com valor contendo =', () => {
    const req = { headers: { cookie: 'token=abc=def=' } }
    expect(parseCookies(req)).toEqual({ token: 'abc=def=' })
  })

  it('retorna objeto vazio para header sem cookie', () => {
    const req = { headers: {} }
    expect(parseCookies(req)).toEqual({})
  })

  it('retorna objeto vazio para cookie vazio', () => {
    const req = { headers: { cookie: '' } }
    expect(parseCookies(req)).toEqual({})
  })
})

describe('cachePath', () => {
  it('gera path determinístico com MD5', () => {
    const result = cachePath('api', '/api/produto/get-all')
    expect(result).toMatch(/cache\/api\/[0-9a-f]{32}$/)
  })

  it('mesma chave gera mesmo path', () => {
    expect(cachePath('api', '/foo')).toBe(cachePath('api', '/foo'))
  })

  it('chaves diferentes geram paths diferentes', () => {
    expect(cachePath('api', '/foo')).not.toBe(cachePath('api', '/bar'))
  })

  it('usa o prefixo correto', () => {
    expect(cachePath('images', '/x')).toContain('/images/')
    expect(cachePath('api', '/x')).toContain('/api/')
  })
})
