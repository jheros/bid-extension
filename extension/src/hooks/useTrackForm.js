import { useState, useCallback } from "react";
import { getBangkokDateTimeLocal, formatDateTime } from "../lib/datetime";
import { isSupabaseConfigured } from "../services/supabase/client.js";
import { uploadResumeFile } from "../services/supabase/resumes.js";

const initialForm = () => ({
  jobTitle: "",
  company: "",
  location: "",
  workType: "",
  jobType: "",
  salary: "",
  securityClearance: "",
  resume: "",
  url: "",
  datetime: getBangkokDateTimeLocal(),
});

export function useTrackForm(showStatus, clearAfterSave) {
  const [form, setForm] = useState(initialForm);
  const [resumeFile, setResumeFile] = useState(null);

  const setFormField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setFormFields = useCallback((partial) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetForm = useCallback(() => {
    setForm(initialForm());
    setResumeFile(null);
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const { jobTitle, company, location, workType, jobType, salary, securityClearance, resume, url, datetime } = form;

      if (!jobTitle || !company || !url || !datetime) {
        showStatus("Please fill in all required fields", "error");
        return;
      }

      let resumeValue = (resume && String(resume).trim()) || null;
      if (resumeFile) {
        if (!isSupabaseConfigured()) {
          showStatus("Resume upload requires Supabase. Add URL/note in Resume note or configure Supabase.", "error");
          return;
        }
        showStatus("Uploading resume...", "info");
        try {
          resumeValue = await uploadResumeFile(resumeFile);
        } catch (err) {
          showStatus(err.message || "Resume upload failed", "error");
          return;
        }
      }

      showStatus("Saving...", "info");

      // Read selected profile from storage
      const { selectedProfileId } = await chrome.storage.local.get("selectedProfileId");

      const data = {
        jobTitle,
        company,
        location,
        workType,
        jobType,
        salary,
        securityClearance,
        resume: resumeValue,
        url,
        datetime: formatDateTime(datetime),
        profileId: selectedProfileId || null,
      };

      chrome.runtime.sendMessage({ type: "SAVE_APPLICATION", data }, (response) => {
        if (response?.success) {
          showStatus("Saved successfully!", "success");
          if (clearAfterSave) resetForm();
          else {
            setResumeFile(null);
            setForm((prev) => ({ ...prev, datetime: getBangkokDateTimeLocal() }));
          }
        } else {
          showStatus(`Error: ${response?.error || "Unknown error"}`, "error");
        }
      });
    },
    [form, showStatus, clearAfterSave, resetForm, resumeFile],
  );

  return { form, setFormField, setFormFields, resetForm, handleSubmit, resumeFile, setResumeFile };
}
