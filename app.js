/**
 * KRIYA QUEST SCANNER APPLICATION (app.js)
 * 
 * Logic to dynamically load experiment details, toggle buttons,
 * and manage video accordion controls with smooth transitions.
 */

// CONFIGURATION: If you want to use Google Sheets as your database, 
// 1. Share your Google Sheet, select "File" -> "Share" -> "Publish to web".
// 2. Select the sheet, choose "Comma-separated values (.csv)", and click Publish.
// 3. Paste the generated URL here.
const GOOGLE_SHEET_CSV_URL = ""; 

// Icon SVG mappings for dynamic tabs
const ICONS = {
  build: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`,
  understand: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
  explore: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>`
};

// DOM Elements
const loadingState = document.getElementById('loadingState');
const errorState = document.getElementById('errorState');
const activeContent = document.getElementById('activeContent');
const invalidCodeDisplay = document.getElementById('invalidCodeDisplay');
const experimentTitle = document.getElementById('experimentTitle');

// Manual / PDF Elements
const manualContainer = document.getElementById('manualContainer');
const buttonManual = document.getElementById('buttonManual');

// Interactive Tab Buttons
const buttons = {
  build: document.getElementById('buttonBuild'),
  understand: document.getElementById('buttonUnderstand'),
  explore: document.getElementById('buttonExplore')
};

// Accordion Boxes
const boxes = {
  build: document.getElementById('boxBuild'),
  understand: document.getElementById('boxUnderstand'),
  explore: document.getElementById('boxExplore')
};

// Iframe Elements
const videos = {
  build: document.getElementById('videoBuild'),
  understand: document.getElementById('videoUnderstand'),
  explore: document.getElementById('videoExplore')
};

// Theme Elements
const themeToggle = document.getElementById('themeToggle');
const sunIcon = document.getElementById('sunIcon');
const moonIcon = document.getElementById('moonIcon');

// Active state tracking
let activeKey = null; // 'build', 'understand', 'explore', or null
let currentItem = null; // Active experiment data

/**
 * Extracts YouTube Video ID and returns a clean embed URL
 * Handles watch URLs, share links, and embed links.
 */
