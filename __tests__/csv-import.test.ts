import { describe, it, expect } from 'vitest'
import { parseCsvClients } from '@/lib/csv-import'

describe('parseCsvClients', () => {
  it('parses valid CSV', () => {
    const csv = 'nome,email,telefone,empresa\nJoão Silva,joao@exemplo.pt,+351912345678,Empresa Lda'
    const result = parseCsvClients(csv)
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]).toMatchObject({
      full_name: 'João Silva',
      email: 'joao@exemplo.pt',
      phone: '351912345678',
      company: 'Empresa Lda',
      error: null,
    })
  })

  it('marks empty name as error', () => {
    const csv = 'nome,email\n,joao@exemplo.pt'
    const result = parseCsvClients(csv)
    expect(result.rows[0].error).toBe('Nome obrigatório')
  })

  it('marks invalid email as error', () => {
    const csv = 'nome,email\nJoão,not-an-email'
    const result = parseCsvClients(csv)
    expect(result.rows[0].error).toBe('Email inválido')
  })

  it('accepts english column names', () => {
    const csv = 'name,email,phone,company\nJoão,,,'
    const result = parseCsvClients(csv)
    expect(result.rows[0].full_name).toBe('João')
    expect(result.rows[0].error).toBeNull()
  })

  it('returns global error when over 50 rows', () => {
    const rows = Array.from({ length: 51 }, (_, i) => `Nome ${i},email${i}@x.pt,,`).join('\n')
    const csv = `nome,email,telefone,empresa\n${rows}`
    const result = parseCsvClients(csv)
    expect(result.globalError).toMatch(/50/)
  })

  it('returns global error when nome column missing', () => {
    const csv = 'email,telefone\njoao@x.pt,123'
    const result = parseCsvClients(csv)
    expect(result.globalError).toMatch(/nome/i)
  })
})
