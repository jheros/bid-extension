import { useState } from "react";
import { RefreshCw } from "lucide-react";

export default function ProfileSection({
  profiles,
  selectedProfileId,
  onSelectProfile,
  onRefreshProfiles,
}) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshProfiles = async () => {
    setRefreshing(true);
    try {
      await onRefreshProfiles();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Profile</h3>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-gray-700">Active Profile</label>
          <button
            type="button"
            onClick={handleRefreshProfiles}
            disabled={refreshing}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            title="Refresh profiles"
          >
            <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
        {profiles.length === 0 ? (
          <p className="text-xs text-gray-400 italic">
            No profiles yet. Add them in your dashboard settings.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectProfile(p.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedProfileId === p.id
                    ? "bg-gray-800 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {p.name}
              </button>
            ))}
            {selectedProfileId && (
              <button
                type="button"
                onClick={() => onSelectProfile("")}
                className="px-2.5 py-1 rounded-md text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}
        {selectedProfileId && profiles.find((p) => p.id === selectedProfileId) && (
          <p className="text-xs text-gray-500 mt-1.5">
            Saving as: <span className="font-medium text-gray-700">{profiles.find((p) => p.id === selectedProfileId).name}</span>
          </p>
        )}
      </div>
    </div>
  );
}
