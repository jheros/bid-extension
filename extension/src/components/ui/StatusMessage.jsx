export default function StatusMessage({ text, type = "info" }) {
  if (!text) return null;

  const styles = {
    success: "bg-green-50 text-green-800 border border-green-200",
    error: "bg-red-50 text-red-800 border border-red-200",
    info: "bg-blue-50 text-blue-800 border border-blue-200",
  };

  return (
    <div className={`mb-4 p-3 rounded-lg text-sm ${styles[type] || styles.info}`}>
      {text}
    </div>
  );
}