function getYouTubeEmbedUrl(url) {
  if (!url) return "";
  
  // Regular expressions to match YouTube video IDs
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  
  if (match && match[2].length === 11) {
    const videoId = match[2];
    // enablejsapi=1 allows pausing via postMessage. rel=0 hides related videos.
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&rel=0&autoplay=0`;
  }
  
  // Return original URL if it's already an embed link, or fallback
  return url;
}

/**
 * Sends a postMessage command to pause a YouTube iframe player
 */
function pauseYouTubeVideo(iframe) {
  if (!iframe || !iframe.src) return;
  try {
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: 'pauseVideo', args: '' }),
      '*'
    );
  } catch (error) {
    console.error("Error pausing video via postMessage:", error);
  }
}

/**
 * Dynamic accordion logic (based on your Wix Velo code)
 */
function toggleAccordion(key) {
  const button = buttons[key];
  const box = boxes[key];
  const iframe = videos[key];

  const isExpanded = box.classList.contains('expanded');

  if (!isExpanded) {
    // 1. Pause currently playing video
    if (activeKey && activeKey !== key) {
      pauseYouTubeVideo(videos[activeKey]);
      boxes[activeKey].classList.remove('expanded');
      buttons[activeKey].classList.remove('active');
      buttons[activeKey].setAttribute('aria-expanded', 'false');
    }

    // 2. Set active state
    activeKey = key;

    // 3. Lazy-load the video URL on first expand
    let videoUrl = "";
    if (key === 'build') videoUrl = currentItem.buildVideo;
    else if (key === 'understand') videoUrl = currentItem.explainerVideo;
    else if (key === 'explore') videoUrl = currentItem.extraVideo;

    const targetEmbedUrl = getYouTubeEmbedUrl(videoUrl);
    if (iframe.src !== targetEmbedUrl) {
      iframe.src = targetEmbedUrl;
    }

    // 4. Open current accordion
    box.classList.add('expanded');
    button.classList.add('active');
    button.setAttribute('aria-expanded', 'true');

    // Scroll to player smoothly (good mobile UX)
    setTimeout(() => {
      box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 300);

  } else {
    // Collapse current accordion
    activeKey = null;
    box.classList.remove('expanded');
    button.classList.remove('active');
    button.setAttribute('aria-expanded', 'false');
    
    // Pause video player
    pauseYouTubeVideo(iframe);
  }
}

/**
 * Dynamic layout builder based on dataset schema
 */
function renderPage(item) {
  currentItem = item;
  
  // 1. Update Title and metadata
  experimentTitle.textContent = item.title;
  document.title = `${item.title} | Kriya Quest Scanner`;

  // 2. Setup Manual Button (Dynamic)
  if (item.manualUrl && item.manualUrl.trim() !== "") {
    buttonManual.href = item.manualUrl;
    manualContainer.classList.remove('hidden');
  } else {
    manualContainer.classList.add('hidden');
  }

  // 3. Setup Custom Titles, Headers, and Descriptions (Dynamic Defaults)
  const buildIconName = item.buildIcon || "build";
  const explainerIconName = item.explainerIcon || "understand";
  const extraIconName = item.extraIcon || "explore";

  const buildIconSpan = buttons.build.querySelector('.tab-button-icon');
  if (buildIconSpan) {
    buildIconSpan.className = `tab-button-icon icon-${buildIconName}`;
    buildIconSpan.innerHTML = ICONS[buildIconName];
  }

  const understandIconSpan = buttons.understand.querySelector('.tab-button-icon');
  if (understandIconSpan) {
    understandIconSpan.className = `tab-button-icon icon-${explainerIconName}`;
    understandIconSpan.innerHTML = ICONS[explainerIconName];
  }

  const exploreIconSpan = buttons.explore.querySelector('.tab-button-icon');
  if (exploreIconSpan) {
    exploreIconSpan.className = `tab-button-icon icon-${extraIconName}`;
    exploreIconSpan.innerHTML = ICONS[extraIconName];
  }
  const buildTitle = buttons.build.querySelector('.tab-title');
  if (buildTitle) buildTitle.textContent = item.buildLabel || "Build";

  const understandTitle = buttons.understand.querySelector('.tab-title');
  if (understandTitle) understandTitle.textContent = item.explainerLabel || "Understand";

  const exploreTitle = buttons.explore.querySelector('.tab-title');
  if (exploreTitle) exploreTitle.textContent = item.extraLabel || "Explore";

  const buildHeader = boxes.build.querySelector('.video-info h3');
  if (buildHeader) buildHeader.textContent = item.buildHeader || "🛠️ Let's Build Your Project";

  const understandHeader = boxes.understand.querySelector('.video-info h3');
  if (understandHeader) understandHeader.textContent = item.explainerHeader || "💡 The Science Behind It";

  const exploreHeader = boxes.explore.querySelector('.video-info h3');
  if (exploreHeader) exploreHeader.textContent = item.extraHeader || "🚀 Real-world Applications & Experiments";

  const buildDesc = boxes.build.querySelector('.video-info p');
  if (buildDesc) buildDesc.textContent = item.buildDesc || "Follow along with the step-by-step video instructions to assemble your kit components correctly.";

  const understandDesc = boxes.understand.querySelector('.video-info p');
  if (understandDesc) understandDesc.textContent = item.explainerDesc || "Follow along with the step-by-step video instructions to assemble your kit components correctly.";

  const exploreDesc = boxes.explore.querySelector('.video-info p');
  if (exploreDesc) exploreDesc.textContent = item.extraDesc || "Follow along with the step-by-step video instructions to assemble your kit components correctly.";

  // 4. Setup Video Buttons Visibility
  const hasBuild = item.buildVideo && item.buildVideo.trim() !== "";
  const hasUnderstand = item.explainerVideo && item.explainerVideo.trim() !== "";
  const hasExplore = item.extraVideo && item.extraVideo.trim() !== "";

  if (hasBuild) {
    buttons.build.classList.remove('hidden');
  } else {
    buttons.build.classList.add('hidden');
  }

  if (hasUnderstand) {
    buttons.understand.classList.remove('hidden');
  } else {
    buttons.understand.classList.add('hidden');
  }

  if (hasExplore) {
    buttons.explore.classList.remove('hidden');
  } else {
    buttons.explore.classList.add('hidden');
  }

  // Dynamically update subtitles (Step 1, Step 2, etc.) or hide them if there's only 1 button
  const activeButtons = [];
  if (hasBuild) activeButtons.push(buttons.build);
  if (hasUnderstand) activeButtons.push(buttons.understand);
  if (hasExplore) activeButtons.push(buttons.explore);

  // Reset display style and default content
  Object.values(buttons).forEach(btn => {
    const subtitle = btn.querySelector('.tab-subtitle');
    if (subtitle) {
      subtitle.style.display = '';
    }
  });

  if (activeButtons.length === 1) {
    // Hide the subtitle since having only "Step 1" implies more steps exist
    const subtitle = activeButtons[0].querySelector('.tab-subtitle');
    if (subtitle) {
      subtitle.style.display = 'none';
    }
  } else {
    // Number them sequentially: Step 1, Step 2, Step 3
    activeButtons.forEach((btn, index) => {
      const subtitle = btn.querySelector('.tab-subtitle');
      if (subtitle) {
        subtitle.textContent = `Step ${index + 1}`;
      }
    });
  }

  // 4. Reset accordion states
  Object.keys(boxes).forEach(k => {
    boxes[k].classList.remove('expanded');
    buttons[k].classList.remove('active');
    buttons[k].setAttribute('aria-expanded', 'false');
    videos[k].src = ""; // Clear iframe source (save CPU & network)
  });
  activeKey = null;

  // Show content card and hide loading
  loadingState.classList.add('hidden');
  activeContent.classList.remove('hidden');
}

/**
 * Basic CSV Parser for Google Sheets Integration
 */
function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return {};
  
  // Simple CSV Split header row
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const database = {};

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    if (!row.trim()) continue;

    // Handle standard CSV split
    const values = [];
    let insideQuote = false;
    let currentVal = "";

    // Parse characters to handle commas inside quotes correctly
    for (let charIndex = 0; charIndex < row.length; charIndex++) {
      const char = row[charIndex];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        values.push(currentVal.trim().replace(/^"|"$/g, ''));
        currentVal = "";
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim().replace(/^"|"$/g, ''));

    // Construct item map
    const item = {};
    headers.forEach((header, index) => {
      item[header] = values[index] || "";
    });

    if (item.code) {
      const cleanCode = item.code.trim().toLowerCase();
      database[cleanCode] = {
        title: item.title ? item.title.trim() : cleanCode.toUpperCase(),
        manualUrl: item.manualUrl ? item.manualUrl.trim() : "",
        buildVideo: item.buildVideo ? item.buildVideo.trim() : "",
        explainerVideo: item.explainerVideo ? item.explainerVideo.trim() : "",
        extraVideo: item.extraVideo ? item.extraVideo.trim() : ""
      };
    }
  }
  return database;
}

/**
 * Core initialization and router
 */
async function initializeApp() {
  let database = window.scannerDataFallback || {};

  // 1. Fetch from Google Sheets if configured
  if (GOOGLE_SHEET_CSV_URL && GOOGLE_SHEET_CSV_URL.trim() !== "") {
    try {
      const response = await fetch(GOOGLE_SHEET_CSV_URL);
      if (response.ok) {
        const text = await response.text();
        const sheetData = parseCSV(text);
        // Merge with local fallback
        database = { ...database, ...sheetData };
      }
    } catch (e) {
      console.warn("Failed to load Google Sheet data. Using local data.js fallback.", e);
    }
  }

  // 2. Resolve scanner code from URL
  // Checks: 1) ?code=XYZ parameter  2) /XYZ dynamic subpath
  const urlParams = new URLSearchParams(window.location.search);
  let code = urlParams.get('code');

  if (!code) {
    // Read code from trailing path if query parameter is empty
    const pathParts = window.location.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    
    // Ignore index.html, empty path, or subpaths
    if (lastPart && lastPart !== 'index.html' && lastPart !== '') {
      code = lastPart.replace(/\.html$/, '');
    }
  }

  // 3. Route to content or display error
  if (code) {
    code = code.trim().toLowerCase();
  }

  if (code && database[code]) {
    const item = database[code];
    // Standardize key names in schema to match the Wix Velo structure
    const mappedItem = {
      title: item.title,
      manualUrl: item.manualUrl,
      buildVideo: item.buildVideo,
      explainerVideo: item.explainerVideo,
      extraVideo: item.extraVideo,
      buildLabel: item.buildLabel,
      explainerLabel: item.explainerLabel,
      extraLabel: item.extraLabel,
      buildHeader: item.buildHeader,
      explainerHeader: item.explainerHeader,
      extraHeader: item.extraHeader,
      buildDesc: item.buildDesc,
      explainerDesc: item.explainerDesc,
      extraDesc: item.extraDesc,
      buildIcon: item.buildIcon,
      explainerIcon: item.explainerIcon,
      extraIcon: item.extraIcon
    };
    renderPage(mappedItem);
  } else {
    // Show Error State
    loadingState.classList.add('hidden');
    errorState.classList.remove('hidden');

    // Get database keys for fuzzy matching
    const databaseKeys = Object.keys(database);
    let closestKey = null;

    if (code && databaseKeys.length > 0) {
      // 1. Simple substring matching (e.g. "perisc" matches "periscope")
      const lowerCode = code.toLowerCase().trim();
      closestKey = databaseKeys.find(key => key.includes(lowerCode) || lowerCode.includes(key));

      // 2. Levenshtein Distance matching if no substring match
      if (!closestKey) {
        let minDistance = 999;
        databaseKeys.forEach(key => {
          // Calculate Levenshtein Distance
          const a = lowerCode;
          const b = key.toLowerCase();
          const matrix = [];
          for (let i = 0; i <= b.length; i++) matrix[i] = [i];
          for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
          for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
              if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
              } else {
                matrix[i][j] = Math.min(
                  matrix[i - 1][j - 1] + 1, // substitution
                  Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1) // insertion/deletion
                );
              }
            }
          }
          const dist = matrix[b.length][a.length];
          if (dist < minDistance) {
            minDistance = dist;
            closestKey = key;
          }
        });

        // Only allow if edit distance is within reasonable limit (3 characters)
        if (minDistance > 3) {
          closestKey = null;
        }
      }
    }

    // Clear errorState content to rewrite cleanly (Option B)
    errorState.innerHTML = "";

    // Design the custom error state card
    if (closestKey) {
      // Option 1: Suggested Typo Correction Click-to-Load
      const iconContainer = document.createElement('div');
      iconContainer.className = "error-icon";
      iconContainer.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent-orange)"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
      errorState.appendChild(iconContainer);

      const title = document.createElement('h2');
      title.textContent = "Did you mean?";
      errorState.appendChild(title);

      const text = document.createElement('p');
      text.innerHTML = `It looks like there was a slight scan error. Did you mean to load the <strong>${database[closestKey].title}</strong> guide?`;
      errorState.appendChild(text);

      const actionBtn = document.createElement('button');
      actionBtn.className = "btn btn-primary";
      actionBtn.style.marginTop = "16px";
      actionBtn.textContent = `Yes, Load ${database[closestKey].title}`;
      actionBtn.addEventListener('click', () => {
        window.location.search = `?code=${closestKey}`;
      });
      errorState.appendChild(actionBtn);

      const cancelBtn = document.createElement('a');
      cancelBtn.href = "https://kriyaquest.com";
      cancelBtn.className = "btn btn-outline";
      cancelBtn.style.marginTop = "12px";
      cancelBtn.style.display = "inline-flex";
      cancelBtn.textContent = "No, Return Home";
      errorState.appendChild(cancelBtn);

    } else {
      // Option 2: Completely Unrecognized Code
      const iconContainer = document.createElement('div');
      iconContainer.className = "error-icon";
      iconContainer.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:#ef4444"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
      errorState.appendChild(iconContainer);

      const title = document.createElement('h2');
      title.textContent = "Experiment Not Found";
      errorState.appendChild(title);

      const text = document.createElement('p');
      text.innerHTML = `We couldn't load the guide for the scanned code: <strong>${code || "None"}</strong>. Please check your QR code or scan it again.`;
      errorState.appendChild(text);

      const homeBtn = document.createElement('a');
      homeBtn.href = "https://kriyaquest.com";
      homeBtn.className = "btn btn-primary";
      homeBtn.style.marginTop = "16px";
      homeBtn.textContent = "Return to Kriya Quest";
      errorState.appendChild(homeBtn);
    }
  }
}

// Bind Button Click Events
Object.keys(buttons).forEach(key => {
  buttons[key].addEventListener('click', () => toggleAccordion(key));
});

/**
 * Dark/Light Mode Switcher Logic
 */
function initTheme() {
  const currentTheme = localStorage.getItem('theme') || 'light';
  
  if (currentTheme === 'dark') {
    document.body.classList.add('dark');
    sunIcon.classList.remove('hidden');
    moonIcon.classList.add('hidden');
  } else {
    document.body.classList.remove('dark');
    sunIcon.classList.add('hidden');
    moonIcon.classList.remove('hidden');
  }

  themeToggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    if (isDark) {
      sunIcon.classList.remove('hidden');
      moonIcon.classList.add('hidden');
    } else {
      sunIcon.classList.add('hidden');
      moonIcon.classList.remove('hidden');
    }
  });
}

// Run app on page load
window.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  initTheme();
});
