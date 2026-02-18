// Platform-specific selectors for job title and company name
const platformSelectors = {
  greenhouse: {
    jobTitle: ['.app-title', 'h1.application-title', '[data-qa="job-title"]', '.job-title'],
    company: ['.company-name', '[data-qa="company-name"]', 'img[alt]']
  },
  ashbyhq: {
    jobTitle: ['h1', '[class*="JobTitle"]', '[class*="job-title"]'],
    company: ['[class*="CompanyName"]', 'header img[alt]', 'a[href="/"]']
  },
  lever: {
    jobTitle: ['.posting-headline h2', 'h2[class*="posting"]', '.job-title'],
    company: ['.main-header-text a', '.company-name', 'header a']
  },
  workday: {
    jobTitle: ['h2[data-automation-id="jobPostingHeader"]', 'h1', '[class*="job-title"]'],
    company: ['[data-automation-id="company"]', 'img[alt]', '.company-name']
  },
  linkedin: {
    jobTitle: ['h1.t-24', '.job-details-jobs-unified-top-card__job-title', 'h2.job-title'],
    company: ['.job-details-jobs-unified-top-card__company-name', 'a.ember-view.job-details-jobs-unified-top-card__company-name', '.jobs-unified-top-card__company-name']
  },
  indeed: {
    jobTitle: ['h1.jobsearch-JobInfoHeader-title', '.jobsearch-JobInfoHeader-title', 'h1'],
    company: ['[data-company-name]', '.jobsearch-InlineCompanyRating-companyHeader', 'div[data-testid="inlineHeader-companyName"]']
  },
  smartrecruiters: {
    jobTitle: ['h1[class*="job-title"]', '.job-title', 'h1'],
    company: ['.company-name', '[class*="company"]', 'header img[alt]']
  },
  jobvite: {
    jobTitle: ['.jv-job-detail-title', 'h2.jv-header', 'h1'],
    company: ['.jv-job-detail-company', '.company-name', 'header a']
  },
  icims: {
    jobTitle: ['.iCIMS_JobTitle', 'h1.iCIMS_Heading', 'span.iCIMS_JobTitle'],
    company: ['.iCIMS_CompanyName', '.company-name', 'header img[alt]']
  },
  workable: {
    jobTitle: ['h1[data-ui="job-title"]', '.job-title', 'h1'],
    company: ['[data-ui="company-name"]', '.company-name', 'img[alt]']
  },
  default: {
    jobTitle: ['h1', '[class*="job-title"]', '[class*="jobTitle"]', '[class*="position"]', '[id*="job-title"]', 'h2'],
    company: ['[class*="company"]', '[class*="employer"]', '[id*="company"]', 'header img[alt]', 'img[alt]:not([alt=""])']
  }
};

const locationSelectorsByPlatform = {
  linkedin: [
    ".job-details-jobs-unified-top-card__primary-description-container",
    ".job-details-jobs-unified-top-card__bullet",
    ".jobs-unified-top-card__bullet"
  ],
  indeed: [
    '[data-testid="job-location"]',
    ".jobsearch-JobInfoHeader-subtitle div",
    '[data-testid="inlineHeader-companyLocation"]'
  ],
  greenhouse: [
    '[data-qa="job-location"]',
    ".location",
    '[class*="location"]'
  ],
  lever: [
    ".posting-categories .location",
    ".sort-by-location",
    '[class*="location"]'
  ],
  workday: [
    '[data-automation-id="locations"]',
    '[data-automation-id="location"]',
    '[class*="location"]'
  ],
  default: [
    '[data-testid*="location"]',
    '[class*="location"]',
    '[id*="location"]',
    '[aria-label*="location" i]'
  ]
};

// Detect platform from URL
export function detectPlatform() {
  const hostname = window.location.hostname;
  if (hostname.includes('greenhouse.io') || hostname.includes('greenhouse.com')) return 'greenhouse';
  if (hostname.includes('ashbyhq.com')) return 'ashbyhq';
  if (hostname.includes('lever.co')) return 'lever';
  if (hostname.includes('myworkdayjobs.com') || hostname.includes('workday.com')) return 'workday';
  if (hostname.includes('linkedin.com')) return 'linkedin';
  if (hostname.includes('indeed.com')) return 'indeed';
  if (hostname.includes('smartrecruiters.com')) return 'smartrecruiters';
  if (hostname.includes('jobvite.com')) return 'jobvite';
  if (hostname.includes('icims.com')) return 'icims';
  if (hostname.includes('workable.com')) return 'workable';
  return 'default';
}

