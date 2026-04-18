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
    expect(buildUrl('simulador')).toBe('/simulador')
  })

  it('retorna /tab/filter com filtro codificado', () => {
    expect(buildUrl('produtos', 'Foo Bar')).toBe('/produtos/Foo%20Bar')
    expect(buildUrl('produtos', 'A&B')).toBe('/produtos/A%26B')
  })

  it('prioriza produto sobre tab e filter', () => {
    expect(buildUrl('produtos', 'x', '123')).toBe('/produto/123')
    expect(buildUrl(undefined, undefined, 'ABC')).toBe('/produto/ABC')
  })

  it('retorna /produto/supplier/codigo com supplier', () => {
    expect(buildUrl(null, null, '123', 'ideal')).toBe('/produto/ideal/123')
    expect(buildUrl(null, null, '456', 'reval')).toBe('/produto/reval/456')
  })

  it('retorna /produto/codigo sem supplier (legacy)', () => {
    expect(buildUrl(null, null, '123')).toBe('/produto/123')
  })
})

describe('readUrl', () => {
  it('retorna tab home para /', () => {
    expect(readUrl('/')).toEqual({ tab: 'home', filter: null, produto: null, supplier: null })
  })

  it('retorna tab correta para /produtos', () => {
    expect(readUrl('/produtos')).toEqual({ tab: 'produtos', filter: null, produto: null, supplier: null })
  })

  it('retorna tab + filter para /produtos/Foo%20Bar', () => {
    expect(readUrl('/produtos/Foo%20Bar')).toEqual({ tab: 'produtos', filter: 'Foo Bar', produto: null, supplier: null })
  })

  it('retorna produto legacy para /produto/123 (default reval)', () => {
    expect(readUrl('/produto/123')).toEqual({ tab: null, filter: null, produto: '123', supplier: 'reval' })
  })

  it('retorna produto com supplier para /produto/ideal/456', () => {
    expect(readUrl('/produto/ideal/456')).toEqual({ tab: null, filter: null, produto: '456', supplier: 'ideal' })
  })

  it('retorna tab home para path desconhecido', () => {
    expect(readUrl('/xyz')).toEqual({ tab: 'home', filter: null, produto: null, supplier: null })
  })

  it('strip trailing slashes', () => {
    expect(readUrl('/produtos/')).toEqual({ tab: 'produtos', filter: null, produto: null, supplier: null })
  })
})
