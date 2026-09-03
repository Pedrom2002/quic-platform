export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Termos e Condições</h1>
      <p className="text-base text-stone-600 mb-6">Termos e condições de utilizador</p>

      <div className="prose prose-sm max-w-none text-stone-600 space-y-4">
        <p>
          Ao utilizar os serviços oferecidos por este site, concorda em ficar vinculado a estes termos
          e condições. Por favor, leia atentamente antes de prosseguir.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">1. Definições e Interpretações</h2>
        <p>
          <strong>1.1</strong> &ldquo;Utilizador&rdquo; refere-se a qualquer pessoa que utilize os serviços
          do site quicenterprises.com.
        </p>
        <p>
          <strong>1.2</strong> &ldquo;Conteúdo&rdquo; abrange qualquer informação, dados, texto, fotografias,
          gráficos, vídeos ou outros materiais publicados ou exibidos na plataforma.
        </p>
        <p>
          <strong>1.3</strong> &ldquo;Conta&rdquo; refere-se à identificação do utilizador necessária para
          aceder a determinadas áreas do site.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">2. Utilização responsável</h2>
        <p>
          <strong>2.1</strong> Ao utilizar o site quic.pt, o utilizador concorda em respeitar outros
          utilizadores e a não violar direitos de autor ou de propriedade intelectual.
        </p>
        <p>
          <strong>2.2</strong> O utilizador concorda em não publicar, transmitir ou distribuir conteúdo
          ofensivo, difamatório, obsceno ou ilegal.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">3. Direitos de Propriedade Intelectual</h2>
        <p>
          <strong>3.1</strong> Todo o conteúdo presente deste site, incluindo texto, gráficos, logótipos,
          ícones e imagens, é propriedade exclusiva da QUIC NATION, LDA e está protegido por direitos de autor.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">4. Conteúdo gerado pelo utilizador</h2>
        <p>
          <strong>4.1</strong> Ao publicar ou carregar conteúdo na plataforma, o utilizador concede à
          QUIC NATION, LDA uma licença não exclusiva, sub licenciável, transferível e gratuita para usar,
          reproduzir e distribuir esse conteúdo.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">5. Privacidade</h2>
        <p>
          <strong>5.1</strong> A QUIC NATION, LDA respeita a privacidade dos seus utilizadores e protege as
          informações de acordo com a política de privacidade integrada.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">6. Alterações nos termos</h2>
        <p>
          A QUIC NATION, LDA reserva-se o direito de atualizar estes termos de tempos em tempos. Os
          utilizadores serão notificados sobre quaisquer alterações significativas.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">7. Encerramento de conta</h2>
        <p>
          <strong>7.1</strong> A QUIC NATION, LDA reserva-se o direito de encerrar contas de utilizadores que
          violem estes termos ou que estejam envolvidos em atividades prejudiciais para a plataforma.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">8. Limitação de responsabilidade</h2>
        <p>
          <strong>8.1</strong> A QUIC NATION, LDA não será responsável por quaisquer danos diretos, indiretos,
          acidentais, especiais ou consequentes resultantes do uso ou da incapacidade de usar a plataforma.
        </p>

        <h2 className="text-xl font-semibold text-stone-900 mt-8 mb-3">9. Lei Aplicável e Jurisdição</h2>
        <p>
          <strong>9.1</strong> Estes Termos e Condições são regidos pelas leis de Portugal. Qualquer disputa
          será sujeita à jurisdição dos tribunais competentes deste país.
        </p>

        <p className="mt-8">
          Se tiver dúvidas sobre estes Termos e Condições, entre em contacto connosco em{' '}
          <a href="mailto:geral@quic.pt" className="text-[var(--quic-magenta)] hover:underline">geral@quic.pt</a>.
        </p>

        <p className="text-sm text-stone-500 mt-8 pt-4 border-t border-stone-200">
          Data de atualização: 28/04/2026
        </p>
      </div>
    </div>
  )
}
