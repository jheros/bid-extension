import { X } from "lucide-react";

export default function SidebarHeader({ onClose, onTrack }) {
  return (
    <div className="bg-gray-800 text-white px-6 py-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-xl font-semibold">Job Application Tracker</h1>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded border border-gray-300 bg-white text-gray-800 hover:bg-gray-100 transition-colors"
          aria-label="Close sidebar"
        >
          <X size={16} />
        </button>
      </div>
      <p className="text-sm text-gray-300 mt-1">Press F9 to quick track</p>
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          form="track-form"
          className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors font-medium"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onTrack}
          className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
        >
          Track
        </button>
      </div>
    </div>
  );
}
