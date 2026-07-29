export function LoadingScreen() {
  return (
    <main className="loading-screen" aria-label="Cargando">
      <div className="brand-mark brand-mark--large">C</div>
      <div className="loading-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </main>
  )
}
