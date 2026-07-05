import { useCallback } from "react";
import { extractJobInfo } from "../utils/jobExtractor";
import { extractJobDescription } from "../utils/descriptionExtractor";
import { DEFAULT_MODEL } from "../services/ai/openrouter";

function sendMessage(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

// Ask the shared backend cache for a previously-parsed result for this URL.
function requestCacheLookup(url) {
  return sendMessage({ type: "CACHE_LOOKUP", data: { url } });
}

// Store a freshly-parsed result in the shared backend cache (best-effort).
function requestCacheStore(payload) {
  return sendMessage({ type: "CACHE_STORE", data: payload });
}

// Run the client-side LLM extraction on the cleaned description.
function requestAIExtraction({ description, fallback }) {
  return sendMessage({
    type: "EXTRACT_JOB_INFO_AI",
    data: {
      url: window.location.href,
      pageTitle: document.title || "",
      description,
      fallback,
    },
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
      const url = window.location.href;
      const fallbackInfo = extractJobInfo();
      let finalInfo = fallbackInfo;
      let statusText = "Page info extracted! Please review and save.";
      let statusType = "success";

      // Always log the parsed job description on F9 (independent of cache/AI outcome).
      const { source, description, length, fields } = await extractJobDescription();
      console.groupCollapsed(
        `%c[JobDesc]%c source=${source} length=${length}`,
        "color:#0a7;font-weight:bold",
        "color:inherit",
      );
      console.log(description);
      console.groupEnd();

      if (fields) {
        // Structured source (e.g. Greenhouse API) — fields are already labeled and
        // authoritative. Use them directly; no cache lookup, no AI, no manual extraction.
        finalInfo = mergeJobInfo(fallbackInfo, fields);
        statusText = "Extracted from job API. Please review and save.";
      } else {
        // Unstructured source → shared cache first (a hit fills the form with zero LLM
        // tokens, and works even when this user has the AI extractor disabled).
        const cache = await requestCacheLookup(url);
        if (cache?.cached && cache.fields) {
          finalInfo = mergeJobInfo(fallbackInfo, cache.fields);
          statusText = "Loaded cached job info! Please review and save.";
        } else if (useAiExtractor) {
          // Cache miss + AI enabled → parse the clean description with the LLM.
          if (!silent) showStatus("Extracting with AI...", "info");
          const aiResponse = await requestAIExtraction({ description, fallback: fallbackInfo });

          if (aiResponse?.success && aiResponse.result) {
            finalInfo = mergeJobInfo(fallbackInfo, aiResponse.result);
            // Populate the shared cache for the next user (best-effort).
            const { deepseekModel } = await chrome.storage.local.get("deepseekModel");
            void requestCacheStore({
              url,
              description,
              fields: aiResponse.result,
              model: deepseekModel || DEFAULT_MODEL,
            });
          } else {
            statusText = `AI extraction failed, used fallback parser: ${aiResponse?.error || "Unknown error"}`;
            statusType = "error";
          }
        }
        // else: cache miss + AI disabled → DOM fallback only (finalInfo = fallbackInfo).
      }

      setFormFields({
        jobTitle: finalInfo.jobTitle || "",
        company: finalInfo.company || "",
        location: finalInfo.location || "",
        workType: finalInfo.workType || "",
        jobType: finalInfo.jobType || "",
        salary: finalInfo.salary || "",
        securityClearance: finalInfo.securityClearance || "",
        url: finalInfo.url || url,
      });

      if (finalInfo.company?.trim()) {
        const { selectedProfileId } = await chrome.storage.local.get("selectedProfileId");
        chrome.runtime.sendMessage({
          type: "CHECK_SAME_COMPANY",
          data: {
            company: finalInfo.company.trim(),
            profileId: selectedProfileId || null,
          },
        });
      }

      if (!silent) showStatus(statusText, statusType);
    },
    [setFormFields, showStatus, useAiExtractor],
  );

  return { handleTrackCurrentPage };
}
