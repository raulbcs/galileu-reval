import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test/render'
import { Pagination } from './Pagination'

describe('Pagination', () => {
  it('renderiza info de paginação', () => {
    renderWithProviders(<Pagination page={2} totalPages={5} onPageChange={vi.fn()} />)
    expect(screen.getByText('Página 2 de 5')).toBeInTheDocument()
  })

  it('desabilita Anterior na página 1', () => {
    renderWithProviders(<Pagination page={1} totalPages={5} onPageChange={vi.fn()} />)
    expect(screen.getByText('Anterior')).toBeDisabled()
  })

  it('desabilita Próxima na última página', () => {
    renderWithProviders(<Pagination page={5} totalPages={5} onPageChange={vi.fn()} />)
    expect(screen.getByText('Próxima')).toBeDisabled()
  })

  it('chama onPageChange ao clicar Próxima', () => {
    const onPageChange = vi.fn()
    renderWithProviders(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByText('Próxima'))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('chama onPageChange ao clicar Anterior', () => {
    const onPageChange = vi.fn()
    renderWithProviders(<Pagination page={3} totalPages={5} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByText('Anterior'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('abre jump-to-page ao clicar no indicador', () => {
    const { container } = renderWithProviders(<Pagination page={2} totalPages={10} onPageChange={vi.fn()} />)
    fireEvent.click(screen.getByText('Página 2 de 10'))
    expect(container.querySelector('form')).toBeInTheDocument()
    const input = screen.getByRole('spinbutton')
    expect(input.value).toBe('2')
  })

  it('navega ao submeter jump-to-page', () => {
    const onPageChange = vi.fn()
    const { container } = renderWithProviders(<Pagination page={1} totalPages={10} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByText('Página 1 de 10'))
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '7' } })
    fireEvent.submit(container.querySelector('form'))
    expect(onPageChange).toHaveBeenCalledWith(7)
  })

  it('ignora jump para página inválida', () => {
    const onPageChange = vi.fn()
    const { container } = renderWithProviders(<Pagination page={1} totalPages={10} onPageChange={onPageChange} />)
    fireEvent.click(screen.getByText('Página 1 de 10'))
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '999' } })
    fireEvent.submit(container.querySelector('form'))
    expect(onPageChange).not.toHaveBeenCalled()
  })
})
