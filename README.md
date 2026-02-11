# Job Application Tracker Extension

A Chrome extension that helps you track your job applications and automatically saves them to Google Sheets. Built with React, Tailwind CSS, and Vite.

## Features

- **Quick Track with F9**: Press F9 on any job posting page to auto-extract job information
- **Manual Tracking**: Fill in job details manually through the sidebar interface
- **Google Sheets Integration**: Automatically saves applications to your Google Sheet
- **Duplicate Detection**: Warns you if you've already applied to the same position
- **Multi-Platform Support**: Automatically extracts job info from popular job boards:
  - Greenhouse
  - Lever
  - Workday
  - LinkedIn
  - Indeed
  - SmartRecruiters
  - And many more...

## Setup Instructions

### 1. Build the Extension

```bash
npm install
npm run build
```

### 2. Load the Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `dist` folder from this project

### 3. Configure Google Sheets Integration

#### Create a Google Sheet

1. Create a new Google Sheet
2. Add these column headers in the first row:
   - A1: `Date & Time`
   - B1: `URL`
   - C1: `Job Title`
   - D1: `Company`
3. Copy the Sheet ID from the URL (the long string between `/d/` and `/edit`)

#### Create a Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Sheets API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"
4. Create a service account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in the details and click "Create"
   - Skip the optional steps and click "Done"
5. Create a JSON key:
   - Click on the service account you just created
   - Go to the "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON" and click "Create"
   - Save the downloaded JSON file

#### Share Your Sheet with the Service Account

1. Open your Google Sheet
2. Click the "Share" button
3. Paste the service account email (found in the JSON file as `client_email`)
4. Give it "Editor" access
5. Click "Send"

#### Configure the Extension

1. Click the "Job Tracker" button on the right side of any webpage
2. Go to the "Settings" tab
3. **Service Account Configuration**:
   - Open the JSON file you downloaded
   - Copy the entire content
   - Paste it into the "Service Account JSON" textarea
   - Click "Save Service Account"
4. **Sheet Configuration**:
   - Paste your Sheet ID
   - Enter the Sheet Name (default is "Sheet1")
   - Click "Save Settings"

## Usage

### Quick Track (Recommended)

1. Navigate to any job posting page
2. Press **F9** on your keyboard
3. The sidebar will open with auto-extracted information
4. Review the details and click "Save to Sheets"

### Manual Track

1. Click the "Job Tracker" button on the right side of any webpage
2. Click "Track Current Page" to auto-extract info, or fill in manually:
   - Job Title
   - Company
   - URL
   - Date & Time
3. Click "Save to Sheets"

## Development

### Run in Development Mode

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Project Structure

```
tracker-extension/
├── public/
│   └── manifest.json          # Extension manifest
├── src/
│   ├── background/
│   │   └── index.js          # Background service worker
│   ├── components/
│   │   ├── App.jsx           # Main application component
│   │   └── ui/
│   │       └── TabBtn.jsx    # Sidebar toggle button
│   ├── content/
│   │   ├── index.jsx         # Content script entry point
│   │   └── content.css       # Styles for content script
│   └── utils/
│       ├── jobExtractor.js   # Job information extraction logic
│       └── datetime.js       # Date/time utilities
└── vite.config.js            # Vite configuration
```

## Features Explained

### Automatic Job Extraction

The extension automatically detects and extracts:
- **Job Title**: From page heading, URL, or page title
- **Company Name**: From page content, URL, or subdomain
- **URL**: Current page URL
- **Platform**: Identifies the job board (Greenhouse, Lever, etc.)

### Duplicate Detection

Before saving, the extension checks if you've already applied to the same position by comparing:
- URL
- Job Title
- Company Name

If a duplicate is found, you'll receive a warning notification.

### Timezone Support

All timestamps are saved in Bangkok timezone (UTC+7) by default. You can modify this in `src/utils/datetime.js` if needed.

## Troubleshooting

### Extension Not Working

1. Make sure you've built the extension: `npm run build`
2. Reload the extension in `chrome://extensions/`
3. Refresh the webpage you're testing on

### Can't Save to Google Sheets

1. Verify your service account JSON is correct
2. Make sure you've shared the sheet with the service account email
3. Check that the Sheet ID is correct
4. Ensure the Google Sheets API is enabled in your Google Cloud project

### Job Info Not Extracting

Some job boards may not be supported or may have changed their HTML structure. You can:
1. Use manual entry instead
2. Open an issue on GitHub with the job board URL

## Privacy

This extension:
- Only activates when you use it (F9 or sidebar button)
- Stores settings locally in your browser
- Only sends data to Google Sheets (your own sheet)
- Does not collect or transmit any data to third parties

## License

MIT License - Feel free to modify and use as needed.
