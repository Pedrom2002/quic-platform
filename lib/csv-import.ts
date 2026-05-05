export interface CsvClientRow {
  full_name: string
  email: string
  phone: string
  company: string
  error: string | null
}

export interface CsvParseResult {
  rows: CsvClientRow[]
  globalError: string | null
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

const NAME_COLS = ['nome', 'name']
const EMAIL_COLS = ['email', 'e-mail']
const PHONE_COLS = ['telefone', 'phone', 'tel']
const COMPANY_COLS = ['empresa', 'company', 'companhia']

function findCol(headers: string[], candidates: string[]): number {
  return headers.findIndex(h => candidates.includes(h.toLowerCase().trim()))
}

export function parseCsvClients(csv: string): CsvParseResult {
  const lines = csv.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { rows: [], globalError: 'CSV sem dados' }

  const headers = lines[0].split(',')
  const nameIdx = findCol(headers, NAME_COLS)

  if (nameIdx === -1) {
    return { rows: [], globalError: 'Coluna "nome" não encontrada. Cabeçalho esperado: nome,email,telefone,empresa' }
  }

  const emailIdx = findCol(headers, EMAIL_COLS)
  const phoneIdx = findCol(headers, PHONE_COLS)
  const companyIdx = findCol(headers, COMPANY_COLS)

  const dataLines = lines.slice(1)
  if (dataLines.length > 50) {
    return { rows: [], globalError: `Máximo 50 clientes por importação. Este ficheiro tem ${dataLines.length} linhas.` }
  }

  const rows: CsvClientRow[] = dataLines.map(line => {
    const cols = line.split(',')
    const full_name = (cols[nameIdx] ?? '').trim()
    const email = emailIdx >= 0 ? (cols[emailIdx] ?? '').trim() : ''
    const phone = phoneIdx >= 0 ? (cols[phoneIdx] ?? '').trim() : ''
    const company = companyIdx >= 0 ? (cols[companyIdx] ?? '').trim() : ''

    let error: string | null = null
    if (!full_name) error = 'Nome obrigatório'
    else if (email && !isValidEmail(email)) error = 'Email inválido'

    return { full_name, email, phone, company, error }
  })

  return { rows, globalError: null }
}
