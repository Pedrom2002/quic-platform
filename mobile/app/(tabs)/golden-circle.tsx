// mobile/app/(tabs)/golden-circle.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView, type LayoutChangeEvent, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { BannerHeader } from '../../components/BannerHeader'
import { colors } from '../../lib/theme'
import { useSession } from '../../hooks/useSession'
import { resolveUserRole, type UserRole } from '../../lib/role'
import { supabase } from '../../lib/supabase'
import { fetchInvestorDashboardStats, type DashboardFetchState } from '../../lib/investorDashboard'
import { InvestorArea } from '../../components/InvestorArea'

type SectionId =
  | 'golden-circle'
  | 'opportunities'
  | 'how-it-works'
  | 'about'
  | 'track-record'

const SECTIONS: { id: SectionId; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'golden-circle', label: 'Golden Circle', icon: 'star-outline' },
  { id: 'opportunities', label: 'Opportunities', icon: 'trending-up-outline' },
  { id: 'how-it-works', label: 'How It Works', icon: 'layers-outline' },
  { id: 'about', label: 'About', icon: 'information-circle-outline' },
  { id: 'track-record', label: 'Track Record', icon: 'bar-chart-outline' },
]

const GOLD = '#D4AF37'

function TopNav({ active, onPress }: { active: SectionId; onPress: (id: SectionId) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={topNavStyles.container}
    >
      {SECTIONS.map(section => (
        <Pressable
          key={section.id}
          onPress={() => onPress(section.id)}
          style={[topNavStyles.tab, active === section.id && topNavStyles.tabActive]}
          accessibilityRole="button"
          accessibilityLabel={section.label}
        >
          <Ionicons
            name={section.icon}
            size={14}
            color={active === section.id ? GOLD : colors.gray400}
          />
          <Text style={[topNavStyles.tabText, active === section.id && topNavStyles.tabTextActive]}>
            {section.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

const OPPORTUNITIES = [
  { num: '01', title: 'Concerto Sala Tejo — Nov 2026', body: 'Produção de médio porte, capacidade 4.000 lugares. Ronda de investimento em preparação.' },
  { num: '02', title: 'Digressão Nacional — Q1 2027', body: 'Digressão de 6 datas em 4 cidades. Estrutura de investimento por data ou pacote completo.' },
  { num: '03', title: 'Festival de Verão — 2027', body: 'Produção de grande escala, múltiplos palcos. Oportunidade em fase de estruturação.' },
  { num: '04', title: 'Novas oportunidades', body: 'Novas produções são adicionadas regularmente. Investidores Golden Circle têm acesso antecipado.' },
]

const HOW_IT_WORKS_STEPS = [
  { num: '01', title: 'Torna-te membro Golden Circle', desc: 'Após aprovação, tens acesso à lista de oportunidades de investimento ativas e ao histórico de produções anteriores.' },
  { num: '02', title: 'Escolhes a oportunidade', desc: 'Cada produção tem orçamento, capacidade e retorno estimado definidos. Investes no valor e na produção que preferires.' },
  { num: '03', title: 'Acompanhamento em tempo real', desc: 'Recebes atualizações sobre a produção: vendas de bilhetes, custos, e progresso até ao dia do evento.' },
  { num: '04', title: 'Retorno após o evento', desc: 'Após a produção e o encerramento de contas, o retorno é distribuído aos investidores dessa oportunidade específica.' },
]

const TRACK_RECORD_STATS = [
  { value: '40+', label: 'Concertos produzidos' },
  { value: '250k+', label: 'Bilhetes vendidos' },
  { value: '15', label: 'Artistas geridos' },
  { value: '8', label: 'Anos de atividade' },
]

function SectionHeading({ title, dark }: { title: string; dark?: boolean }) {
  return (
    <View style={[styles.sectionHeadingRow, dark && styles.sectionHeadingRowDark]}>
      <Text style={[styles.sectionTitle, dark && styles.sectionTitleDark]}>{title}</Text>
    </View>
  )
}

export default function GoldenCircleScreen() {
  const [active, setActive] = useState<SectionId>('golden-circle')
  const [controlsVisible, setControlsVisible] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const offsets = useRef<Map<SectionId, number>>(new Map())

  const { session } = useSession()
  const [role, setRole] = useState<UserRole | null>(null)
  const [dashboardFetch, setDashboardFetch] = useState<DashboardFetchState>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    resolveUserRole(supabase, session)
      .then(r => { if (!cancelled) setRole(r) })
      .catch(() => { if (!cancelled) setRole({ role: 'guest' }) })
    return () => { cancelled = true }
  }, [session])

  useEffect(() => {
    if (role?.role === 'investor' && role.investor.status === 'approved') {
      let cancelled = false
      setDashboardFetch({ status: 'loading' })
      fetchInvestorDashboardStats(supabase, role.investor.id)
        .then(stats => { if (!cancelled) setDashboardFetch({ status: 'loaded', stats }) })
        .catch(() => { if (!cancelled) setDashboardFetch({ status: 'error' }) })
      return () => { cancelled = true }
    }
  }, [role])

  const player = useVideoPlayer(require('../../assets/videos/golden-circle.mp4'), p => {
    p.loop = false
    p.muted = false
  })

  useFocusEffect(
    useCallback(() => {
      player.play()
      return () => player.pause()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [player])
  )

  function handleSectionLayout(id: SectionId, e: LayoutChangeEvent) {
    offsets.current.set(id, e.nativeEvent.layout.y)
  }

  function scrollToSection(id: SectionId) {
    const y = offsets.current.get(id)
    if (y != null) scrollRef.current?.scrollTo({ y: y - 8, animated: true })
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const scrollY = e.nativeEvent.contentOffset.y
    let bestId: SectionId = SECTIONS[0].id
    let bestOffset = -Infinity
    for (const section of SECTIONS) {
      const y = offsets.current.get(section.id)
      if (y != null && y - 80 <= scrollY && y > bestOffset) {
        bestOffset = y
        bestId = section.id
      }
    }
    if (bestId !== active) setActive(bestId)
  }

  if (role?.role === 'investor' && role.investor.status === 'pending') {
    return (
      <View style={styles.investorStateContainer}>
        <Ionicons name="time-outline" size={32} color={colors.gray400} />
        <Text style={styles.investorStateTitle}>A tua candidatura está em análise</Text>
        <Text style={styles.investorStateBody}>
          A nossa equipa vai rever o teu pedido de acesso ao Golden Circle. Entramos em contacto assim que
          houver uma decisão.
        </Text>
      </View>
    )
  }

  if (role?.role === 'investor' && role.investor.status === 'rejected') {
    return (
      <View style={styles.investorStateContainer}>
        <Ionicons name="close-circle-outline" size={32} color={colors.gray400} />
        <Text style={styles.investorStateTitle}>Candidatura não foi aprovada</Text>
        <Text style={styles.investorStateBody}>
          A tua candidatura ao Golden Circle não foi aprovada desta vez. Para mais informações, contacta-nos em
          goldencircle@quic.pt.
        </Text>
      </View>
    )
  }

  if (role?.role === 'investor' && role.investor.status === 'approved') {
    return (
      <View style={styles.container}>
        <BannerHeader source={require('../../assets/banners/golden-circle.png')} />
        <InvestorArea dashboardFetch={dashboardFetch} investorId={role.investor.id} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <BannerHeader source={require('../../assets/banners/golden-circle.png')} />
      <TopNav active={active} onPress={scrollToSection} />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollBody}
        onScroll={handleScroll}
        scrollEventThrottle={32}
      >
        <View onLayout={e => handleSectionLayout('golden-circle', e)} style={styles.section}>
          <SectionHeading title="Golden Circle" />
          <Text style={styles.paragraph}>
            O Golden Circle é o círculo restrito de investidores e parceiros estratégicos da Quic, com acesso
            privilegiado a oportunidades de investimento em produções de eventos e concertos de grande escala,
            com relatórios de desempenho transparentes e acompanhamento direto da equipa fundadora.
          </Text>
          <Pressable
            onPress={() => setControlsVisible(true)}
            style={styles.videoWrapper}
            accessibilityRole="button"
            accessibilityLabel="Mostrar controlos do vídeo"
          >
            <VideoView
              style={styles.video}
              player={player}
              nativeControls={controlsVisible}
              contentFit="cover"
            />
          </Pressable>
        </View>

        <View onLayout={e => handleSectionLayout('opportunities', e)} style={styles.section}>
          <SectionHeading title="Opportunities" />
          <Text style={styles.paragraph}>
            Cada oportunidade de investimento corresponde a um concerto ou produção de evento em preparação,
            com orçamento, capacidade de sala e estimativa de retorno definidos antes da abertura a
            investidores do Golden Circle.
          </Text>
          {OPPORTUNITIES.map(item => (
            <View key={item.num} style={styles.card}>
              <Text style={styles.cardNum}>{item.num}</Text>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
            </View>
          ))}
        </View>

        <View onLayout={e => handleSectionLayout('how-it-works', e)} style={styles.section}>
          <SectionHeading title="How It Works" />
          {HOW_IT_WORKS_STEPS.map(step => (
            <View key={step.num} style={styles.stepRow}>
              <Text style={styles.stepNum}>{step.num}</Text>
              <View style={styles.stepBody}>
                <Text style={styles.cardTitle}>{step.title}</Text>
                <Text style={styles.cardBody}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View onLayout={e => handleSectionLayout('about', e)} style={styles.section}>
          <SectionHeading title="About" />
          <Text style={styles.paragraph}>
            A Quic é uma plataforma de gestão e produção de eventos ao vivo, cobrindo bilhética, aluguer de
            equipamento, gestão de artistas agenciados e coordenação completa de produções de concertos. O
            mercado português de concertos e eventos ao vivo tem vindo a expandir-se de forma consistente
            nos últimos anos.
          </Text>
          <Text style={styles.paragraph}>
            O Golden Circle nasce da vontade de partilhar o crescimento da empresa com um grupo restrito de
            parceiros e investidores alinhados com a visão de longo prazo da marca.
          </Text>
        </View>

        <View
          onLayout={e => handleSectionLayout('track-record', e)}
          style={[styles.section, styles.trackRecordSection]}
        >
          <SectionHeading title="Track Record" dark />
          <View style={styles.statsGrid}>
            {TRACK_RECORD_STATS.map(stat => (
              <View key={stat.label} style={styles.statBox}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.paragraphDark}>
            Números indicativos do histórico de produção da Quic. Dados detalhados disponíveis para membros
            Golden Circle mediante pedido.
          </Text>
        </View>
      </ScrollView>
    </View>
  )
}

const topNavStyles = StyleSheet.create({
  container: { paddingHorizontal: 16, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: GOLD },
  tabText: { fontSize: 12, color: colors.gray400, fontWeight: '500' },
  tabTextActive: { color: colors.gray900 },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scrollBody: { paddingBottom: 32 },
  section: { padding: 16, gap: 16 },
  sectionHeadingRow: { borderBottomWidth: 1, borderBottomColor: colors.gray900, paddingBottom: 12, marginBottom: 4 },
  sectionHeadingRowDark: { borderBottomColor: 'rgba(255,255,255,0.1)' },
  sectionTitle: { color: colors.gray900, fontSize: 20, fontWeight: 'bold' },
  sectionTitleDark: { color: '#ffffff' },
  paragraph: { color: colors.gray500, fontSize: 13, lineHeight: 20 },
  paragraphDark: { color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 20 },
  videoWrapper: { width: '100%' },
  video: { width: '100%', aspectRatio: 16 / 9, borderRadius: 8, backgroundColor: colors.gray100 },
  card: {
    backgroundColor: colors.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 16,
    gap: 4,
  },
  cardNum: { color: colors.brand, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  cardTitle: { color: colors.gray900, fontSize: 14, fontWeight: '600' },
  cardBody: { color: colors.gray500, fontSize: 12, lineHeight: 18 },
  stepRow: { flexDirection: 'row', gap: 12 },
  stepNum: { color: colors.gray400, fontSize: 11, fontWeight: '600', width: 20 },
  stepBody: { flex: 1, gap: 4 },
  loginBox: {
    backgroundColor: colors.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  trackRecordSection: {
    backgroundColor: '#0d0c0d',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
    marginTop: 8,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: {
    flexBasis: '47%',
    backgroundColor: '#141318',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { color: colors.brand, fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, textAlign: 'center' },
  investorStateContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  investorStateTitle: { color: colors.gray900, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  investorStateBody: { color: colors.gray500, fontSize: 13, textAlign: 'center', lineHeight: 20 },
})
