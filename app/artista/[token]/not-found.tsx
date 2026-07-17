import Image from 'next/image'

export default function ArtistPortalNotFound() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-6 text-white"
      style={{ background: 'linear-gradient(145deg, #111111 0%, #1a1a1a 50%, #0d0d0d 100%)' }}
    >
      <Image src="/logo-branco.png" alt="Quic" width={130} height={52} className="mb-10" />
      <h1
        className="text-3xl sm:text-4xl font-bold tracking-tight"
        style={{ fontFamily: 'var(--font-playfair), Georgia, serif' }}
      >
        Acesso expirado
      </h1>
      <p className="mt-4 max-w-md text-center text-sm text-white/50 leading-relaxed">
        Este link já não está ativo. Contacta a agência para receberes um link novo.
      </p>
    </main>
  )
}
