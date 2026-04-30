// Renderização simples de templates com variáveis {{key}}
// Suporta blocos condicionais básicos: {{#if key}}...{{/if}}

export function renderTemplate(
  template: string,
  vars: Record<string, string | number | boolean | null | undefined>
): string {
  let result = template

  // Blocos {{#if key}}...{{/if}}
  result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, key, content) => {
    const val = vars[key]
    return val ? content : ''
  })

  // Variáveis simples {{key}}
  result = result.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = vars[key]
    return val != null ? String(val) : ''
  })

  return result.trim()
}
