export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Política de Privacidade</h1>

      <div className="prose prose-sm max-w-none text-stone-600 space-y-4">
        <p>
          Esta política descreve como a QUIC NATION, LDA reúne, utiliza e protege as informações dos
          utilizadores do site.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">Informações que recolhemos</h2>
        <ul className="list-disc list-inside space-y-2">
          <li><strong>Dados de conta:</strong> nome, endereço de email e palavra-passe.</li>
          <li><strong>Perfil e preferências:</strong> informação que o utilizador escolhe fornecer.</li>
          <li><strong>Dados de pagamento:</strong> processados através de terceiros de confiança.</li>
          <li><strong>Comunicações:</strong> registo das trocas de mensagens com o site.</li>
        </ul>

        <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">Como utilizamos as informações</h2>
        <p>As informações recolhidas são utilizadas para:</p>
        <ul className="list-disc list-inside space-y-2">
          <li>Melhorar e otimizar os serviços prestados;</li>
          <li>Enviar comunicações sobre a plataforma e ofertas;</li>
          <li>Prestar suporte ao cliente.</li>
        </ul>
        <p>
          O seu endereço de email não será utilizado para qualquer outra ação que não tenha como objeto a
          promoção das atividades da QUIC NATION, LDA.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">Proteção das informações</h2>
        <p>
          Implementamos medidas de segurança para proteger as informações dos utilizadores, restringindo o
          acesso apenas a funcionários autorizados.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">Partilha de informações</h2>
        <p>
          As informações podem ser partilhadas com terceiros de confiança, como processadores de pagamento,
          estritamente para prestar os serviços essenciais, ou sempre que exigido por lei.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">Cookies</h2>
        <p>
          Utilizamos cookies para melhorar a experiência de utilização. O utilizador pode controlar ou
          desativar os cookies através das definições do seu navegador.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">Alterações a esta política</h2>
        <p>
          Esta política pode ser atualizada periodicamente. Os utilizadores serão informados sobre alterações
          significativas.
        </p>

        <p className="mt-8">
          Se tiver dúvidas sobre esta Política de Privacidade, entre em contacto connosco em{' '}
          <a href="mailto:geral@quic.pt" className="text-[var(--quic-magenta)] hover:underline">geral@quic.pt</a>.
        </p>

        <p className="text-sm text-stone-500 mt-8 pt-4 border-t border-stone-200">
          Data de atualização: 28/04/2026
        </p>
      </div>
    </div>
  )
}
