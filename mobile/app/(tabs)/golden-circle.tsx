// mobile/app/(tabs)/golden-circle.tsx
import { useCallback, useState } from 'react'
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { BannerHeader } from '../../components/BannerHeader'
import { colors } from '../../lib/theme'

type Tab =
  | 'golden-circle'
  | 'opportunities'
  | 'how-it-works'
  | 'track-record'
  | 'intelligence'
  | 'about'
  | 'investor-login'

const TABS: { id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'golden-circle', label: 'Golden Circle', icon: 'star-outline' },
  { id: 'opportunities', label: 'Opportunities', icon: 'trending-up-outline' },
  { id: 'how-it-works', label: 'How It Works', icon: 'layers-outline' },
  { id: 'track-record', label: 'Track Record', icon: 'bar-chart-outline' },
  { id: 'intelligence', label: 'Intelligence', icon: 'bulb-outline' },
  { id: 'about', label: 'About', icon: 'information-circle-outline' },
  { id: 'investor-login', label: 'Investor Login', icon: 'key-outline' },
]

const GOLD = '#D4AF37'

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tabBarStyles.container}
    >
      {TABS.map(tab => (
        <Pressable
          key={tab.id}
          onPress={() => onChange(tab.id)}
          style={[tabBarStyles.tab, active === tab.id && tabBarStyles.tabActive]}
          accessibilityRole="button"
          accessibilityLabel={tab.label}
        >
          <Ionicons
            name={tab.icon}
            size={14}
            color={active === tab.id ? GOLD : colors.gray400}
          />
          <Text style={[tabBarStyles.tabText, active === tab.id && tabBarStyles.tabTextActive]}>
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  )
}

function GoldenCircleSection() {
  const [controlsVisible, setControlsVisible] = useState(false)
  const player = useVideoPlayer(require('../../assets/videos/golden-circle.mp4'), p => {
    p.loop = false
    p.muted = false
  })

  useFocusEffect(
    useCallback(() => {
      player.play()
      return () => player.pause()
    }, [player])
  )

  return (
    <View style={styles.section}>
      <Text style={styles.title}>O que é o Golden Circle?</Text>
      <Text style={styles.paragraph}>
        O Golden Circle é o círculo restrito de investidores e parceiros estratégicos da Quic, com acesso
        privilegiado a oportunidades de investimento em produções de eventos e concertos.
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

      <Pressable style={styles.cta} accessibilityRole="button">
        <Text style={styles.ctaText}>Junta-te ao Golden Circle</Text>
      </Pressable>
    </View>
  )
}

function OpportunitiesSection() {
  const items = [
    { title: 'Concerto Sala Tejo — Nov 2026', body: 'Produção de médio porte, capacidade 4.000 lugares. Ronda em preparação.' },
    { title: 'Digressão Nacional — Q1 2027', body: 'Digressão de 6 datas em 4 cidades. Investimento por data ou pacote completo.' },
    { title: 'Festival de Verão — 2027', body: 'Produção de grande escala, múltiplos palcos. Em fase de estruturação.' },
  ]
  return (
    <View style={styles.section}>
      <Text style={styles.title}>Opportunities</Text>
      <Text style={styles.paragraph}>
        Cada oportunidade corresponde a um concerto ou produção em preparação, com orçamento e retorno
        estimado definidos antes da abertura a investidores.
      </Text>
      {items.map((item, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardBody}>{item.body}</Text>
        </View>
      ))}
    </View>
  )
}

