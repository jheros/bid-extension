import LabeledInput from "../ui/LabeledInput";

const FIELDS = [
  { label: "Job Title", key: "jobTitle", placeholder: "e.g., Senior Software Engineer", required: true },
  { label: "Company", key: "company", placeholder: "e.g., Google", required: true },
  { label: "Location", key: "location", placeholder: "e.g., Bangkok, Thailand / Remote" },
  { label: "Work Type", key: "workType", placeholder: "e.g., Remote, Hybrid, Onsite" },
  { label: "Job Type", key: "jobType", placeholder: "e.g., Full-time, Contract" },
  { label: "Salary", key: "salary", placeholder: "e.g., $90,000 - $120,000 / year" },
  { label: "Security Clearance", key: "securityClearance", placeholder: "e.g., Secret, TS/SCI" },
  { label: "Resume", key: "resume", placeholder: "e.g., link or version used (optional)" },
];

export default function TrackForm({ form, setFormField, handleSubmit }) {
  return (
    <form id="track-form" onSubmit={handleSubmit} className="space-y-4">
      {FIELDS.map(({ label, key, placeholder, required }) => (
        <LabeledInput
          key={key}
          label={label}
          value={form[key]}
          onChange={(e) => setFormField(key, e.target.value)}
          placeholder={placeholder}
          required={required}
        />
      ))}

      <LabeledInput
        label="URL"
        type="url"
        value={form.url}
        onChange={(e) => setFormField("url", e.target.value)}
        placeholder="https://..."
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date &amp; Time</label>
        <input
          type="datetime-local"
          value={form.datetime}
          onChange={(e) => setFormField("datetime", e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
        />
      </div>
    </form>
  );
}
