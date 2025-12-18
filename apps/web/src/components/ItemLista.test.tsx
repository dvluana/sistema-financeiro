import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ItemLista } from './ItemLista'

describe('ItemLista', () => {
  const defaultProps = {
    tipo: 'saida' as const,
    nome: 'Netflix',
    valor: 55.90,
    concluido: false,
    onToggle: vi.fn(),
    onEdit: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('renderização básica', () => {
    it('deve exibir o nome do lançamento', () => {
      render(<ItemLista {...defaultProps} />)
      expect(screen.getByText('Netflix')).toBeInTheDocument()
    })

    it('deve exibir o valor formatado em R$', () => {
      render(<ItemLista {...defaultProps} />)
      // Matcher flexível para lidar com NBSP vs espaço normal
      expect(screen.getByText(/R\$.*55,90/)).toBeInTheDocument()
    })

    it('deve exibir valor zero corretamente', () => {
      render(<ItemLista {...defaultProps} valor={0} />)
      expect(screen.getByText(/R\$.*0,00/)).toBeInTheDocument()
    })

    it('deve exibir valores grandes formatados', () => {
      render(<ItemLista {...defaultProps} valor={1500.50} />)
      expect(screen.getByText(/R\$.*1\.500,50/)).toBeInTheDocument()
    })
  })

  describe('status de concluído', () => {
    it('deve mostrar badge "Pago" quando saída está concluída', () => {
      render(<ItemLista {...defaultProps} concluido={true} />)
      expect(screen.getByText('Pago')).toBeInTheDocument()
    })

    it('deve mostrar badge "Recebido" quando entrada está concluída', () => {
      render(<ItemLista {...defaultProps} tipo="entrada" concluido={true} />)
      expect(screen.getByText('Recebido')).toBeInTheDocument()
    })

    it('não deve mostrar badge quando não concluído', () => {
      render(<ItemLista {...defaultProps} concluido={false} />)
      expect(screen.queryByText('Pago')).not.toBeInTheDocument()
      expect(screen.queryByText('Recebido')).not.toBeInTheDocument()
    })
  })

  describe('interações', () => {
    it('deve chamar onToggle ao clicar no círculo de status', () => {
      render(<ItemLista {...defaultProps} />)
      const toggleButton = screen.getByRole('button', { name: /marcar como/i })
      fireEvent.click(toggleButton)
      expect(defaultProps.onToggle).toHaveBeenCalledTimes(1)
    })

    it('deve chamar onEdit ao clicar no conteúdo', () => {
      render(<ItemLista {...defaultProps} />)
      const editButton = screen.getByText('Netflix').closest('button')
      if (editButton) {
        fireEvent.click(editButton)
        expect(defaultProps.onEdit).toHaveBeenCalledTimes(1)
      }
    })
  })

  describe('categoria', () => {
    const categoria = {
      id: '1',
      nome: 'Streaming',
      tipo: 'saida' as const,
      icone: 'Film',
      cor: '#E50914',
      is_default: false,
      ordem: 0,
    }

    it('deve exibir nome da categoria quando fornecida', () => {
      render(<ItemLista {...defaultProps} categoria={categoria} />)
      expect(screen.getByText('Streaming')).toBeInTheDocument()
    })
  })

  describe('data prevista', () => {
    it('deve exibir data prevista quando fornecida', () => {
      render(
        <ItemLista
          {...defaultProps}
          dataPrevista="2025-01-15"
          categoria={{ id: '1', nome: 'Streaming', tipo: 'saida', icone: null, cor: null, is_default: false, ordem: 0 }}
        />
      )
      // A data aparece formatada como "15 de jan" ou similar
      expect(screen.getByText(/15/)).toBeInTheDocument()
    })
  })

  describe('modo discreto para concluídos', () => {
    it('deve aplicar estilo discreto quando mostrarConcluidosDiscretos=true', () => {
      render(
        <ItemLista
          {...defaultProps}
          concluido={true}
          mostrarConcluidosDiscretos={true}
        />
      )
      // Verifica se o nome tem a classe de riscado
      const nomeElement = screen.getByText('Netflix')
      expect(nomeElement).toHaveClass('line-through')
    })
  })
})
