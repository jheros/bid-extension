export default function TabBar({ activeTab, onTabChange, tabs = ["track", "settings"] }) {
  return (
    <div className="flex border-b border-gray-200 bg-gray-50">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors capitalize ${
            activeTab === tab
              ? "bg-white text-gray-900 border-b-2 border-gray-900"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
