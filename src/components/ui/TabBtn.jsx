export default function TabBtn({ isOpen, setIsOpen }) {
  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="fixed right-0 top-1/2 -translate-y-1/2 bg-gray-700 text-white px-3 py-8 rounded-l-lg shadow-lg hover:bg-gray-600 transition-colors pointer-events-auto z-50"
      aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
    >
      <span className="writing-mode-vertical text-sm font-medium">
        {isOpen ? "Close" : "Job Tracker"}
      </span>
    </button>
  );
}
