export default function ArtistPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <style>{`body { background-color: #111111 !important; }`}</style>
      {children}
    </div>
  )
}
