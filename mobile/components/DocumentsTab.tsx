import { useEffect, useState } from 'react'
import { View, Text, Pressable, Linking, StyleSheet } from 'react-native'
import { colors } from '../lib/theme'
import { supabase } from '../lib/supabase'
import { fetchInvestorDocuments, type InvestorDocument } from '../lib/investorDocuments'

type DocumentsFetchState =
  | { status: 'loading' }
  | { status: 'loaded'; documents: InvestorDocument[] }
  | { status: 'error' }

const dateFormatter = new Intl.DateTimeFormat('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })

const TYPE_LABELS: Record<string, string> = {
  contract: 'Contrato',
  report: 'Relatório',
  tax: 'Fiscal',
  presentation: 'Apresentação',
}

function documentTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type
}

function documentsCounterText(count: number): string {
  return `${count} documento${count === 1 ? '' : 's'} disponíve${count === 1 ? 'l' : 'is'}`
}

function DocumentCard({ document }: { document: InvestorDocument }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>{document.title}</Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{documentTypeLabel(document.type)}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>{dateFormatter.format(new Date(document.uploadedAt))}</Text>
        <Pressable onPress={() => { Linking.openURL(document.fileUrl) }}>
          <Text style={styles.downloadLink}>Descarregar</Text>
        </Pressable>
      </View>
    </View>
  )
}

export function DocumentsTab() {
  const [fetchState, setFetchState] = useState<DocumentsFetchState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    setFetchState({ status: 'loading' })
    fetchInvestorDocuments(supabase)
      .then(documents => { if (!cancelled) setFetchState({ status: 'loaded', documents }) })
      .catch(() => { if (!cancelled) setFetchState({ status: 'error' }) })
    return () => { cancelled = true }
  }, [])

  if (fetchState.status === 'loading') {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateBody}>A carregar...</Text>
      </View>
    )
  }

  if (fetchState.status === 'error') {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateBody}>Não foi possível carregar os teus documentos. Tenta novamente mais tarde.</Text>
      </View>
    )
  }

  if (fetchState.documents.length === 0) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateBody}>Ainda não tens documentos disponíveis.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.counter}>{documentsCounterText(fetchState.documents.length)}</Text>
      <View style={styles.list}>
        {fetchState.documents.map(document => <DocumentCard key={document.id} document={document} />)}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  stateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  stateBody: { color: colors.gray500, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  counter: { color: colors.gray500, fontSize: 12 },
  list: { gap: 12 },
  card: {
    backgroundColor: colors.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 16,
    gap: 8,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { color: colors.gray900, fontSize: 15, fontWeight: '600', flex: 1 },
  typeBadge: { backgroundColor: colors.gray200, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  typeBadgeText: { fontSize: 11, fontWeight: '600', color: colors.gray700 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.gray200, paddingTop: 8 },
  cardDate: { color: colors.gray500, fontSize: 12 },
  downloadLink: { color: colors.brand, fontSize: 13, fontWeight: '600' },
})
