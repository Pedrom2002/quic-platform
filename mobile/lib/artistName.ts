// Alguns registos de artistas na BD guardam texto extra entre parenteses no
// nome (ex: nome de banda/apelido a mais). Isto retira esse sufixo ao exibir,
// sem tocar no dado guardado.
export function displayArtistName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
}