// Extract text from element
function extractText(element) {
  if (!element) return '';
  
  // If it's an image, get alt text
  if (element.tagName === 'IMG') {
    return element.alt || '';
  }
  
  // Get text content and clean it
  return element.textContent.trim().replace(/\s+/g, ' ');
}

// Try multiple selectors and return first match
function findBySelectors(selectors) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = extractText(element);
      if (text) return text;
    }
  }
  return '';
}

// Extract company name from URL
function extractCompanyFromURL(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;
    
    // Workable: apply.workable.com/COMPANY/j/...
    if (hostname.includes('workable.com')) {
      const match = pathname.match(/^\/([^/]+)\//);
      if (match) return match[1];
    }
    
    // Greenhouse: boards.greenhouse.io/COMPANY/jobs/...
    if (hostname.includes('greenhouse.io') || hostname.includes('greenhouse.com')) {
      const match = pathname.match(/^\/([^/]+)\//);
      if (match) return match[1];
    }
    
    // Lever: jobs.lever.co/COMPANY/...
    if (hostname.includes('lever.co')) {
      const match = pathname.match(/^\/([^/]+)\//);
      if (match) return match[1];
    }
    
    // Ashby: jobs.ashbyhq.com/COMPANY/...
    if (hostname.includes('ashbyhq.com')) {
      const match = pathname.match(/^\/([^/]+)\//);
      if (match) return match[1];
    }
    
    // Workday: COMPANY.wd1.myworkdayjobs.com/...
    if (hostname.includes('myworkdayjobs.com')) {
      const match = hostname.match(/^([^.]+)\./);
      if (match) return match[1];
    }
    
    // Generic: Extract from subdomain if it's not 'www', 'jobs', 'careers', 'apply'
    const subdomain = hostname.split('.')[0];
    if (subdomain && !['www', 'jobs', 'careers', 'apply', 'career'].includes(subdomain)) {
      return subdomain;
    }
    
  } catch (e) {
    console.error('Error extracting company from URL:', e);
  }
  
  return '';
}

// Extract job title from URL
function extractJobTitleFromURL(url) {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    const patterns = [
      /\/job\/([^/?]+)/i,
      /\/jobs\/([^/?]+)/i,
      /\/position\/([^/?]+)/i,
      /\/j\/([^/?]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = pathname.match(pattern);
      if (match) {
        let title = match[1]
          .replace(/-/g, ' ')
          .replace(/_/g, ' ')
          .replace(/\d+$/, '')
          .trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        
        return title;
      }
    }
    
  } catch (e) {
    console.error('Error extracting job title from URL:', e);
  }
  
  return '';
}

// Clean and format company name
function cleanCompanyName(company) {
  if (!company) return '';
  
  return company
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

function cleanLocation(location) {
  if (!location) return "";

  return location
    .replace(/\b(location|job location)\b\s*[:-]?\s*/i, "")
    .replace(/\s+/g, " ")
    .replace(/[|•·]+$/g, "")
    .trim();
}

function getPageText() {
  return (document.body?.innerText || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40000);
}

function detectLocationFromText(text) {
  const patterns = [
    /\b(?:location|job location|office location)\b\s*[:-]\s*(.{2,80}?)(?=\s(?:department|salary|compensation|employment type|job type|benefits|responsibilities|requirements|apply)\b|$)/i,
    /\bbased in\s+(.{2,60}?)(?=\s(?:department|salary|compensation|employment type|job type|benefits|responsibilities|requirements|apply)\b|$)/i,
    /\blocated in\s+(.{2,60}?)(?=\s(?:department|salary|compensation|employment type|job type|benefits|responsibilities|requirements|apply)\b|$)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const candidate = cleanLocation(match[1]);
      if (candidate) return candidate;
    }
  }

  return "";
}

function detectWorkType(text) {
  const found = [];

  if (/\bremote\b|\bwork from home\b|\bwfh\b/i.test(text)) {
    found.push("Remote");
  }
  if (/\bhybrid\b|\bflexible location\b|\bpartially remote\b/i.test(text)) {
    found.push("Hybrid");
  }
  if (
    /\bon[- ]?site\b|\bin[- ]?office\b|\bon[- ]?premise\b|\bon premises\b/i.test(
      text
    )
  ) {
    found.push("Onsite");
  }

  return [...new Set(found)];
}

function detectJobType(text) {
  const found = [];

  if (/\bfull[- ]?time\b/i.test(text)) found.push("Full-time");
  if (/\bpart[- ]?time\b/i.test(text)) found.push("Part-time");
  if (/\bcontract(or)?\b|\bcontract[- ]?to[- ]?hire\b/i.test(text)) {
    found.push("Contract");
  }
  if (/\bintern(ship)?\b/i.test(text)) found.push("Internship");
  if (/\btemporary\b|\btemp\b/i.test(text)) found.push("Temporary");

  return [...new Set(found)];
}

function detectSalary(text) {
  const patterns = [
    /\$\s?\d{1,3}(?:,\d{3})+(?:\.\d+)?\s*(?:-|–|—|to)\s*\$\s?\d{1,3}(?:,\d{3})+(?:\.\d+)?(?:\s*\/\s*(?:year|yr|month|mo|hour|hr))?/i,
    /\$\s?\d{2,4}(?:\.\d+)?\s*(?:-|–|—|to)\s*\$\s?\d{2,4}(?:\.\d+)?(?:\s*\/\s*(?:year|yr|month|mo|hour|hr))?/i,
    /\$\s?\d{1,3}(?:,\d{3})+(?:\.\d+)?(?:\s*\/\s*(?:year|yr|month|mo|hour|hr))?/i,
    /\b(?:salary|compensation|pay)\b[^.]{0,80}\$\s?\d{1,3}(?:,\d{3})+(?:\.\d+)?(?:\s*(?:-|–|—|to)\s*\$\s?\d{1,3}(?:,\d{3})+(?:\.\d+)?)?/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0].trim();
  }

  return "";
}

function detectSecurityClearance(text) {
  const found = [];

  if (
    /\bsecurity clearance\b|\bclearance required\b|\bmust be clearable\b/i.test(
      text
    )
  ) {
    found.push("Clearance required");
    if (/\bsecret clearance\b|\bsecret\b/i.test(text)) found.push("Secret");
  }
  if (/\bpublic trust\b/i.test(text)) found.push("Public Trust");
  if (/\btop secret\b|\bts\/sci\b|\bts sci\b/i.test(text)) {
    found.push("Top Secret / TS-SCI");
  }

  return [...new Set(found)];
}

// Extract job information from page
export function extractJobInfo() {
  const platform = detectPlatform();
  const selectors = platformSelectors[platform] || platformSelectors.default;
  
  let jobURL = window.location.href;
  
  // Try multiple extraction methods for job title
  let jobTitle = '';
  
  // Method 1: Extract from DOM selectors
  jobTitle = findBySelectors(selectors.jobTitle);
  
  // Method 2: Extract from URL (if selectors failed)
  if (!jobTitle) {
    jobTitle = extractJobTitleFromURL(jobURL);
  }
  
  // Method 3: Extract from page title
  if (!jobTitle && document.title) {
    const titleParts = document.title.split(/[-|–—]/);
    if (titleParts.length > 0) {
      jobTitle = titleParts[0].trim();
    }
  }
  
  // Try multiple extraction methods for company name
  let company = '';
  
  // Method 1: Extract from URL (prioritize this as it's more reliable)
  company = extractCompanyFromURL(jobURL);
  
  // Method 2: Extract from DOM selectors (if URL extraction failed)
  if (!company) {
    company = findBySelectors(selectors.company);
  }
  
  // Method 3: Extract from page title
  if (!company && document.title) {
    const titleParts = document.title.split(/[-|–—]/);
    if (titleParts.length > 1) {
      company = titleParts[titleParts.length - 1].trim();
    }
  }
  
  // Clean company name
  if (company) {
    company = cleanCompanyName(company);
  }

  const pageText = getPageText();
  const locationSelectors =
    locationSelectorsByPlatform[platform] || locationSelectorsByPlatform.default;
  let location = findBySelectors(locationSelectors);

  if (!location) {
    location = detectLocationFromText(pageText);
  }

  location = cleanLocation(location);
  const workTypes = detectWorkType(pageText);
  const jobTypes = detectJobType(pageText);
  const salary = detectSalary(pageText);
  const clearance = detectSecurityClearance(pageText);
  
  return {
    jobTitle: jobTitle || '',
    company: company || '',
    url: jobURL,
    platform: platform,
    location: location || '',
    workType: workTypes.join(', '),
    jobType: jobTypes.join(', '),
    salary: salary || '',
    securityClearance: clearance.join(', ')
  };
}
