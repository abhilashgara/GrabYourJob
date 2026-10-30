/**
 * jobSearch.js
 * Handles job search across JSearch, Adzuna, and Arbeitnow via Netlify proxies.
 * Merges, deduplicates, and normalizes results.
 */

const JobSearch = (() => {
  const JOBS_PER_PAGE = 10;

  /**
   * Search for jobs using all available sources
   * @param {Object} params - Search parameters
   * @returns {Promise<Object>} Merged job results (full unique list; caller paginates)
   */
  async function searchJobs(params) {
    const { queries, country, city, apiKey, adzunaId, adzunaKey, filter = 'all', sort = 'relevance' } = params;
    const allJobs = [];
    const errors = [];
    const sources = [];

    const primaryQuery = queries[0] || 'developer';
    const countryName = SkillsDatabase.countryToFullName[country] || country;
    const locationStr = city ? `${city}, ${countryName}` : countryName;

    const jsearchPromise = searchJSearch(primaryQuery, locationStr, apiKey)
      .then((jobs) => {
        if (jobs.length > 0) sources.push('JSearch (LinkedIn, Indeed, Glassdoor)');
        return jobs;
      })
      .catch((err) => {
        console.warn('JSearch error:', err.message);
        errors.push(`JSearch: ${err.message}`);
        return [];
      });

    const adzunaPromise = searchAdzuna(primaryQuery, country, city, adzunaId, adzunaKey)
      .then((jobs) => {
        if (jobs.length > 0) sources.push('Adzuna');
        return jobs;
      })
      .catch((err) => {
        console.warn('Adzuna error:', err);
        errors.push('Adzuna API failed');
        return [];
      });

    const arbeitnowPromise = searchArbeitnow(primaryQuery, city)
      .then((jobs) => {
        if (jobs.length > 0) sources.push('Arbeitnow');
        return jobs;
      })
      .catch((err) => {
        console.warn('Arbeitnow error:', err.message);
        errors.push(`Arbeitnow: ${err.message}`);
        return [];
      });

    const [jsearchJobs, adzunaJobs, arbeitnowJobs] = await Promise.all([
      jsearchPromise,
      adzunaPromise,
      arbeitnowPromise,
    ]);

    allJobs.push(...jsearchJobs, ...adzunaJobs, ...arbeitnowJobs);

    const uniqueJobs = deduplicateJobs(allJobs);
    let filteredJobs = applyFilter(uniqueJobs, filter);
    filteredJobs = sortJobs(filteredJobs, sort);

    return {
      jobs: filteredJobs,
      allJobs: uniqueJobs,
      totalJobs: filteredJobs.length,
      sources,
      errors,
      query: primaryQuery,
    };
  }

  function generateExternalLinks(query, country, city) {
    const queryEncoded = encodeURIComponent(query);
    const locationStr = city ? `${city} ${SkillsDatabase.countryToFullName[country] || country}` : (SkillsDatabase.countryToFullName[country] || country);
    const locationEncoded = encodeURIComponent(locationStr);

    const links = [];
    links.push({ name: 'LinkedIn', url: `https://www.linkedin.com/jobs/search/?keywords=${queryEncoded}&location=${locationEncoded}` });
    links.push({ name: 'Indeed', url: `https://www.indeed.com/jobs?q=${queryEncoded}&l=${locationEncoded}` });
    links.push({ name: 'Glassdoor', url: `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${queryEncoded}&locT=&locId=&locKeyword=${locationEncoded}` });

    if (country === 'au') {
      const cityHyphenated = city ? city.toLowerCase().replace(/\s+/g, '-') : 'australia';
      const queryHyphenated = query.toLowerCase().replace(/\s+/g, '-');

      links.push({ name: 'Seek', url: `https://www.seek.com.au/${queryHyphenated}-jobs/in-${cityHyphenated}` });
      links.push({ name: 'Jora', url: `https://au.jora.com/j?q=${queryEncoded}&l=${locationEncoded}` });
      links.push({ name: 'Workforce Australia', url: `https://www.workforceaustralia.gov.au/individuals/jobs/search?q=${queryEncoded}&loc=${locationEncoded}` });
      links.push({ name: 'APSJobs', url: `https://www.apsjobs.gov.au/s/job-search?keyword=${queryEncoded}` });
      links.push({ name: 'EthicalJobs', url: `https://www.ethicaljobs.com.au/jobs?title=${queryEncoded}` });
      links.push({ name: 'GradConnection', url: `https://au.gradconnection.com/jobs/?title=${queryEncoded}` });
      links.push({ name: 'ArtsHub', url: `https://www.artshub.com.au/jobs/search/?keyword=${queryEncoded}` });
      links.push({ name: 'Gumtree', url: `https://www.gumtree.com.au/s-jobs/${queryHyphenated}/k0c9302?locationStr=${locationEncoded}` });
    }

    return links;
  }

  async function parseResponseJson(response) {
    const text = await response.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`API returned non-JSON (status ${response.status})`);
    }
  }

  function isUnavailableSource(status, data) {
    if (status === 400 || status === 500) {
      const msg = (data && data.error) ? String(data.error).toLowerCase() : '';
      return msg.includes('not set') || msg.includes('required') || msg.includes('api key');
    }
    return false;
  }

  async function searchJSearch(query, locationStr, apiKey) {
    const params = new URLSearchParams({
      query: `${query} in ${locationStr}`,
      page: '1',
      num_pages: '1',
      date_posted: 'month',
    });

    const headers = { Accept: 'application/json' };
    if (apiKey) {
      headers['x-rapidapi-key'] = apiKey;
    }

    const response = await fetch(`/api/search-jsearch?${params}`, {
      method: 'GET',
      headers,
    });

    const data = await parseResponseJson(response);

    if (isUnavailableSource(response.status, data)) {
      return [];
    }

    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        throw new Error('Invalid API key. Please check your RapidAPI key in Settings.');
      }
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Free tier allows 200 requests/month.');
      }
      throw new Error(data.error || `API returned status ${response.status}`);
    }

    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }

    return data.data.map((job) => normalizeJSearchJob(job));
  }

  async function searchAdzuna(query, country, city, adzunaId, adzunaKey) {
    const params = new URLSearchParams({
      what: query,
      country: country || 'us',
      page: '1',
    });

    if (city) {
      params.append('where', city);
    }

    const headers = { Accept: 'application/json' };
    if (adzunaId) headers['x-adzuna-app-id'] = adzunaId;
    if (adzunaKey) headers['x-adzuna-app-key'] = adzunaKey;

    const response = await fetch(`/api/search-adzuna?${params.toString()}`, { headers });
    const data = await parseResponseJson(response);

    if (isUnavailableSource(response.status, data)) {
      return [];
    }

    if (!response.ok) {
      throw new Error(data.error || `Adzuna API Error: ${response.status}`);
    }

    if (!data.results) return [];
    return data.results.map((job) => normalizeAdzunaJob(job));
  }

  async function searchArbeitnow(query, city) {
    const params = new URLSearchParams({ page: '1' });

    const response = await fetch(`/api/search-arbeitnow?${params}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    const data = await parseResponseJson(response);

    if (!response.ok) {
      throw new Error(data.error || `Arbeitnow API returned status ${response.status}`);
    }

    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }

    const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = data.data.filter((job) => {
      const searchText = `${job.title} ${job.company_name} ${job.description || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
      const matchesQuery = queryTerms.some((term) => searchText.includes(term));
      const matchesCity = city ? (job.location && job.location.toLowerCase().includes(city.toLowerCase())) : true;
      return matchesQuery && matchesCity;
    });

    return filtered.map((job) => normalizeArbeitnowJob(job));
  }

  function looksRemote(...parts) {
    return parts.some((p) => p && /\bremote\b/i.test(String(p)));
  }

  function normalizeJSearchJob(job) {
    const salary = formatSalary(
      job.job_min_salary,
      job.job_max_salary,
      job.job_salary_currency,
      job.job_salary_period
    );

    return {
      id: `jsearch-${job.job_id}`,
      title: job.job_title || 'Untitled Position',
      company: job.employer_name || 'Unknown Company',
      companyLogo: job.employer_logo || null,
      location: `${job.job_city ? job.job_city + ', ' : ''}${job.job_state || job.job_country || ''}`.trim() || 'Not specified',
      description: stripHtml(job.job_description || 'No description provided.'),
      applyUrl: job.job_apply_link || job.job_google_link || '#',
      salary,
      type: normalizeJobType(job.job_employment_type),
      isRemote: !!(job.job_is_remote || looksRemote(job.job_title, job.job_city, job.job_description)),
      postedDate: job.job_posted_at_datetime_utc || null,
      source: 'JSearch',
      sourceDetail: 'LinkedIn / Indeed / Glassdoor',
      tags: [],
    };
  }

  function normalizeAdzunaJob(job) {
    const location = job.location?.display_name || 'Unknown Location';
    const title = job.title || 'Untitled Position';
    const description = stripHtml(job.description || 'No description provided.');
    const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency || 'USD', null);

    return {
      id: `adzuna-${job.id}`,
      title,
      company: job.company?.display_name || 'Unknown Company',
      companyLogo: null,
      location,
      description,
      applyUrl: job.redirect_url || '#',
      salary,
      type: normalizeJobType(job.contract_type || job.contract_time),
      isRemote: looksRemote(title, location, description),
      postedDate: job.created || null,
      source: 'Adzuna',
      sourceDetail: 'Adzuna',
      tags: [],
    };
  }

  function normalizeArbeitnowJob(job) {
    const createdAt = job.created_at;
    let postedDate = null;
    if (typeof createdAt === 'number') {
      const ms = createdAt < 1e12 ? createdAt * 1000 : createdAt;
      postedDate = new Date(ms).toISOString();
    } else if (createdAt) {
      const parsed = new Date(createdAt);
      if (!Number.isNaN(parsed.getTime())) postedDate = parsed.toISOString();
    }

    return {
      id: job.slug || generateId(),
      title: job.title || 'Untitled Position',
      company: job.company_name || 'Unknown Company',
      companyLogo: null,
      location: job.location || 'Not specified',
      description: stripHtml(job.description || ''),
      applyUrl: job.url || '#',
      salary: null,
      type: job.job_types ? normalizeJobType(job.job_types[0]) : 'Full-time',
      isRemote: job.remote || false,
      postedDate,
      source: 'Arbeitnow',
      sourceDetail: 'Arbeitnow',
      tags: job.tags || [],
    };
  }

  function deduplicateJobs(jobs) {
    const seen = new Map();
    const unique = [];

    for (const job of jobs) {
      const title = (job.title || '').toLowerCase().trim();
      const company = (job.company || '').toLowerCase().trim();
      if (!title && !company) continue;
      const key = `${title}__${company}`;
      if (!seen.has(key)) {
        seen.set(key, true);
        unique.push(job);
      }
    }

    return unique;
  }

  function applyFilter(jobs, filter) {
    if (filter === 'all') return jobs;
    if (filter === 'remote') return jobs.filter((j) => j.isRemote);
    if (filter === 'fulltime') return jobs.filter((j) => j.type === 'Full-time');
    if (filter === 'parttime') return jobs.filter((j) => j.type === 'Part-time');
    if (filter === 'contract') return jobs.filter((j) => j.type === 'Contract');
    return jobs;
  }

  function parseSalaryValue(salary) {
    if (!salary) return 0;
    const nums = String(salary).replace(/,/g, '').match(/\d+/g);
    if (!nums) return 0;
    return Number(nums[0]) || 0;
  }

  function sortJobs(jobs, sort) {
    if (sort === 'date') {
      return [...jobs].sort((a, b) => {
        const da = a.postedDate ? new Date(a.postedDate) : new Date(0);
        const db = b.postedDate ? new Date(b.postedDate) : new Date(0);
        const ta = Number.isNaN(da.getTime()) ? 0 : da.getTime();
        const tb = Number.isNaN(db.getTime()) ? 0 : db.getTime();
        return tb - ta;
      });
    }
    if (sort === 'salary') {
      return [...jobs].sort((a, b) => parseSalaryValue(b.salary) - parseSalaryValue(a.salary));
    }
    return jobs;
  }

  function formatSalary(min, max, currency, period) {
    if (!min && !max) return null;

    const cur = currency || 'USD';
    let formatter;
    try {
      formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: cur,
        maximumFractionDigits: 0,
      });
    } catch {
      formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      });
    }

    let salaryStr = '';
    if (min && max) {
      salaryStr = `${formatter.format(min)} - ${formatter.format(max)}`;
    } else if (min) {
      salaryStr = `From ${formatter.format(min)}`;
    } else {
      salaryStr = `Up to ${formatter.format(max)}`;
    }

    if (period) {
      salaryStr += ` / ${period.toLowerCase()}`;
    }

    return salaryStr;
  }

  function normalizeJobType(type) {
    if (!type) return 'Full-time';
    const t = type.toUpperCase().replace(/[_-]/g, ' ');
    if (t.includes('FULL')) return 'Full-time';
    if (t.includes('PART')) return 'Part-time';
    if (t.includes('CONTRACT') || t.includes('FREELANCE')) return 'Contract';
    if (t.includes('INTERN')) return 'Internship';
    if (t.includes('TEMP')) return 'Temporary';
    return 'Full-time';
  }

  function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  function generateId() {
    return 'job_' + Math.random().toString(36).substring(2, 11);
  }

  function paginateJobs(jobs, page = 1) {
    const totalJobs = jobs.length;
    const totalPages = Math.max(1, Math.ceil(totalJobs / JOBS_PER_PAGE));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const startIdx = (safePage - 1) * JOBS_PER_PAGE;
    return {
      jobs: jobs.slice(startIdx, startIdx + JOBS_PER_PAGE),
      totalJobs,
      totalPages,
      currentPage: safePage,
    };
  }

  return { searchJobs, generateExternalLinks, applyFilter, sortJobs, paginateJobs, JOBS_PER_PAGE };
})();
