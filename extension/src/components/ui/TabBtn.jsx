export default function TabBtn({ isOpen, setIsOpen }) {
  if (isOpen) {
    return null;
  }

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="fixed right-0 top-1/2 -translate-y-1/2 bg-gray-700 text-white px-3 py-8 rounded-l-lg shadow-lg hover:bg-gray-600 transition-colors pointer-events-auto z-50"
      aria-label="Open sidebar"
    >
      <span className="writing-mode-vertical text-sm font-medium">
        Job Tracker
      </span>
    </button>
  );
}