function HowItWorksSection() {
  const steps = [
    { num: '01', title: 'Torna-te membro Golden Circle', desc: 'Após aprovação, acedes à lista de oportunidades ativas e ao histórico de produções.' },
    { num: '02', title: 'Escolhes a oportunidade', desc: 'Investes no valor e na produção que preferires.' },
    { num: '03', title: 'Acompanhamento em tempo real', desc: 'Recebes atualizações sobre vendas, custos e progresso.' },
    { num: '04', title: 'Retorno após o evento', desc: 'O retorno é distribuído após o encerramento de contas da produção.' },
  ]
  return (
    <View style={styles.section}>
      <Text style={styles.title}>How It Works</Text>
      {steps.map(step => (
        <View key={step.num} style={styles.stepRow}>
          <Text style={styles.stepNum}>{step.num}</Text>
          <View style={styles.stepBody}>
            <Text style={styles.cardTitle}>{step.title}</Text>
            <Text style={styles.cardBody}>{step.desc}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

function TrackRecordSection() {
  const stats = [
    { value: '40+', label: 'Concertos produzidos' },
    { value: '250k+', label: 'Bilhetes vendidos' },
    { value: '15', label: 'Artistas geridos' },
    { value: '8', label: 'Anos de atividade' },
  ]
  return (
    <View style={styles.section}>
      <Text style={styles.title}>Track Record</Text>
      <View style={styles.statsGrid}>
        {stats.map(stat => (
          <View key={stat.label} style={styles.statBox}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.paragraph}>
        Números indicativos do histórico de produção da Quic. Dados detalhados disponíveis para membros
        Golden Circle mediante pedido.
      </Text>
    </View>
  )
}

function IntelligenceSection() {
  const items = [
    { title: 'Crescimento do setor de eventos ao vivo', desc: 'O mercado português de concertos tem-se expandido de forma consistente.' },
    { title: 'Procura por experiências premium', desc: 'Segmentos VIP representam uma fatia crescente da receita por evento.' },
    { title: 'Digitalização da bilhética', desc: 'Plataformas próprias de venda reduzem dependência de intermediários.' },
  ]
  return (
    <View style={styles.section}>
      <Text style={styles.title}>Intelligence</Text>
      <Text style={styles.paragraph}>
        Análises e tendências da indústria de eventos ao vivo em Portugal, recolhidas pela equipa Quic.
      </Text>
      {items.map((item, i) => (
        <View key={i} style={styles.plainItem}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardBody}>{item.desc}</Text>
        </View>
      ))}
    </View>
  )
}

function AboutSection() {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>About</Text>
      <Text style={styles.paragraph}>
        A Quic é uma plataforma de gestão e produção de eventos ao vivo, cobrindo bilhética, aluguer de
        equipamento, gestão de artistas agenciados e coordenação completa de produções de concertos.
      </Text>
      <Text style={styles.paragraph}>
        O Golden Circle nasce da vontade de partilhar o crescimento da empresa com um grupo restrito de
        parceiros e investidores alinhados com a visão de longo prazo da marca.
      </Text>
    </View>
  )
}

function InvestorLoginSection() {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>Investor Login</Text>
      <View style={styles.loginBox}>
        <Ionicons name="key-outline" size={22} color={colors.gray400} />
        <Text style={styles.cardTitle}>Área de investidor brevemente disponível</Text>
        <Text style={styles.cardBody}>
          Estamos a preparar uma área dedicada para membros Golden Circle. Entretanto, contacte-nos
          diretamente em goldencircle@quic.pt.
        </Text>
      </View>
    </View>
  )
}

export default function GoldenCircleScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('golden-circle')

  return (
    <View style={styles.container}>
      <BannerHeader source={require('../../assets/banners/golden-circle.png')} />
      <TabBar active={activeTab} onChange={setActiveTab} />

      <ScrollView contentContainerStyle={styles.scrollBody}>
        {activeTab === 'golden-circle' && <GoldenCircleSection />}
        {activeTab === 'opportunities' && <OpportunitiesSection />}
        {activeTab === 'how-it-works' && <HowItWorksSection />}
        {activeTab === 'track-record' && <TrackRecordSection />}
        {activeTab === 'intelligence' && <IntelligenceSection />}
        {activeTab === 'about' && <AboutSection />}
        {activeTab === 'investor-login' && <InvestorLoginSection />}
      </ScrollView>
    </View>
  )
}

const tabBarStyles = StyleSheet.create({
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
  title: { color: colors.gray900, fontSize: 20, fontWeight: 'bold' },
  paragraph: { color: colors.gray500, fontSize: 13, lineHeight: 20 },
  videoWrapper: { width: '100%' },
  video: { width: '100%', aspectRatio: 16 / 9, borderRadius: 8, backgroundColor: colors.gray100 },
  cta: {
    backgroundColor: GOLD,
    borderRadius: 999,
    paddingHorizontal: 32,
    paddingVertical: 14,
    alignSelf: 'center',
  },
  ctaText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: colors.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 16,
    gap: 4,
  },
  cardTitle: { color: colors.gray900, fontSize: 14, fontWeight: '600' },
  cardBody: { color: colors.gray500, fontSize: 12, lineHeight: 18 },
  stepRow: { flexDirection: 'row', gap: 12 },
  stepNum: { color: colors.gray400, fontSize: 11, fontWeight: '600', width: 20 },
  stepBody: { flex: 1, gap: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: {
    flexBasis: '47%',
    backgroundColor: colors.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { color: colors.gray900, fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: colors.gray500, fontSize: 11, textAlign: 'center' },
  plainItem: { gap: 4 },
  loginBox: {
    backgroundColor: colors.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
})
