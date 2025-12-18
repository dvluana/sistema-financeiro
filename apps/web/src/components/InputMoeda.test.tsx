import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InputMoeda } from './InputMoeda'

describe('InputMoeda', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('renderização', () => {
    it('deve exibir o prefixo R$', () => {
      render(<InputMoeda {...defaultProps} />)
      expect(screen.getByText('R$')).toBeInTheDocument()
    })

    it('deve exibir o label quando fornecido', () => {
      render(<InputMoeda {...defaultProps} label="Valor" />)
      expect(screen.getByText('Valor')).toBeInTheDocument()
    })

    it('deve exibir asterisco quando required', () => {
      render(<InputMoeda {...defaultProps} label="Valor" required />)
      expect(screen.getByText('*')).toBeInTheDocument()
    })

    it('deve exibir placeholder', () => {
      render(<InputMoeda {...defaultProps} placeholder="0,00" />)
      expect(screen.getByPlaceholderText('0,00')).toBeInTheDocument()
    })
  })

  describe('interações', () => {
    it('deve chamar onChange ao digitar', () => {
      const onChange = vi.fn()
      render(<InputMoeda {...defaultProps} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '100,00' } })

      expect(onChange).toHaveBeenCalled()
    })
  })

  describe('erro', () => {
    it('deve exibir mensagem de erro quando fornecida', () => {
      render(<InputMoeda {...defaultProps} error="Valor inválido" />)
      expect(screen.getByText('Valor inválido')).toBeInTheDocument()
    })
  })

  describe('valores', () => {
    it('deve exibir valor formatado', () => {
      render(<InputMoeda {...defaultProps} value="1500,00" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('1.500,00')
    })

    it('deve exibir valor zero', () => {
      render(<InputMoeda {...defaultProps} value="0" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('0')
    })
  })
})
