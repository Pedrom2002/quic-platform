// Mesmo contentor das outras secções do dashboard (ex.: eventos)
export default function ArtistsLayout({ children }: { children: React.ReactNode }) {
  return <div className="w-full max-w-6xl mx-auto p-8">{children}</div>
}
