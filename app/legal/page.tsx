export default function LegalPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Informação Societária</h1>
      <div className="prose prose-sm max-w-none text-stone-600 space-y-4">
        <h2 className="text-xl font-semibold text-stone-900 mt-6 mb-3">Quic — Produção de Entretenimento</h2>
        <div className="bg-stone-50 p-6 rounded-lg border border-stone-200">
          <p><strong>Empresa:</strong> Quic, Lda.</p>
          <p><strong>NIF:</strong> [Verificar no website institucional]</p>
          <p><strong>Sede:</strong> [Verificar no website institucional]</p>
          <p><strong>Contacto:</strong> goldencircle@quic.pt</p>
        </div>
        <h2 className="text-xl font-semibold text-stone-900 mt-6 mb-3">Golden Circle — Estrutura de Investimento</h2>
        <p>
          O Golden Circle é um programa de investimento privado gerido pela Quic. Não é um fundo de investimento regulado,
          nem está registado em organismo regulador financeiro português.
        </p>
        <p>
          Investimentos são oferecidos apenas a investidores qualificados sob regulação de confidencialidade (NDA)
          e conformidade KYC/AML. Cada oportunidade é estruturada como contrato privado de investimento com termos
          específicos.
        </p>
        <h2 className="text-xl font-semibold text-stone-900 mt-6 mb-3">Histórico e Experiência</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>8 anos de atividade em produção de eventos e concertos</li>
          <li>40+ produções executadas</li>
          <li>250.000+ bilhetes vendidos</li>
          <li>15+ artistas geridos</li>
        </ul>
        <p className="text-sm text-stone-500 mt-8">
          Verificação e documentação completa disponível mediante processo de qualificação.
        </p>
      </div>
    </div>
  )
}
