import { describe, it, expect } from 'vitest'
import { parseInput } from './parser'

describe('parseInput', () => {
  const mesDefault = '2025-01'

  describe('valores decimais BR', () => {
    it('deve parsear valor com vírgula: "Netflix 55,90"', () => {
      const result = parseInput('Netflix 55,90', mesDefault)
      expect(result.lancamentos).toHaveLength(1)
      expect(result.lancamentos[0].nome).toBe('Netflix')
      expect(result.lancamentos[0].valor).toBe(55.90)
    })

    it('deve parsear valor inteiro: "Aluguel 1500"', () => {
      const result = parseInput('Aluguel 1500', mesDefault)
      expect(result.lancamentos).toHaveLength(1)
      expect(result.lancamentos[0].nome).toBe('Aluguel')
      expect(result.lancamentos[0].valor).toBe(1500)
    })

    it('deve parsear valor pequeno: "Taxa 1"', () => {
      const result = parseInput('Taxa 1', mesDefault)
      expect(result.lancamentos).toHaveLength(1)
      expect(result.lancamentos[0].nome).toBe('Taxa')
      expect(result.lancamentos[0].valor).toBe(1)
    })
  })

  describe('formato milhar BR', () => {
    it('deve parsear milhar BR: "Carro 45.000"', () => {
      const result = parseInput('Carro 45.000', mesDefault)
      expect(result.lancamentos).toHaveLength(1)
      expect(result.lancamentos[0].nome).toBe('Carro')
      expect(result.lancamentos[0].valor).toBe(45000)
    })

    it('deve parsear milhões BR: "Apartamento 1.500.000"', () => {
      const result = parseInput('Apartamento 1.500.000', mesDefault)
      expect(result.lancamentos).toHaveLength(1)
      expect(result.lancamentos[0].nome).toBe('Apartamento')
      expect(result.lancamentos[0].valor).toBe(1500000)
    })
  })

  describe('múltiplos itens', () => {
    it('deve parsear itens separados por vírgula: "Netflix 55,90, Spotify 19,90"', () => {
      const result = parseInput('Netflix 55,90, Spotify 19,90', mesDefault)
      expect(result.lancamentos).toHaveLength(2)
      expect(result.lancamentos[0].nome).toBe('Netflix')
      expect(result.lancamentos[0].valor).toBe(55.90)
      expect(result.lancamentos[1].nome).toBe('Spotify')
      expect(result.lancamentos[1].valor).toBe(19.90)
    })

    it('deve parsear itens separados por "e": "Netflix 55 e Spotify 20"', () => {
      const result = parseInput('Netflix 55 e Spotify 20', mesDefault)
      expect(result.lancamentos).toHaveLength(2)
      expect(result.lancamentos[0].nome).toBe('Netflix')
      expect(result.lancamentos[0].valor).toBe(55)
      expect(result.lancamentos[1].nome).toBe('Spotify')
      expect(result.lancamentos[1].valor).toBe(20)
    })
  })

  describe('nome com prefixo de tipo', () => {
    it('deve manter nome intacto: "Mercado Pago Emp 100"', () => {
      const result = parseInput('Mercado Pago Emp 100', mesDefault)
      expect(result.lancamentos).toHaveLength(1)
      expect(result.lancamentos[0].nome).toBe('Mercado Pago Emp')
      expect(result.lancamentos[0].valor).toBe(100)
    })
  })

  describe('valor zero', () => {
    it('deve aceitar valor zero explícito: "Cortesia 0"', () => {
      const result = parseInput('Cortesia 0', mesDefault)
      expect(result.lancamentos).toHaveLength(1)
      expect(result.lancamentos[0].nome).toBe('Cortesia')
      expect(result.lancamentos[0].valor).toBe(0)
    })
  })
})
