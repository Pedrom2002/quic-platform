import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

import type { ArtistAgendaType, ArtistAssetKind } from '@/types/app'

export const agendaTypeLabels: Record<ArtistAgendaType, string> = {
  show: 'Espetáculo',
  ensaio: 'Ensaio',
  entrevista: 'Entrevista',
  viagem: 'Viagem',
  gravacao: 'Gravação',
  outro: 'Outro',
}

export const assetKindLabels: Record<ArtistAssetKind, string> = {
  foto: 'Foto',
  video: 'Vídeo',
  arte: 'Arte',
  contrato: 'Contrato',
  rider: 'Rider',
  epk: 'Press kit',
  fatura: 'Fatura',
  outro: 'Outro',
}

export function formatDateTime(iso: string): string {
  return format(new Date(iso), "d MMM yyyy 'às' HH:mm", { locale: pt })
}

export function formatDate(iso: string): string {
  return format(new Date(iso), 'd MMM yyyy', { locale: pt })
}

// Alguns registos de artistas na BD guardam texto extra entre parenteses no
// nome (ex: nome de banda/apelido a mais). Isto retira esse sufixo ao exibir,
// sem tocar no dado guardado.
export function displayArtistName(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*/g, ' ').trim()
}
