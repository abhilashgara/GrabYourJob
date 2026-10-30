/**
 * resumeParser.js
 * Client-side resume parsing using PDF.js and Mammoth.js.
 * Extracts text, identifies skills, job titles, and detects country.
 */

const ResumeParser = (() => {
  // Configure PDF.js worker
  if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  /**
   * Parse a resume file (PDF or DOCX) and extract structured data
   * @param {File} file - The uploaded file
   * @param {Function} onStep - Callback for processing step updates
   * @returns {Promise<Object>} Parsed resume data
   */
  async function parseResume(file, onStep = () => {}) {
    const fileName = file.name.toLowerCase();
    let rawText = '';

    // Step 1: Extract text
    onStep('extract', 'active');
    try {
      if (fileName.endsWith('.pdf')) {
        rawText = await extractTextFromPDF(file);
      } else if (fileName.endsWith('.docx')) {
        rawText = await extractTextFromDOCX(file);
      } else {
        throw new Error('Unsupported file format. Please upload a PDF or DOCX file.');
      }
    } catch (err) {
      onStep('extract', 'error');
      throw err;
    }
    onStep('extract', 'done');

    if (!rawText || rawText.trim().length < 20) {
      throw new Error('Could not extract meaningful text from the document. Please try a different file.');
    }

    // Step 2: Extract skills & keywords
    onStep('skills', 'active');
    await delay(400); // Brief delay for UX
    const skills = extractSkills(rawText);
    const titles = extractJobTitles(rawText);
    const softSkills = extractSoftSkills(rawText);
    onStep('skills', 'done');

    // Step 3: Detect country
    onStep('country', 'active');
    await delay(300);
    const detectedCountry = detectCountry(rawText);
    onStep('country', 'done');

    // Build search queries from extracted data
    const searchQueries = buildSearchQueries(skills, titles);

    return {
      rawText: rawText.substring(0, 2000), // Truncate for display
      technicalSkills: skills,
      softSkills: softSkills,
      jobTitles: titles,
      detectedCountry,
      searchQueries,
      fileName: file.name,
    };
  }

  /**
   * Extract text from a PDF file using PDF.js
   */
  async function extractTextFromPDF(file) {
    if (typeof pdfjsLib === 'undefined') {
      throw new Error('PDF parser failed to load. Check your connection and try again.');
    }
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const textParts = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map(item => item.str)
        .join(' ');
      textParts.push(pageText);
    }

    return textParts.join('\n');
  }

  /**
   * Extract text from a DOCX file using Mammoth.js
   */
  async function extractTextFromDOCX(file) {
    if (typeof mammoth === 'undefined') {
      throw new Error('DOCX parser failed to load. Check your connection and try again.');
    }
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  /**
   * Extract technical skills from resume text
   */
  function extractSkills(text) {
    const textLower = text.toLowerCase();
    const found = new Set();

    // Sort by length (longest first) to match multi-word skills first
    const sortedSkills = [...SkillsDatabase.technicalSkills].sort((a, b) => b.length - a.length);

    for (const skill of sortedSkills) {
      // Create a word-boundary aware regex
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|[\\s,;(|/])${escaped}(?:$|[\\s,;)|/\\.])`, 'i');
      if (regex.test(textLower)) {
        // Normalize similar skills
        const normalized = normalizeSkill(skill);
        found.add(normalized);
      }
    }

    return [...found].slice(0, 25); // Top 25 skills
  }

  /**
   * Extract soft skills from resume text
   */
  function extractSoftSkills(text) {
    const textLower = text.toLowerCase();
    const found = new Set();

    for (const skill of SkillsDatabase.softSkills) {
      const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|[\\s,;(])${escaped}(?:$|[\\s,;)])`, 'i');
      if (regex.test(textLower)) {
        found.add(capitalizeWords(skill));
      }
    }

    return [...found].slice(0, 10); // Top 10
  }

  /**
   * Extract job titles from resume text
   */
  function extractJobTitles(text) {
    const textLower = text.toLowerCase();
    const found = new Set();

    // Sort by length (longest first)
    const sortedTitles = [...SkillsDatabase.jobTitles].sort((a, b) => b.length - a.length);

    for (const title of sortedTitles) {
      const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(?:^|[\\s,;(|/])${escaped}(?:$|[\\s,;)|/\\.])`, 'i');
      if (regex.test(textLower)) {
        found.add(capitalizeWords(title));
      }
    }

    return [...found].slice(0, 5); // Top 5
  }

  /**
   * Detect country from resume content
   */
  function detectCountry(text) {
    const scores = {};

    for (const [code, data] of Object.entries(SkillsDatabase.countryIndicators)) {
      let score = 0;

      // Check phone codes
      for (const phoneCode of data.codes) {
        if (text.includes(phoneCode)) {
          score += 3;
        }
      }

      // Check patterns
      for (const pattern of data.patterns) {
        if (pattern.test(text)) {
          score += 5;
        }
      }

      if (score > 0) {
        scores[code] = score;
      }
    }

    // Return highest scoring country
    const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
    if (sorted.length > 0 && sorted[0][1] >= 3) {
      return sorted[0][0];
    }

    return null; // Could not detect
  }

  /**
   * Build search queries from extracted data
   */
  function buildSearchQueries(skills, titles) {
    const queries = [];

    // Use job titles as primary queries
    if (titles.length > 0) {
      queries.push(...titles.slice(0, 3));
    }

    // Combine top skills as fallback query
    if (skills.length > 0) {
      const topSkills = skills.slice(0, 5).join(' ');
      queries.push(topSkills);
    }

    // If no titles, use skills as queries
    if (queries.length === 0 && skills.length > 0) {
      queries.push(skills.slice(0, 3).join(' '));
    }

    return queries.length > 0 ? queries : ['developer']; // Fallback
  }

  /**
   * Normalize skill names (deduplicate variations)
   */
  function normalizeSkill(skill) {
    const normalizations = {
      'reactjs': 'React',
      'react.js': 'React',
      'react': 'React',
      'vuejs': 'Vue.js',
      'vue': 'Vue.js',
      'vue.js': 'Vue.js',
      'angularjs': 'Angular',
      'angular': 'Angular',
      'nodejs': 'Node.js',
      'node.js': 'Node.js',
      'nextjs': 'Next.js',
      'next.js': 'Next.js',
      'nestjs': 'NestJS',
      'nest.js': 'NestJS',
      'express.js': 'Express',
      'express': 'Express',
      'fastapi': 'FastAPI',
      'spring boot': 'Spring Boot',
      'springboot': 'Spring Boot',
      'ruby on rails': 'Ruby on Rails',
      'rails': 'Ruby on Rails',
      'tailwindcss': 'Tailwind CSS',
      'tailwind': 'Tailwind CSS',
      'typescript': 'TypeScript',
      'javascript': 'JavaScript',
      'python': 'Python',
      'golang': 'Go',
      'go': 'Go',
      'java': 'Java',
      'c#': 'C#',
      'c++': 'C++',
      'php': 'PHP',
      'ruby': 'Ruby',
      'swift': 'Swift',
      'kotlin': 'Kotlin',
      'rust': 'Rust',
      'dart': 'Dart',
      'scala': 'Scala',
      'postgresql': 'PostgreSQL',
      'postgres': 'PostgreSQL',
      'mongodb': 'MongoDB',
      'mysql': 'MySQL',
      'redis': 'Redis',
      'elasticsearch': 'Elasticsearch',
      'dynamodb': 'DynamoDB',
      'aws': 'AWS',
      'amazon web services': 'AWS',
      'gcp': 'GCP',
      'google cloud': 'GCP',
      'google cloud platform': 'GCP',
      'azure': 'Azure',
      'docker': 'Docker',
      'kubernetes': 'Kubernetes',
      'k8s': 'Kubernetes',
      'terraform': 'Terraform',
      'ci/cd': 'CI/CD',
      'github actions': 'GitHub Actions',
      'gitlab ci': 'GitLab CI',
      'machine learning': 'Machine Learning',
      'deep learning': 'Deep Learning',
      'artificial intelligence': 'AI',
      'ai': 'AI',
      'ml': 'ML',
      'nlp': 'NLP',
      'natural language processing': 'NLP',
      'tensorflow': 'TensorFlow',
      'pytorch': 'PyTorch',
      'react native': 'React Native',
      'flutter': 'Flutter',
      'figma': 'Figma',
      'git': 'Git',
      'github': 'GitHub',
      'gitlab': 'GitLab',
      'jira': 'Jira',
      'linux': 'Linux',
      'graphql': 'GraphQL',
      'rest': 'REST',
      'restful': 'REST',
      'agile': 'Agile',
      'scrum': 'Scrum',
      'devops': 'DevOps',
      'sre': 'SRE',
      'microservices': 'Microservices',
      'serverless': 'Serverless',
      'sql': 'SQL',
      'html5': 'HTML5',
      'css3': 'CSS3',
      'sass': 'Sass',
      'scss': 'Sass',
      'webpack': 'Webpack',
      'vite': 'Vite',
      'jest': 'Jest',
      'cypress': 'Cypress',
      'selenium': 'Selenium',
      'playwright': 'Playwright',
      'storybook': 'Storybook',
      'prisma': 'Prisma',
      'supabase': 'Supabase',
      'firebase': 'Firebase',
      'snowflake': 'Snowflake',
      'databricks': 'Databricks',
      'spark': 'Apache Spark',
      'apache spark': 'Apache Spark',
      'kafka': 'Kafka',
      'airflow': 'Airflow',
      'tableau': 'Tableau',
      'power bi': 'Power BI',
      'salesforce': 'Salesforce',
      'sap': 'SAP',
    };

    const key = skill.toLowerCase();
    return normalizations[key] || capitalizeWords(skill);
  }

  /**
   * Capitalize each word in a string
   */
  function capitalizeWords(str) {
    return str.replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Promise-based delay
   */
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  return { parseResume };
})();
