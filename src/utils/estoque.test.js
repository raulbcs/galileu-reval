import { describe, it, expect } from 'vitest'
import { traduzirEstoque } from './estoque'

describe('traduzirEstoque', () => {
  it('traduz código "Qtd" para "Menos de 30 un"', () => {
    expect(traduzirEstoque('Qtd')).toBe('Menos de 30 un')
  })

  it('traduz código "R" para "30 a 50 un"', () => {
    expect(traduzirEstoque('R')).toBe('30 a 50 un')
  })

  it('traduz código "N" para "50 a 100 un"', () => {
    expect(traduzirEstoque('N')).toBe('50 a 100 un')
  })

  it('traduz código "A" para "100 a 250 un"', () => {
    expect(traduzirEstoque('A')).toBe('100 a 250 un')
  })

  it('traduz código "G" para "Mais de 250 un"', () => {
    expect(traduzirEstoque('G')).toBe('Mais de 250 un')
  })

  it('retorna o próprio código quando não está no mapa', () => {
    expect(traduzirEstoque('X')).toBe('X')
  })

  it('retorna string vazia quando recebe string vazia', () => {
    expect(traduzirEstoque('')).toBe('')
  })
})
