export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`body { background-color: #111111 !important; }`}</style>
      {children}
    </>
  )
}
