export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Termos de Serviço</h1>
      <div className="prose prose-sm max-w-none text-stone-600 space-y-4">
        <h2 className="text-xl font-semibold text-stone-900 mt-6 mb-3">1. Uso da Plataforma</h2>
        <p>
          O acesso ao Golden Circle é restrito a investidores qualificados que completaram o processo de candidatura
          e foram aprovados pela Quic.
        </p>
        <h2 className="text-xl font-semibold text-stone-900 mt-6 mb-3">2. Confidencialidade</h2>
        <p>
          Todos os membros do Golden Circle devem assinar um Acordo de Confidencialidade (NDA) antes de receber
          acesso a informações não públicas sobre oportunidades de investimento.
        </p>
        <h2 className="text-xl font-semibold text-stone-900 mt-6 mb-3">3. Conformidade Regulatória</h2>
        <p>
          O Golden Circle está sujeito a conformidade com regulação portuguesa de investimento e anti-lavagem de dinheiro (KYC/AML).
          Membros aceitam fornecer documentação necessária para verificação.
        </p>
        <h2 className="text-xl font-semibold text-stone-900 mt-6 mb-3">4. Isenção de Responsabilidade</h2>
        <p>
          Investimentos no Golden Circle envolvem riscos significativos. A Quic não garante retornos ou lucros.
          Membros devem avaliar cuidadosamente cada oportunidade de investimento e considerar consultar com
          profissionais de investimento antes de comprometer capital.
        </p>
        <p className="text-sm text-stone-500 mt-8">
          Para mais informações, contacte goldencircle@quic.pt
        </p>
      </div>
    </div>
  )
}
