import { describe, it, expect } from 'vitest'
import { renderTemplate } from '@/lib/notifications/template-renderer'

describe('renderTemplate', () => {
  it('substitutes simple variables', () => {
    const result = renderTemplate('Olá {{client_name}}!', { client_name: 'Ana' })
    expect(result).toBe('Olá Ana!')
  })

  it('replaces unknown variables with empty string', () => {
    const result = renderTemplate('Olá {{nome}}!', {})
    expect(result).toBe('Olá !')
  })

  it('renders {{#if}} block when value is truthy', () => {
    const result = renderTemplate('{{#if note}}Nota: {{note}}{{/if}}', { note: 'testado' })
    expect(result).toBe('Nota: testado')
  })

  it('omits {{#if}} block when value is falsy', () => {
    const result = renderTemplate('{{#if note}}Nota: {{note}}{{/if}}', { note: '' })
    expect(result).toBe('')
  })

  it('omits {{#if}} block when variable is missing', () => {
    const result = renderTemplate('{{#if note}}Nota: {{note}}{{/if}}', {})
    expect(result).toBe('')
  })

  it('handles multiple variables in one template', () => {
    const result = renderTemplate(
      'Olá {{client_name}}, o teu evento {{event_name}} está a {{progress_percent}}%.',
      { client_name: 'João', event_name: 'Concerto', progress_percent: '75' }
    )
    expect(result).toBe('Olá João, o teu evento Concerto está a 75%.')
  })

  it('handles numeric values', () => {
    const result = renderTemplate('Progresso: {{pct}}%', { pct: 42 })
    expect(result).toBe('Progresso: 42%')
  })

  it('handles null values as empty string', () => {
    const result = renderTemplate('Nota: {{note}}', { note: null })
    expect(result).toBe('Nota:')
  })

  it('trims leading/trailing whitespace from result', () => {
    const result = renderTemplate('  texto  ', {})
    expect(result).toBe('texto')
  })

  it('does not allow nested {{#if}} blocks to break parsing', () => {
    const result = renderTemplate(
      '{{#if a}}antes{{/if}} meio {{#if b}}depois{{/if}}',
      { a: 'sim', b: 'sim' }
    )
    expect(result).toBe('antes meio depois')
  })
})
