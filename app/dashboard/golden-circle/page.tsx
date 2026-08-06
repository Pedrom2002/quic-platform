import Image from 'next/image'

export default function GoldenCirclePage() {
  return (
    <div className="flex flex-col">
      <div className="relative w-full aspect-[2000/1414] max-h-[420px] overflow-hidden">
        <Image
          src="/golden.png"
          alt="Golden Circle"
          fill
          priority
          className="object-cover"
        />
      </div>

      <div className="flex flex-col items-center gap-6 px-6 py-10">
        <video
          controls
          playsInline
          preload="metadata"
          src="/V5%20Golden%20Circle.mov"
          className="w-full max-w-3xl rounded-lg shadow-md"
        >
          O teu navegador não suporta reprodução de vídeo.
        </video>

        <button
          type="button"
          className="rounded-full bg-amber-500 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600"
        >
          Junta-te em Gold
        </button>
      </div>
    </div>
  )
}
