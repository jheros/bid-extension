import { useCallback } from "react";
import { extractJobInfo } from "../utils/jobExtractor";

function getPageTextForAI() {
  return (document.body?.innerText || "").replace(/\s+/g, " ").trim().slice(0, 24000);
}

function requestAIExtraction(fallback) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: "EXTRACT_JOB_INFO_AI",
        data: {
          url: window.location.href,
          pageTitle: document.title || "",
          pageText: getPageTextForAI(),
          fallback,
        },
      },
      resolve,
    );
  });
}

function mergeJobInfo(fallback, aiResult) {
  return {
    jobTitle: aiResult?.jobTitle || fallback.jobTitle || "",
    company: aiResult?.company || fallback.company || "",
    location: aiResult?.location || fallback.location || "",
    workType: aiResult?.workType || fallback.workType || "",
    jobType: aiResult?.jobType || fallback.jobType || "",
    salary: aiResult?.salary || fallback.salary || "",
    securityClearance: aiResult?.securityClearance || fallback.securityClearance || "",
    url: fallback.url || window.location.href,
  };
}

export function useTrackPage(setFormFields, showStatus, useAiExtractor) {
  const handleTrackCurrentPage = useCallback(
    async ({ silent = false } = {}) => {
      const fallbackInfo = extractJobInfo();
      let finalInfo = fallbackInfo;
      let aiFailed = false;

      if (useAiExtractor) {
        if (!silent) showStatus("Extracting with AI...", "info");
        const aiResponse = await requestAIExtraction(fallbackInfo);
        if (aiResponse?.success && aiResponse.result) {
          finalInfo = mergeJobInfo(fallbackInfo, aiResponse.result);
        } else if (!silent) {
          aiFailed = true;
          showStatus(
            `AI extraction failed, used fallback parser: ${aiResponse?.error || "Unknown error"}`,
            "error",
          );
        }
      }

      setFormFields({
        jobTitle: finalInfo.jobTitle || "",
        company: finalInfo.company || "",
        location: finalInfo.location || "",
        workType: finalInfo.workType || "",
        jobType: finalInfo.jobType || "",
        salary: finalInfo.salary || "",
        securityClearance: finalInfo.securityClearance || "",
        url: finalInfo.url || window.location.href,
      });

      if (finalInfo.company?.trim()) {
        chrome.runtime.sendMessage({
          type: "CHECK_SAME_COMPANY",
          data: { company: finalInfo.company.trim() },
        });
      }

      if (!silent && !aiFailed) {
        showStatus("Page info extracted! Please review and save.", "success");
      }
    },
    [setFormFields, showStatus, useAiExtractor],
  );

  return { handleTrackCurrentPage };
}
