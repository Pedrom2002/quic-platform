export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-6">Política de Privacidade</h1>
      <div className="prose prose-sm max-w-none text-stone-600 space-y-4">
        <p>
          A Quic recolhe informações de conta (nome, email, palavra-passe), preferências de utilizador,
          dados de pagamento e registos de comunicação. Estas informações são utilizadas para otimizar a experiência
          do utilizador, personalizando conteúdos e funcionalidades, e para envio de atualizações sobre a plataforma.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-6 mb-3">Dados Recolhidos</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>Informações de conta (nome, email, palavra-passe)</li>
          <li>Preferências de utilizador</li>
          <li>Dados de pagamento (processados por terceiros especializados)</li>
          <li>Registos de comunicação</li>
          <li>Informações de qualificação (KYC/AML) para Golden Circle</li>
        </ul>

        <h2 className="text-xl font-semibold text-stone-900 mt-6 mb-3">Como Usamos os Seus Dados</h2>
        <p>
          Os dados são utilizados para:
        </p>
        <ul className="list-disc list-inside space-y-2">
          <li>Otimizar a experiência do utilizador</li>
          <li>Personalizar conteúdos e funcionalidades</li>
          <li>Enviar atualizações sobre a plataforma</li>
          <li>Conformidade legal e regulatória</li>
          <li>Avaliação de candidatura ao Golden Circle</li>
        </ul>

        <h2 className="text-xl font-semibold text-stone-900 mt-6 mb-3">Segurança</h2>
        <p>
          A Quic implementa medidas de segurança apropriadas e restringe o acesso apenas a funcionários autorizados.
          As informações podem ser partilhadas com processadores de pagamento, estritamente para fornecer serviços essenciais,
          ou conforme exigido por lei.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-6 mb-3">Cookies</h2>
        <p>
          O website utiliza cookies para melhorar a experiência do utilizador. Pode aceitar ou recusar cookies através
          das definições do seu navegador.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-6 mb-3">Atualizações</h2>
        <p>
          Esta política pode ser atualizada periodicamente. Os utilizadores serão informados de alterações significativas.
        </p>

        <p className="text-sm text-stone-500 mt-8 pt-4 border-t border-stone-200">
          <strong>Contacto:</strong> <a href="mailto:[email protected]" className="text-[var(--quic-magenta)] hover:underline">[email protected]</a><br/>
          <strong>Golden Circle:</strong> <a href="mailto:goldencircle@quic.pt" className="text-[var(--quic-magenta)] hover:underline">goldencircle@quic.pt</a>
        </p>
      </div>
    </div>
  )
}
