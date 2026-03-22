import LabeledInput from "../ui/LabeledInput";

const FIELDS = [
  { label: "Job Title", key: "jobTitle", placeholder: "e.g., Senior Software Engineer", required: true },
  { label: "Company", key: "company", placeholder: "e.g., Google", required: true },
  { label: "Location", key: "location", placeholder: "e.g., Bangkok, Thailand / Remote" },
  { label: "Work Type", key: "workType", placeholder: "e.g., Remote, Hybrid, Onsite" },
  { label: "Job Type", key: "jobType", placeholder: "e.g., Full-time, Contract" },
  { label: "Salary", key: "salary", placeholder: "e.g., $90,000 - $120,000 / year" },
  { label: "Security Clearance", key: "securityClearance", placeholder: "e.g., Secret, TS/SCI" },
];

export default function TrackForm({ form, setFormField, handleSubmit, resumeFile, setResumeFile }) {
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Resume file (optional)</label>
        <input
          type="file"
          accept=".pdf,.doc,.docx,.txt,.rtf,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setResumeFile(f);
            e.target.value = "";
          }}
          className="block w-full text-sm text-gray-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-200 file:text-gray-800 hover:file:bg-gray-300"
        />
        {resumeFile ? (
          <p className="text-xs text-gray-600 mt-1">
            Selected: {resumeFile.name}{" "}
            <button
              type="button"
              className="text-red-600 underline"
              onClick={() => setResumeFile(null)}
            >
              Clear
            </button>
          </p>
        ) : (
          <p className="text-xs text-gray-500 mt-1">PDF, Word, or text — max 10 MB. Saved to Supabase Storage.</p>
        )}
      </div>

      <LabeledInput
        label="Resume note (optional)"
        value={form.resume}
        onChange={(e) => setFormField("resume", e.target.value)}
        placeholder="e.g., version name or link if not uploading a file"
      />

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
