import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StatusCircle } from './StatusCircle'

describe('StatusCircle', () => {
  const defaultProps = {
    checked: false,
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('renderização', () => {
    it('deve renderizar o botão de status', () => {
      render(<StatusCircle {...defaultProps} />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('deve ter aria-label correto quando não concluído', () => {
      render(<StatusCircle {...defaultProps} checked={false} />)
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Marcar como concluído'
      )
    })

    it('deve ter aria-label correto quando concluído', () => {
      render(<StatusCircle {...defaultProps} checked={true} />)
      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Marcar como pendente'
      )
    })
  })

  describe('interações', () => {
    it('deve chamar onChange ao clicar', () => {
      render(<StatusCircle {...defaultProps} />)
      fireEvent.click(screen.getByRole('button'))
      expect(defaultProps.onChange).toHaveBeenCalledTimes(1)
    })

    it('deve chamar onChange ao clicar várias vezes', () => {
      render(<StatusCircle {...defaultProps} />)
      const button = screen.getByRole('button')
      fireEvent.click(button)
      fireEvent.click(button)
      fireEvent.click(button)
      expect(defaultProps.onChange).toHaveBeenCalledTimes(3)
    })
  })

  describe('estados visuais', () => {
    it('deve mostrar Check quando concluído', () => {
      render(<StatusCircle {...defaultProps} checked={true} />)
      // O Check icon está dentro do botão
      const button = screen.getByRole('button')
      expect(button.querySelector('svg')).toBeInTheDocument()
    })

    it('não deve mostrar Check quando não concluído', () => {
      render(<StatusCircle {...defaultProps} checked={false} />)
      // Quando não concluído, não deve haver o ícone de check
      const button = screen.getByRole('button')
      // O SVG do Check não deve estar presente, mas divs sim
      const svgs = button.querySelectorAll('svg')
      expect(svgs.length).toBe(0)
    })
  })
})
