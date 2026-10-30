/**
 * ui.js
 * UI rendering module — creates DOM elements for job cards, filters,
 * loading skeletons, toasts, and handles all visual updates.
 */

const UI = (() => {
  /**
   * Render job cards into the grid
   */
  function renderJobCards(jobs, container) {
    container.innerHTML = '';

    if (jobs.length === 0) {
      container.innerHTML = renderEmptyState();
      return;
    }

    jobs.forEach((job, index) => {
      const card = createJobCard(job, index);
      container.appendChild(card);
    });
  }

  /**
   * Create a single job card element
   */
  function createJobCard(job, index) {
    const card = document.createElement('div');
    card.className = `job-card stagger-${Math.min(index + 1, 8)}`;
    card.style.animation = `fadeInUp 0.4s ease-out ${index * 0.05}s both`;
    card.dataset.jobId = job.id;

    const isBookmarked = BookmarkManager.isBookmarked(job.id);
    const posted = job.postedDate ? new Date(job.postedDate) : null;
    const timeAgo = posted && !Number.isNaN(posted.getTime()) ? getTimeAgo(posted) : null;
    const applyUrl = sanitizeUrl(job.applyUrl);
    const description = job.description || '';
    const descriptionHtml = description
      ? `<div class="job-description">${escapeHtml(description.length > 250 ? description.substring(0, 250) + '...' : description)}</div>`
      : '';

    card.innerHTML = `
      <div class="job-card-header">
        <div class="job-company-logo"></div>
        <div class="job-card-info">
          <h3 class="job-title">${escapeHtml(job.title)}</h3>
          <div class="job-company">${escapeHtml(job.company)}</div>
        </div>
        <div class="job-card-actions">
          <button class="btn-bookmark ${isBookmarked ? 'bookmarked' : ''}"
                  data-job-id="${job.id}"
                  aria-label="${isBookmarked ? 'Remove bookmark' : 'Bookmark this job'}"
                  title="${isBookmarked ? 'Remove bookmark' : 'Bookmark this job'}">
            ${isBookmarked ? '★' : '☆'}
          </button>
        </div>
      </div>

      <div class="job-meta">
        <div class="job-meta-item">
          <span class="meta-icon">📍</span>
          <span>${escapeHtml(job.location)}</span>
        </div>
        ${job.type ? `
        <div class="job-meta-item">
          <span class="meta-icon">💼</span>
          <span>${escapeHtml(job.type)}</span>
        </div>
        ` : ''}
        ${job.salary ? `
        <div class="job-meta-item">
          <span class="meta-icon">💰</span>
          <span>${escapeHtml(job.salary)}</span>
        </div>
        ` : ''}
        ${timeAgo ? `
        <div class="job-meta-item">
          <span class="meta-icon">🕐</span>
          <span>${timeAgo}</span>
        </div>
        ` : ''}
      </div>

      ${descriptionHtml}

      <div class="job-card-footer">
        <div class="job-tags">
          ${job.isRemote ? '<span class="job-tag remote">🏠 Remote</span>' : ''}
          ${job.type ? `<span class="job-tag ${getTypeClass(job.type)}">${escapeHtml(job.type)}</span>` : ''}
          <span class="job-source">${escapeHtml(job.sourceDetail || job.source || '')}</span>
        </div>
        ${applyUrl
          ? `<a href="${applyUrl}" target="_blank" rel="noopener noreferrer" class="btn-apply">Apply →</a>`
          : `<span class="btn-apply" aria-disabled="true">Apply →</span>`}
      </div>
    `;

    const logoEl = card.querySelector('.job-company-logo');
    const initials = getInitials(job.company || '');
    const logoUrl = sanitizeUrl(job.companyLogo);
    if (logoUrl) {
      const img = document.createElement('img');
      img.src = logoUrl;
      img.alt = `${job.company || 'Company'} logo`;
      img.addEventListener('error', () => {
        logoEl.textContent = initials;
      });
      logoEl.appendChild(img);
    } else {
      logoEl.textContent = initials;
    }

    const bookmarkBtn = card.querySelector('.btn-bookmark');
    bookmarkBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleBookmark(job, bookmarkBtn);
    });

    const applyBtn = card.querySelector('.btn-apply');
    if (applyBtn) {
      applyBtn.addEventListener('click', (e) => e.stopPropagation());
    }

    card.addEventListener('click', () => {
      if (applyUrl) {
        window.open(applyUrl, '_blank', 'noopener,noreferrer');
      }
    });

    return card;
  }

  /**
   * Toggle bookmark state
   */
  function toggleBookmark(job, btn) {
    const isNowBookmarked = BookmarkManager.toggle(job);
    btn.className = `btn-bookmark ${isNowBookmarked ? 'bookmarked' : ''}`;
    btn.innerHTML = isNowBookmarked ? '★' : '☆';
    btn.setAttribute('aria-label', isNowBookmarked ? 'Remove bookmark' : 'Bookmark this job');
    btn.setAttribute('title', isNowBookmarked ? 'Remove bookmark' : 'Bookmark this job');

    // Update bookmarks count in header
    const countEl = document.getElementById('bookmarks-count');
    if (countEl) {
      countEl.textContent = BookmarkManager.getCount();
    }

    showToast(
      isNowBookmarked ? 'Job bookmarked!' : 'Bookmark removed',
      isNowBookmarked ? 'success' : 'info',
      isNowBookmarked ? '⭐' : '💫'
    );
  }

  /**
   * Render loading skeletons
   */
  function renderSkeletons(container, count = 5) {
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const skeleton = document.createElement('div');
      skeleton.className = 'skeleton';
      skeleton.style.animation = `fadeIn 0.3s ease-out ${i * 0.1}s both`;
      skeleton.innerHTML = `
        <div class="skeleton-header">
          <div class="skeleton-line circle"></div>
          <div style="flex:1;">
            <div class="skeleton-line medium"></div>
            <div class="skeleton-line short" style="margin-top: 8px;"></div>
          </div>
        </div>
        <div class="skeleton-meta">
          <div class="skeleton-line" style="width:80px;"></div>
          <div class="skeleton-line" style="width:100px;"></div>
          <div class="skeleton-line" style="width:70px;"></div>
        </div>
        <div class="skeleton-line long"></div>
        <div class="skeleton-line medium"></div>
      `;
      container.appendChild(skeleton);
    }
  }

  /**
   * Render pagination controls
   */
  function renderPagination(totalPages, currentPage, container, onPageChange) {
    container.innerHTML = '';

    if (totalPages <= 1) return;

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn nav-btn';
    prevBtn.innerHTML = '← Prev';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => onPageChange(currentPage - 1));
    container.appendChild(prevBtn);

    // Page numbers
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (start > 1) {
      container.appendChild(createPageBtn(1, currentPage, onPageChange));
      if (start > 2) {
        const dots = document.createElement('span');
        dots.textContent = '…';
        dots.style.cssText = 'color: var(--text-tertiary); padding: 0 8px;';
        container.appendChild(dots);
      }
    }

    for (let i = start; i <= end; i++) {
      container.appendChild(createPageBtn(i, currentPage, onPageChange));
    }

    if (end < totalPages) {
      if (end < totalPages - 1) {
        const dots = document.createElement('span');
        dots.textContent = '…';
        dots.style.cssText = 'color: var(--text-tertiary); padding: 0 8px;';
        container.appendChild(dots);
      }
      container.appendChild(createPageBtn(totalPages, currentPage, onPageChange));
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn nav-btn';
    nextBtn.innerHTML = 'Next →';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => onPageChange(currentPage + 1));
    container.appendChild(nextBtn);
  }

  function createPageBtn(page, currentPage, onPageChange) {
    const btn = document.createElement('button');
    btn.className = `page-btn ${page === currentPage ? 'active' : ''}`;
    btn.textContent = page;
    btn.addEventListener('click', () => onPageChange(page));
    return btn;
  }

  /**
   * Render skill tags
   */
  function renderSkillTags(skills, container, type = 'tech') {
    container.innerHTML = '';
    skills.forEach(skill => {
      const tag = document.createElement('span');
      tag.className = `skill-tag ${type}`;
      tag.textContent = skill;
      container.appendChild(tag);
    });
  }

  /**
   * Render empty state
   */
  function renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3 class="empty-state-title">No jobs found</h3>
        <p class="empty-state-text">
          Try adjusting your filters or search with different keywords. The Arbeitnow API may have limited results for some queries.
        </p>
      </div>
    `;
  }

  /**
   * Render error state
   */
  function renderErrorState(message, onRetry) {
    const container = document.getElementById('jobs-grid');
    container.innerHTML = `
      <div class="error-state">
        <div class="error-state-icon">⚠️</div>
        <h3 class="error-state-title">Something went wrong</h3>
        <p class="error-state-text">${escapeHtml(message)}</p>
        <button class="btn-retry" id="btn-retry">🔄 Try Again</button>
      </div>
    `;

    const retryBtn = container.querySelector('#btn-retry');
    if (retryBtn && onRetry) {
      retryBtn.addEventListener('click', onRetry);
    }
  }

  /**
   * Show a toast notification
   */
  function showToast(message, type = 'info', icon = 'ℹ️') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️',
    };

    toast.innerHTML = `
      <span class="toast-icon">${icon || icons[type]}</span>
      <span class="toast-message">${escapeHtml(message)}</span>
      <button class="toast-close" aria-label="Dismiss">✕</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => dismissToast(toast));

    while (container.children.length >= 5) {
      container.firstElementChild.remove();
    }

    container.appendChild(toast);

    const timer = setTimeout(() => dismissToast(toast), 4000);
    toast.dataset.timer = String(timer);
  }

  function dismissToast(toast) {
    if (!toast || toast.dataset.dismissed === '1') return;
    toast.dataset.dismissed = '1';
    if (toast.dataset.timer) clearTimeout(Number(toast.dataset.timer));
    toast.style.animation = 'slideOutRight 0.3s ease-out forwards';
    setTimeout(() => toast.remove(), 300);
  }

  /**
   * Update processing step state
   */
  function updateProcessingStep(stepId, state) {
    const step = document.getElementById(`step-${stepId}`);
    if (!step) return;

    step.className = `processing-step ${state}`;
    const icon = step.querySelector('.step-icon');

    if (state === 'active') {
      icon.className = 'step-icon';
      icon.innerHTML = '⏳';
    } else if (state === 'done') {
      icon.className = 'step-icon';
      icon.innerHTML = '✅';
    } else if (state === 'error') {
      icon.className = 'step-icon';
      icon.innerHTML = '❌';
    }
  }

  /**
   * Show/hide sections
   */
  function showSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.add('active');
      section.style.display = '';
    }
  }

  function hideSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.remove('active');
    }
  }

  // --- Helpers ---

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function sanitizeUrl(url) {
    if (!url || url === '#') return '';
    try {
      const parsed = new URL(url, window.location.origin);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.href;
      }
    } catch {
      return '';
    }
    return '';
  }

  function getInitials(name) {
    return String(name || '')
      .split(/[\s&]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('') || '?';
  }

  function getTimeAgo(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
    const now = new Date();
    const diff = now - date;
    if (diff < 0) return 'just now';
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    const weeks = Math.floor(days / 7);

    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    if (weeks < 4) return `${weeks}w ago`;
    return date.toLocaleDateString();
  }

  function getTypeClass(type) {
    switch (type) {
      case 'Full-time': return 'fulltime';
      case 'Part-time': return 'parttime';
      case 'Contract': return 'contract';
      default: return 'fulltime';
    }
  }

  return {
    renderJobCards,
    renderSkeletons,
    renderPagination,
    renderSkillTags,
    renderErrorState,
    showToast,
    updateProcessingStep,
    showSection,
    hideSection,
    escapeHtml,
  };
})();


/**
 * BookmarkManager
 * Manages saved/bookmarked jobs using localStorage
 */
const BookmarkManager = (() => {
  const STORAGE_KEY = 'joblens_bookmarks';

  function getAll() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }

  function save(bookmarks) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    } catch {
      console.warn('Could not save bookmarks to localStorage');
    }
  }

  function isBookmarked(jobId) {
    const bookmarks = getAll();
    return !!bookmarks[jobId];
  }

  function toggle(job) {
    const bookmarks = getAll();
    if (bookmarks[job.id]) {
      delete bookmarks[job.id];
      save(bookmarks);
      return false; // removed
    } else {
      bookmarks[job.id] = { ...job, bookmarkedAt: new Date().toISOString() };
      save(bookmarks);
      return true; // added
    }
  }

  function getCount() {
    return Object.keys(getAll()).length;
  }

  function getAllJobs() {
    const bookmarks = getAll();
    return Object.values(bookmarks).sort(
      (a, b) => new Date(b.bookmarkedAt) - new Date(a.bookmarkedAt)
    );
  }

  function clear() {
    save({});
  }

  return { getAll, isBookmarked, toggle, getCount, getAllJobs, clear };
})();
