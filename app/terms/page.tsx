export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Termos e Condições</h1>
      <div className="prose prose-sm max-w-none text-stone-600 space-y-4">
        <p className="text-sm text-stone-500 mb-6">
          Última atualização: 28 de Abril de 2026
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-6 mb-3">1. Definições</h2>
        <p>
          "Utilizadores" são visitantes do website. "Conteúdo" inclui todos os materiais publicados.
          "Contas" permitem acesso a certas áreas da plataforma.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-6 mb-3">2. Uso Responsável</h2>
        <p>
          Os utilizadores devem respeitar os outros e cumprir as leis de propriedade intelectual.
          É proibido material ofensivo ou ilegal.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-6 mb-3">3. Propriedade Intelectual</h2>
        <p>
          Todo o conteúdo presente neste website é propriedade exclusiva da Quic Nation, Lda. e está
          protegido por direitos de autor.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-6 mb-3">4. Conteúdo Gerado por Utilizadores</h2>
        <p>
          A Quic reserba uma licença não-exclusiva e sublicenciável para usar o conteúdo por si carregado.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-6 mb-3">5. Privacidade</h2>
        <p>
          Consulte a nossa Política de Privacidade separada para detalhes sobre proteção de dados.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-6 mb-3">6. Direito de Alteração</h2>
        <p>
          A Quic reserba o direito de atualizar estes termos com notificação prévia aos utilizadores.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-6 mb-3">7. Rescisão de Conta</h2>
        <p>
          A Quic pode encerrar contas por violações ou atividades prejudiciais.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-6 mb-3">8. Limitação de Responsabilidade</h2>
        <p>
          A Quic exclui responsabilidade por danos diretos ou indiretos resultantes do uso da plataforma ou indisponibilidade.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-6 mb-3">9. Jurisdição</h2>
        <p>
          Estes termos são regidos pela lei portuguesa e os tribunais portugueses têm jurisdição exclusiva.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-6 mb-3">Golden Circle — Termos Específicos</h2>
        <p>
          O acesso ao Golden Circle é restrito a investidores qualificados que completaram o processo de candidatura
          e foram aprovados pela Quic. Todos os membros devem assinar um Acordo de Confidencialidade (NDA) antes de receber
          acesso a informações não públicas. O Golden Circle está sujeito a conformidade com regulação portuguesa de investimento
          e anti-lavagem de dinheiro (KYC/AML). Investimentos envolvem riscos significativos — a Quic não garante retornos
          ou lucros.
        </p>

        <p className="text-sm text-stone-500 mt-8 pt-4 border-t border-stone-200">
          <strong>Contacto:</strong> <a href="mailto:[email protected]" className="text-[var(--quic-magenta)] hover:underline">[email protected]</a><br/>
          <strong>Golden Circle:</strong> <a href="mailto:goldencircle@quic.pt" className="text-[var(--quic-magenta)] hover:underline">goldencircle@quic.pt</a>
        </p>
      </div>
    </div>
  )
}
