export default function Alert({ children, variant = 'error' }) {
  const styles = {
    error: 'bg-red-950 border-red-800 text-red-300',
    success: 'bg-green-950 border-green-800 text-green-300',
  }
  return (
    <div className={`px-3 py-2 rounded-lg border text-sm ${styles[variant] || styles.error}`}>
      {children}
    </div>
  )
}
