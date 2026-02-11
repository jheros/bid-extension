export default function TabBtn({ isOpen, setIsOpen }) {
    return (
        <button
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
        className={`fixed top-1/2 -translate-y-1/2 w-8 h-12 flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white rounded-l-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400 pointer-events-auto transition-[right,transform] duration-300 ease-in-out ${
          isOpen ? "right-[350px]" : "right-0"
        }`}
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        <svg
          className={`w-4 h-6 transition-transform duration-300 ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
    )
}