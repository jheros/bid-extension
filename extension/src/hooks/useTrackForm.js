import { useState, useCallback } from "react";
import { getBangkokDateTimeLocal, formatDateTime, getBangkokDateTime } from "../lib/datetime";
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
  const [datetimeEdited, setDatetimeEdited] = useState(false);

  const setFormField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "datetime") setDatetimeEdited(true);
  }, []);

  const setFormFields = useCallback((partial) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetForm = useCallback(() => {
    setForm(initialForm());
    setResumeFile(null);
    setDatetimeEdited(false);
  }, []);

  const refreshDateTime = useCallback(() => {
    setForm((prev) => ({ ...prev, datetime: getBangkokDateTimeLocal() }));
    setDatetimeEdited(false);
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const { jobTitle, company, location, workType, jobType, salary, securityClearance, resume, url, datetime } = form;

      if (!jobTitle || !company || !url) {
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
        datetime: datetimeEdited ? formatDateTime(datetime) : getBangkokDateTime(),
        profileId: selectedProfileId || null,
      };

      chrome.runtime.sendMessage({ type: "SAVE_APPLICATION", data }, (response) => {
        if (response?.success) {
          showStatus("Saved successfully!", "success");
          if (clearAfterSave) resetForm();
          else {
            setResumeFile(null);
            setForm((prev) => ({ ...prev, datetime: getBangkokDateTimeLocal() }));
            setDatetimeEdited(false);
          }
        } else {
          showStatus(`Error: ${response?.error || "Unknown error"}`, "error");
        }
      });
    },
    [form, datetimeEdited, showStatus, clearAfterSave, resetForm, resumeFile],
  );

  return { form, setFormField, setFormFields, resetForm, refreshDateTime, handleSubmit, resumeFile, setResumeFile };
}
