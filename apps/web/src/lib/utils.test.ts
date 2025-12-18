import { describe, it, expect } from 'vitest'
import { formatarMoeda, getMesAtual, formatarMesAno, navegarMes, cn } from './utils'

describe('utils', () => {
  describe('formatarMoeda', () => {
    // Intl.NumberFormat usa NBSP (\u00A0) entre R$ e o valor
    it('deve formatar valor positivo', () => {
      expect(formatarMoeda(1500.50)).toBe('R$\u00A01.500,50')
    })

    it('deve formatar valor zero', () => {
      expect(formatarMoeda(0)).toBe('R$\u00A00,00')
    })

    it('deve tratar null como zero', () => {
      expect(formatarMoeda(null)).toBe('R$\u00A00,00')
    })

    it('deve tratar undefined como zero', () => {
      expect(formatarMoeda(undefined)).toBe('R$\u00A00,00')
    })

    it('deve formatar centavos', () => {
      expect(formatarMoeda(55.90)).toBe('R$\u00A055,90')
    })

    it('deve formatar milhares', () => {
      expect(formatarMoeda(45000)).toBe('R$\u00A045.000,00')
    })
  })

  describe('getMesAtual', () => {
    it('deve retornar formato YYYY-MM', () => {
      const mes = getMesAtual()
      expect(mes).toMatch(/^\d{4}-\d{2}$/)
    })
  })

  describe('formatarMesAno', () => {
    it('deve formatar janeiro', () => {
      expect(formatarMesAno('2025-01')).toBe('Janeiro 2025')
    })

    it('deve formatar dezembro', () => {
      expect(formatarMesAno('2025-12')).toBe('Dezembro 2025')
    })

    it('deve formatar junho', () => {
      expect(formatarMesAno('2024-06')).toBe('Junho 2024')
    })
  })

  describe('navegarMes', () => {
    describe('anterior', () => {
      it('deve voltar um mês normalmente', () => {
        expect(navegarMes('2025-06', 'anterior')).toBe('2025-05')
      })

      it('deve voltar para dezembro do ano anterior em janeiro', () => {
        expect(navegarMes('2025-01', 'anterior')).toBe('2024-12')
      })
    })

    describe('proximo', () => {
      it('deve avançar um mês normalmente', () => {
        expect(navegarMes('2025-06', 'proximo')).toBe('2025-07')
      })

      it('deve avançar para janeiro do próximo ano em dezembro', () => {
        expect(navegarMes('2025-12', 'proximo')).toBe('2026-01')
      })
    })
  })

  describe('cn', () => {
    it('deve mesclar classes simples', () => {
      const result = cn('class1', 'class2')
      expect(result).toBe('class1 class2')
    })

    it('deve ignorar valores falsy', () => {
      const result = cn('class1', false && 'class2', null, undefined, 'class3')
      expect(result).toBe('class1 class3')
    })

    it('deve usar tailwind-merge para resolver conflitos', () => {
      const result = cn('p-4', 'p-6')
      expect(result).toBe('p-6')
    })
  })
})
