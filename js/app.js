/**
 * app.js
 * Main application controller for JobLens.
 * Orchestrates the flow: Upload → Parse → Select Country → Search → Display Results.
 */

(function () {
  'use strict';

  // ============================================================
  // Application State
  // ============================================================
  const state = {
    resumeData: null,       // Parsed resume data
    currentPage: 1,
    currentFilter: 'all',
    currentSort: 'relevance',
    currentCountry: '',
    currentCity: '',
    cachedResults: null,    // Full unique job list from last search
    cachedSources: [],
    cachedErrors: [],
    isSearching: false,
    isParsing: false,
    searchGeneration: 0,
    apiKey: localStorage.getItem('joblens_api_key') || '',
    adzunaId: localStorage.getItem('joblens_adzuna_id') || '',
    adzunaKey: localStorage.getItem('joblens_adzuna_key') || '',
    viewMode: 'search',     // 'search' | 'bookmarks'
  };
  let dragCounter = 0;

  // ============================================================
  // DOM References
  // ============================================================
  const dom = {
    // Sections
    heroSection: document.getElementById('hero-section'),
    uploadSection: document.getElementById('upload-section'),
    processingSection: document.getElementById('processing-section'),
    resumeResultsSection: document.getElementById('resume-results-section'),
    resultsSection: document.getElementById('results-section'),
    bookmarksSection: document.getElementById('bookmarks-section'),

    // Upload
    uploadZone: document.getElementById('upload-zone'),
    fileInput: document.getElementById('file-input'),

    // Resume panel
    techSkillsTags: document.getElementById('tech-skills-tags'),
    jobTitlesTags: document.getElementById('job-titles-tags'),
    softSkillsTags: document.getElementById('soft-skills-tags'),
    techSkillsSection: document.getElementById('tech-skills-section'),
    jobTitlesSection: document.getElementById('job-titles-section'),
    softSkillsSection: document.getElementById('soft-skills-section'),
    countrySelect: document.getElementById('country-select'),
    cityInput: document.getElementById('city-input'),
    btnSearch: document.getElementById('btn-search'),
    btnChangeResume: document.getElementById('btn-change-resume'),

    // Results
    jobsGrid: document.getElementById('jobs-grid'),
    pagination: document.getElementById('pagination'),
    resultsCountNumber: document.getElementById('results-count-number'),
    resultsSource: document.getElementById('results-source'),
    filtersBar: document.getElementById('filters-bar'),
    sortSelect: document.getElementById('sort-select'),
    externalLinksSection: document.getElementById('external-links-section'),
    externalLinksGrid: document.getElementById('external-links-grid'),

    // Bookmarks
    bookmarksGrid: document.getElementById('bookmarks-grid'),
    bookmarksCountDisplay: document.getElementById('bookmarks-count-display'),
    bookmarksCount: document.getElementById('bookmarks-count'),
    bookmarksToggle: document.getElementById('bookmarks-toggle'),
    btnBackToResults: document.getElementById('btn-back-to-results'),

    // Settings
    apiKeyBtn: document.getElementById('api-key-btn'),
    apiKeyModal: document.getElementById('api-key-modal'),
    apiKeyInput: document.getElementById('api-key-input'),
    adzunaIdInput: document.getElementById('adzuna-id-input'),
    adzunaKeyInput: document.getElementById('adzuna-key-input'),
    modalClose: document.getElementById('modal-close'),
    btnSaveKey: document.getElementById('btn-save-key'),
    btnSkipKey: document.getElementById('btn-skip-key'),

    // Header
    apiStatusBadge: document.getElementById('api-status-badge'),
    apiStatusText: document.getElementById('api-status-text'),
    logoLink: document.getElementById('logo-link'),
  };

  // ============================================================
  // Initialization
  // ============================================================
  function init() {
    setupEventListeners();
    updateApiStatus();
    updateBookmarksCount();

    // Show API key modal on first visit if no key is saved
    if (!state.apiKey && !(state.adzunaId && state.adzunaKey)) {
      setTimeout(() => {
        showApiKeyModal();
      }, 1000);
    }
  }

  // ============================================================
  // Event Listeners
  // ============================================================
  function setupEventListeners() {
    // --- File Upload ---
    dom.uploadZone.addEventListener('click', () => dom.fileInput.click());
    dom.uploadZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        dom.fileInput.click();
      }
    });

    dom.fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop (counter avoids flicker when entering child nodes)
    dom.uploadZone.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter += 1;
      dom.uploadZone.classList.add('drag-over');
    });
    dom.uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
    dom.uploadZone.addEventListener('dragleave', () => {
      dragCounter = Math.max(0, dragCounter - 1);
      if (dragCounter === 0) {
        dom.uploadZone.classList.remove('drag-over');
      }
    });
    dom.uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      dom.uploadZone.classList.remove('drag-over');
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    });

    // --- Resume Panel ---
    dom.btnChangeResume.addEventListener('click', resetToUpload);
    dom.countrySelect.addEventListener('change', () => {
      state.currentCountry = dom.countrySelect.value;
      dom.btnSearch.disabled = !state.currentCountry;
    });
    dom.cityInput.addEventListener('input', () => {
      state.currentCity = dom.cityInput.value.trim();
    });
    dom.btnSearch.addEventListener('click', handleSearch);

    // --- Filters ---
    dom.filtersBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (btn) {
        const filter = btn.dataset.filter;
        if (filter) {
          setActiveFilter(filter);
          handleFilterChange(filter);
        }
      }
    });

    dom.sortSelect.addEventListener('change', () => {
      state.currentSort = dom.sortSelect.value;
      if (state.cachedResults) {
        state.currentPage = 1;
        renderCachedJobs();
      }
    });

    // --- Bookmarks ---
    dom.bookmarksToggle.addEventListener('click', toggleBookmarksView);
    dom.btnBackToResults.addEventListener('click', () => {
      switchView('search');
    });

    // --- Settings Modal ---
    dom.apiKeyBtn.addEventListener('click', showApiKeyModal);
    dom.modalClose.addEventListener('click', closeApiKeyModal);
    dom.btnSaveKey.addEventListener('click', saveApiKey);
    dom.btnSkipKey.addEventListener('click', () => {
      closeApiKeyModal();
      UI.showToast('Using Arbeitnow only. Add API key in Settings for more results.', 'info', '💡');
    });

    // Close modal on overlay click
    dom.apiKeyModal.addEventListener('click', (e) => {
      if (e.target === dom.apiKeyModal) {
        closeApiKeyModal();
      }
    });

    // Close modal on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dom.apiKeyModal.classList.contains('active')) {
        closeApiKeyModal();
      }
    });

    // --- Logo reset ---
    dom.logoLink.addEventListener('click', (e) => {
      e.preventDefault();
      resetToUpload();
    });
  }

  // ============================================================
  // File Handling
  // ============================================================
  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) handleFile(file);
  }

  async function handleFile(file) {
    if (state.isParsing) return;

    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const validExtensions = ['.pdf', '.docx'];
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
      UI.showToast('Please upload a PDF or DOCX file.', 'error', '📄');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      UI.showToast('File is too large. Maximum size is 10MB.', 'error', '📦');
      return;
    }

    state.isParsing = true;
    transitionToProcessing();

    try {
      const resumeData = await ResumeParser.parseResume(file, (step, status) => {
        UI.updateProcessingStep(step, status);
      });

      state.resumeData = resumeData;

      // Brief delay before showing results
      await new Promise(r => setTimeout(r, 500));

      transitionToResumeResults(resumeData);
    } catch (err) {
      console.error('Resume parse error:', err);
      UI.showToast(err.message || 'Failed to parse resume. Please try a different file.', 'error', '❌');
      resetToUpload();
    } finally {
      state.isParsing = false;
    }
  }

  // ============================================================
  // Search
  // ============================================================
  async function handleSearch() {
    if (!state.resumeData || !state.currentCountry) return;

    const generation = ++state.searchGeneration;
    state.isSearching = true;
    state.currentPage = 1;
    if (dom.btnSearch) dom.btnSearch.disabled = true;

    transitionToResults();
    UI.renderSkeletons(dom.jobsGrid, 5);
    dom.pagination.innerHTML = '';
    dom.resultsCountNumber.textContent = '...';
    dom.resultsSource.textContent = 'Searching job boards...';

    try {
      const results = await JobSearch.searchJobs({
        queries: state.resumeData.searchQueries,
        country: state.currentCountry,
        city: state.currentCity,
        apiKey: state.apiKey,
        adzunaId: state.adzunaId,
        adzunaKey: state.adzunaKey,
        filter: 'all',
        sort: 'relevance',
      });

      if (generation !== state.searchGeneration) return;

      state.cachedResults = results.allJobs || results.jobs;
      state.cachedSources = results.sources;
      state.cachedErrors = results.errors;

      renderCachedJobs();
      renderExternalLinks();

      if (results.errors.length > 0 && (results.allJobs || results.jobs).length > 0) {
        results.errors.forEach((err) => {
          UI.showToast(err, 'warning', '⚠️');
        });
      }

      dom.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      if (generation !== state.searchGeneration) return;
      console.error('Search error:', err);
      UI.renderErrorState(err.message || 'Failed to search jobs. Please try again.', handleSearch);
    } finally {
      if (generation === state.searchGeneration) {
        state.isSearching = false;
        if (dom.btnSearch) dom.btnSearch.disabled = !state.currentCountry;
      }
    }
  }

  function renderCachedJobs() {
    if (!state.cachedResults) return;

    const filtered = JobSearch.sortJobs(
      JobSearch.applyFilter(state.cachedResults, state.currentFilter),
      state.currentSort
    );
    const page = JobSearch.paginateJobs(filtered, state.currentPage);
    state.currentPage = page.currentPage;

    dom.resultsCountNumber.textContent = page.totalJobs;
    dom.resultsSource.textContent = state.cachedSources.length > 0
      ? `From: ${state.cachedSources.join(' • ')}`
      : 'No sources available';

    if (page.jobs.length === 0 && state.cachedErrors.length > 0 && filtered.length === 0 && state.cachedResults.length === 0) {
      UI.renderErrorState(state.cachedErrors.join('. '), handleSearch);
      dom.pagination.innerHTML = '';
      return;
    }

    UI.renderJobCards(page.jobs, dom.jobsGrid);
    UI.renderPagination(page.totalPages, page.currentPage, dom.pagination, handlePageChange);
  }

  function handlePageChange(page) {
    state.currentPage = page;
    renderCachedJobs();
    window.scrollTo({ top: dom.resultsSection.offsetTop - 80, behavior: 'smooth' });
  }

  function handleFilterChange(filter) {
    state.currentFilter = filter;
    state.currentPage = 1;
    if (state.cachedResults) {
      renderCachedJobs();
    }
  }

  function renderExternalLinks() {
    const query = state.resumeData?.searchQueries?.[0] || 'developer';
    const links = JobSearch.generateExternalLinks(query, state.currentCountry, state.currentCity);
    
    if (links.length > 0) {
      dom.externalLinksGrid.innerHTML = links.map(link => `
        <a href="${link.url}" target="_blank" rel="noopener" class="btn-external-link">
          ${link.name} ↗
        </a>
      `).join('');
      dom.externalLinksSection.style.display = 'block';
    } else {
      dom.externalLinksSection.style.display = 'none';
    }
  }

  function setActiveFilter(filter) {
    const buttons = dom.filtersBar.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
  }

  // ============================================================
  // View Transitions
  // ============================================================
  function transitionToProcessing() {
    dom.uploadSection.style.display = 'none';
    dom.heroSection.querySelector('.hero-badge').style.display = 'none';
    dom.heroSection.querySelector('.hero-title').style.display = 'none';
    dom.heroSection.querySelector('.hero-subtitle').style.display = 'none';
    UI.hideSection('resume-results-section');
    UI.hideSection('results-section');
    UI.showSection('processing-section');

    // Reset processing steps
    ['extract', 'skills', 'country'].forEach(step => {
      UI.updateProcessingStep(step, 'pending');
    });
  }

  function transitionToResumeResults(resumeData) {
    UI.hideSection('processing-section');
    dom.heroSection.style.display = 'none';
    UI.showSection('resume-results-section');

    // Render skills
    if (resumeData.technicalSkills.length > 0) {
      UI.renderSkillTags(resumeData.technicalSkills, dom.techSkillsTags, 'tech');
      dom.techSkillsSection.style.display = '';
    } else {
      dom.techSkillsSection.style.display = 'none';
    }

    if (resumeData.jobTitles.length > 0) {
      UI.renderSkillTags(resumeData.jobTitles, dom.jobTitlesTags, 'title');
      dom.jobTitlesSection.style.display = '';
    } else {
      dom.jobTitlesSection.style.display = 'none';
    }

    if (resumeData.softSkills.length > 0) {
      UI.renderSkillTags(resumeData.softSkills, dom.softSkillsTags, 'soft');
      dom.softSkillsSection.style.display = '';
    } else {
      dom.softSkillsSection.style.display = 'none';
    }

    // Set detected country
    if (resumeData.detectedCountry) {
      dom.countrySelect.value = resumeData.detectedCountry;
      state.currentCountry = resumeData.detectedCountry;
      dom.cityInput.value = '';
      state.currentCity = '';
      dom.btnSearch.disabled = false;
      UI.showToast(
        `Detected country: ${SkillsDatabase.countryToFullName[resumeData.detectedCountry] || resumeData.detectedCountry}`,
        'success',
        '🌍'
      );
    } else {
      dom.countrySelect.value = '';
      state.currentCountry = '';
      dom.cityInput.value = '';
      state.currentCity = '';
      dom.btnSearch.disabled = true;
    }

    dom.resumeResultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function transitionToResults() {
    UI.showSection('results-section');
    UI.hideSection('bookmarks-section');
    state.viewMode = 'search';
  }

  function resetToUpload() {
    state.resumeData = null;
    state.currentPage = 1;
    state.currentFilter = 'all';
    state.currentSort = 'relevance';
    state.currentCountry = '';
    state.currentCity = '';
    state.cachedResults = null;
    state.cachedSources = [];
    state.cachedErrors = [];
    state.viewMode = 'search';
    state.searchGeneration += 1;

    UI.hideSection('processing-section');
    UI.hideSection('resume-results-section');
    UI.hideSection('results-section');
    UI.hideSection('bookmarks-section');
    dom.externalLinksSection.style.display = 'none';

    dom.heroSection.style.display = '';
    dom.heroSection.querySelector('.hero-badge').style.display = '';
    dom.heroSection.querySelector('.hero-title').style.display = '';
    dom.heroSection.querySelector('.hero-subtitle').style.display = '';
    dom.uploadSection.style.display = '';

    dom.fileInput.value = '';
    dom.cityInput.value = '';
    if (dom.countrySelect) dom.countrySelect.value = '';
    if (dom.sortSelect) dom.sortSelect.value = 'relevance';
    if (dom.btnSearch) dom.btnSearch.disabled = true;

    setActiveFilter('all');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ============================================================
  // Bookmarks View
  // ============================================================
  function toggleBookmarksView() {
    if (state.viewMode === 'bookmarks') {
      switchView('search');
    } else {
      switchView('bookmarks');
    }
  }

  function switchView(mode) {
    state.viewMode = mode;

    if (mode === 'bookmarks') {
      UI.hideSection('results-section');
      UI.hideSection('resume-results-section');
      if (dom.heroSection) dom.heroSection.style.display = 'none';
      UI.showSection('bookmarks-section');

      const bookmarks = BookmarkManager.getAllJobs();
      dom.bookmarksCountDisplay.textContent = bookmarks.length;
      UI.renderJobCards(bookmarks, dom.bookmarksGrid);
    } else {
      UI.hideSection('bookmarks-section');
      if (state.resumeData) {
        UI.showSection('resume-results-section');
      } else if (dom.heroSection) {
        dom.heroSection.style.display = '';
      }
      if (state.cachedResults) {
        UI.showSection('results-section');
      }
    }
  }

  function updateBookmarksCount() {
    const count = BookmarkManager.getCount();
    dom.bookmarksCount.textContent = count;
  }

  // ============================================================
  // API Key Management
  // ============================================================
  function showApiKeyModal() {
    dom.apiKeyModal.classList.add('active');
    dom.apiKeyInput.value = state.apiKey;
    dom.adzunaIdInput.value = state.adzunaId;
    dom.adzunaKeyInput.value = state.adzunaKey;
    dom.apiKeyInput.focus();
  }

  function closeApiKeyModal() {
    dom.apiKeyModal.classList.remove('active');
  }

  function saveApiKey() {
    const key = dom.apiKeyInput.value.trim();
    const adzunaId = dom.adzunaIdInput.value.trim();
    const adzunaKey = dom.adzunaKeyInput.value.trim();
    
    state.apiKey = key;
    state.adzunaId = adzunaId;
    state.adzunaKey = adzunaKey;

    if (key) {
      localStorage.setItem('joblens_api_key', key);
    } else {
      localStorage.removeItem('joblens_api_key');
    }

    if (adzunaId && adzunaKey) {
      localStorage.setItem('joblens_adzuna_id', adzunaId);
      localStorage.setItem('joblens_adzuna_key', adzunaKey);
    } else {
      localStorage.removeItem('joblens_adzuna_id');
      localStorage.removeItem('joblens_adzuna_key');
      if (adzunaId || adzunaKey) {
        UI.showToast('Adzuna needs both App ID and App Key. Partial values were not saved.', 'warning', '⚠️');
      }
    }

    if (key || (adzunaId && adzunaKey)) {
      UI.showToast('API keys saved! You can now search more job boards.', 'success', '🔑');
    } else {
      UI.showToast('API keys removed. Using Arbeitnow only.', 'info', '💡');
    }

    updateApiStatus();
    closeApiKeyModal();
  }

  function updateApiStatus() {
    if (state.apiKey || (state.adzunaId && state.adzunaKey)) {
      dom.apiStatusText.textContent = 'Full Access';
      dom.apiStatusBadge.querySelector('.stat-dot').style.background = 'var(--text-success)';
    } else {
      dom.apiStatusText.textContent = 'Limited (No API Key)';
      dom.apiStatusBadge.querySelector('.stat-dot').style.background = 'var(--text-warning)';
    }
  }

  // ============================================================
  // Boot
  // ============================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
