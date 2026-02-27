import { useState, useCallback } from "react";
import { getBangkokDateTimeLocal, formatDateTime } from "../lib/datetime";

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

  const setFormField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setFormFields = useCallback((partial) => {
    setForm((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetForm = useCallback(() => {
    setForm(initialForm());
  }, []);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const { jobTitle, company, location, workType, jobType, salary, securityClearance, resume, url, datetime } = form;

      if (!jobTitle || !company || !url || !datetime) {
        showStatus("Please fill in all required fields", "error");
        return;
      }

      showStatus("Saving...", "info");

      const data = {
        jobTitle,
        company,
        location,
        workType,
        jobType,
        salary,
        securityClearance,
        resume,
        url,
        datetime: formatDateTime(datetime),
      };

      chrome.runtime.sendMessage({ type: "SAVE_APPLICATION", data }, (response) => {
        if (response?.success) {
          showStatus("Saved successfully!", "success");
          if (clearAfterSave) resetForm();
          else setForm((prev) => ({ ...prev, datetime: getBangkokDateTimeLocal() }));
        } else {
          showStatus(`Error: ${response?.error || "Unknown error"}`, "error");
        }
      });
    },
    [form, showStatus, clearAfterSave, resetForm],
  );

  return { form, setFormField, setFormFields, resetForm, handleSubmit };
}
