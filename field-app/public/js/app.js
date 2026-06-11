/**
 * Skillfield Field App - Main Application
 * Handles hash-based routing and tab navigation
 */

// View renderer imports (loaded globally via script tags)
const views = {
  chat: window.renderChat,
  email: window.renderEmail,
  calendar: window.renderCalendar
};

// Current active tab
let currentTab = 'chat';

/**
 * Initialize the application
 */
function init() {
  // Set up tab click handlers
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      window.location.hash = tab;
    });
  });

  // Handle initial hash and hash changes
  handleRouteChange();

  // Listen for hash changes
  window.addEventListener('hashchange', handleRouteChange);
}

/**
 * Handle route changes (hash changes)
 */
function handleRouteChange() {
  const hash = window.location.hash.slice(1) || 'chat';
  const validTabs = ['chat', 'email', 'calendar'];

  // Validate hash
  if (!validTabs.includes(hash)) {
    window.location.hash = 'chat';
    return;
  }

  // Update active tab
  currentTab = hash;
  updateActiveTab(hash);

  // Render the appropriate view
  renderView(hash);
}

/**
 * Update the active tab styling
 * @param {string} activeTab - The tab to mark as active
 */
function updateActiveTab(activeTab) {
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    if (btn.dataset.tab === activeTab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

/**
 * Render the view for the specified tab
 * @param {string} tab - The tab name
 */
function renderView(tab) {
  const container = document.getElementById('content');

  if (!container) {
    console.error('Content container not found');
    return;
  }

  const renderFn = views[tab];
  if (renderFn && typeof renderFn === 'function') {
    renderFn(container);
  } else {
    container.innerHTML = `
      <div class="view-placeholder">
        <h2>${tab.charAt(0).toUpperCase() + tab.slice(1)}</h2>
        <p>View not available</p>
      </div>
    `;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
