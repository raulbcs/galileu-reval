import { describe, it, expect } from 'vitest'
import { buildUrl, readUrl } from './routing'

describe('buildUrl', () => {
  it('retorna / para tab home sem filtro', () => {
    expect(buildUrl('home')).toBe('/')
  })

  it('retorna / para tab undefined', () => {
    expect(buildUrl(undefined)).toBe('/')
  })

  it('retorna /tab para tab sem filtro', () => {
    expect(buildUrl('produtos')).toBe('/produtos')
    expect(buildUrl('categorias')).toBe('/categorias')
  })

  it('retorna /tab/filter com filtro codificado', () => {
    expect(buildUrl('categorias', 'Foo Bar')).toBe('/categorias/Foo%20Bar')
    expect(buildUrl('fornecedores', 'A&B')).toBe('/fornecedores/A%26B')
  })

  it('prioriza produto sobre tab e filter', () => {
    expect(buildUrl('produtos', 'x', '123')).toBe('/produto/123')
    expect(buildUrl(undefined, undefined, 'ABC')).toBe('/produto/ABC')
  })
})

describe('readUrl', () => {
  it('retorna tab home para /', () => {
    expect(readUrl('/')).toEqual({ tab: 'home', filter: null, produto: null })
  })

  it('retorna tab correta para /produtos', () => {
    expect(readUrl('/produtos')).toEqual({ tab: 'produtos', filter: null, produto: null })
  })

  it('retorna tab + filter para /categorias/Foo%20Bar', () => {
    expect(readUrl('/categorias/Foo%20Bar')).toEqual({ tab: 'categorias', filter: 'Foo Bar', produto: null })
  })

  it('retorna produto para /produto/123', () => {
    expect(readUrl('/produto/123')).toEqual({ tab: null, filter: null, produto: '123' })
  })

  it('retorna tab home para path desconhecido', () => {
    expect(readUrl('/xyz')).toEqual({ tab: 'home', filter: null, produto: null })
  })

  it('strip trailing slashes', () => {
    expect(readUrl('/produtos/')).toEqual({ tab: 'produtos', filter: null, produto: null })
  })
})
