/**
 * skillsDatabase.js
 * Comprehensive database of technical skills, soft skills, job titles,
 * and country indicators for resume parsing.
 */

const SkillsDatabase = (() => {
  // ---- TECHNICAL SKILLS ----
  const technicalSkills = [
    // Programming Languages
    'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'c', 'ruby', 'php', 'swift',
    'kotlin', 'go', 'golang', 'rust', 'scala', 'perl', 'r', 'matlab', 'dart', 'lua',
    'haskell', 'elixir', 'clojure', 'objective-c', 'groovy', 'fortran', 'cobol',
    'assembly', 'vba', 'visual basic', 'f#', 'erlang', 'julia', 'solidity',

    // Frontend Frameworks & Libraries
    'react', 'reactjs', 'react.js', 'angular', 'angularjs', 'vue', 'vuejs', 'vue.js',
    'svelte', 'next.js', 'nextjs', 'nuxt', 'nuxt.js', 'gatsby', 'remix', 'astro',
    'ember', 'backbone', 'jquery', 'bootstrap', 'tailwind', 'tailwindcss',
    'material ui', 'mui', 'chakra ui', 'ant design', 'styled-components',
    'sass', 'scss', 'less', 'css3', 'html5', 'webpack', 'vite', 'rollup',
    'parcel', 'babel', 'eslint', 'prettier', 'storybook',

    // Backend Frameworks
    'node.js', 'nodejs', 'express', 'express.js', 'fastify', 'nest.js', 'nestjs',
    'django', 'flask', 'fastapi', 'spring', 'spring boot', 'springboot',
    'rails', 'ruby on rails', 'laravel', 'symfony', 'asp.net', '.net', 'dotnet',
    '.net core', 'gin', 'fiber', 'echo', 'actix', 'rocket',

    // Databases
    'sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'elasticsearch',
    'dynamodb', 'cassandra', 'oracle', 'sqlite', 'mariadb', 'couchdb',
    'neo4j', 'firebase', 'firestore', 'supabase', 'prisma', 'sequelize',
    'typeorm', 'mongoose', 'knex', 'sql server', 'mssql',

    // Cloud & DevOps
    'aws', 'amazon web services', 'azure', 'gcp', 'google cloud', 'google cloud platform',
    'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins', 'circleci',
    'github actions', 'gitlab ci', 'travis ci', 'cloudformation', 'pulumi',
    'helm', 'istio', 'nginx', 'apache', 'caddy', 'vercel', 'netlify',
    'heroku', 'digitalocean', 'linode', 'cloudflare',

    // Data & AI/ML
    'machine learning', 'deep learning', 'artificial intelligence', 'ai', 'ml',
    'natural language processing', 'nlp', 'computer vision', 'neural networks',
    'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy',
    'scipy', 'matplotlib', 'seaborn', 'jupyter', 'hadoop', 'spark', 'apache spark',
    'kafka', 'airflow', 'dbt', 'snowflake', 'databricks', 'bigquery',
    'tableau', 'power bi', 'looker', 'data engineering', 'data science',
    'data analysis', 'data visualization', 'etl', 'data warehousing',
    'openai', 'langchain', 'llm', 'large language models', 'generative ai',
    'chatgpt', 'gpt', 'bert', 'transformer',

    // Mobile Development
    'react native', 'flutter', 'ionic', 'xamarin', 'android', 'ios',
    'swiftui', 'uikit', 'jetpack compose', 'android studio', 'xcode',
    'expo', 'capacitor', 'cordova',

    // Tools & Version Control
    'git', 'github', 'gitlab', 'bitbucket', 'svn', 'mercurial',
    'jira', 'confluence', 'trello', 'asana', 'monday.com', 'notion',
    'slack', 'figma', 'sketch', 'adobe xd', 'invision', 'zeplin',

    // Testing
    'jest', 'mocha', 'chai', 'cypress', 'selenium', 'playwright',
    'puppeteer', 'jasmine', 'karma', 'enzyme', 'testing library',
    'react testing library', 'pytest', 'unittest', 'junit', 'testng',
    'rspec', 'minitest', 'postman', 'insomnia', 'k6', 'locust',
    'gatling', 'load testing', 'performance testing', 'tdd', 'bdd',

    // Security
    'cybersecurity', 'penetration testing', 'owasp', 'ssl', 'tls',
    'oauth', 'jwt', 'saml', 'ldap', 'active directory', 'iam',
    'sso', 'encryption', 'cryptography', 'firewall', 'vpn',
    'siem', 'soc', 'incident response', 'vulnerability assessment',

    // APIs & Protocols
    'rest', 'restful', 'graphql', 'grpc', 'websocket', 'soap',
    'json', 'xml', 'yaml', 'protobuf', 'api design', 'swagger',
    'openapi', 'api gateway',

    // Other Technologies
    'linux', 'unix', 'bash', 'shell scripting', 'powershell',
    'microservices', 'serverless', 'lambda', 'blockchain', 'web3',
    'iot', 'embedded systems', 'raspberry pi', 'arduino',
    'ci/cd', 'agile', 'scrum', 'kanban', 'devops', 'sre',
    'site reliability', 'monitoring', 'logging', 'observability',
    'grafana', 'prometheus', 'datadog', 'new relic', 'splunk',
    'rabbitmq', 'celery', 'cron', 'systemd',

    // Design & UX
    'ui/ux', 'ux design', 'ui design', 'user experience', 'user interface',
    'wireframing', 'prototyping', 'user research', 'usability testing',
    'interaction design', 'information architecture', 'design thinking',
    'responsive design', 'accessibility', 'wcag', 'a11y',

    // Business & Analytics
    'seo', 'sem', 'google analytics', 'google ads', 'facebook ads',
    'social media marketing', 'content marketing', 'email marketing',
    'crm', 'salesforce', 'hubspot', 'marketo', 'mailchimp',
    'a/b testing', 'conversion optimization', 'growth hacking',

    // ERP & Enterprise
    'sap', 'oracle erp', 'workday', 'servicenow', 'dynamics 365',
    'sharepoint', 'power automate', 'power apps',
  ];

  // ---- SOFT SKILLS ----
  const softSkills = [
    'leadership', 'communication', 'teamwork', 'problem solving', 'problem-solving',
    'critical thinking', 'analytical', 'time management', 'project management',
    'strategic planning', 'decision making', 'decision-making', 'collaboration',
    'adaptability', 'flexibility', 'creativity', 'innovation', 'mentoring',
    'coaching', 'negotiation', 'presentation', 'public speaking', 'conflict resolution',
    'emotional intelligence', 'interpersonal', 'organizational', 'multitasking',
    'attention to detail', 'self-motivated', 'results-oriented', 'customer service',
    'stakeholder management', 'cross-functional', 'team building', 'delegation',
    'prioritization', 'work ethic', 'initiative', 'proactive',
  ];

  // ---- JOB TITLES ----
  const jobTitles = [
    // Engineering
    'software engineer', 'software developer', 'web developer', 'frontend developer',
    'front-end developer', 'frontend engineer', 'front-end engineer',
    'backend developer', 'back-end developer', 'backend engineer', 'back-end engineer',
    'full stack developer', 'fullstack developer', 'full-stack developer',
    'full stack engineer', 'fullstack engineer', 'full-stack engineer',
    'mobile developer', 'mobile engineer', 'ios developer', 'android developer',
    'devops engineer', 'site reliability engineer', 'sre', 'cloud engineer',
    'platform engineer', 'infrastructure engineer', 'systems engineer',
    'qa engineer', 'quality assurance', 'test engineer', 'sdet',
    'security engineer', 'application security', 'devsecops',
    'data engineer', 'data scientist', 'data analyst', 'machine learning engineer',
    'ml engineer', 'ai engineer', 'research scientist', 'research engineer',
    'embedded engineer', 'firmware engineer', 'hardware engineer',
    'solutions architect', 'cloud architect', 'enterprise architect',
    'technical architect', 'system architect', 'software architect',

    // Management
    'engineering manager', 'technical lead', 'tech lead', 'team lead',
    'vp of engineering', 'cto', 'chief technology officer', 'director of engineering',
    'head of engineering', 'principal engineer', 'staff engineer', 'senior engineer',
    'project manager', 'program manager', 'product manager', 'product owner',
    'scrum master', 'agile coach', 'delivery manager',

    // Design
    'ux designer', 'ui designer', 'product designer', 'graphic designer',
    'visual designer', 'interaction designer', 'ux researcher', 'design lead',

    // Data
    'database administrator', 'dba', 'data architect', 'bi analyst',
    'business intelligence', 'analytics engineer', 'etl developer',

    // IT & Support
    'system administrator', 'sysadmin', 'network engineer', 'network administrator',
    'it support', 'help desk', 'technical support', 'it manager',
    'it director', 'information security', 'security analyst',

    // Business & Management
    'business analyst', 'consultant', 'management consultant',
    'financial analyst', 'accountant', 'marketing manager', 'sales manager',
    'operations manager', 'hr manager', 'recruiter', 'talent acquisition',
    'content writer', 'copywriter', 'technical writer',
  ];

  // ---- COUNTRY INDICATORS ----
  const countryIndicators = {
    us: {
      codes: ['+1', '001'],
      patterns: [
        /\b(united states|usa|u\.s\.a|u\.s\b)/i,
        /\b(new york|california|texas|florida|illinois|washington|boston|seattle|san francisco|los angeles|chicago|austin|denver|atlanta|portland|miami|dallas|houston|phoenix|philadelphia|san diego|san jose|charlotte|nashville|raleigh)\b/i,
        /\b(ny|ca|tx|fl|il|wa|ma|co|ga|or|nc|tn|pa|az|oh|mi|mn|va|nj|md)\b/,
        /\b\d{5}(-\d{4})?\b/,
      ],
      name: 'United States',
    },
    gb: {
      codes: ['+44', '0044'],
      patterns: [
        /\b(united kingdom|uk|u\.k\.|britain|england|scotland|wales)\b/i,
        /\b(london|manchester|birmingham|leeds|glasgow|edinburgh|bristol|liverpool|cambridge|oxford|nottingham|sheffield|brighton|cardiff|belfast|reading|newcastle)\b/i,
        /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/,
      ],
      name: 'United Kingdom',
    },
    ca: {
      codes: ['+1'],
      patterns: [
        /\b(canada|canadian)\b/i,
        /\b(toronto|vancouver|montreal|ottawa|calgary|edmonton|winnipeg|quebec|halifax|victoria|kitchener|waterloo)\b/i,
        /\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b/,
      ],
      name: 'Canada',
    },
    au: {
      codes: ['+61', '0061'],
      patterns: [
        /\b(australia|australian)\b/i,
        /\b(sydney|melbourne|brisbane|perth|adelaide|canberra|gold coast|hobart|darwin|newcastle)\b/i,
      ],
      name: 'Australia',
    },
    in: {
      codes: ['+91', '0091'],
      patterns: [
        /\b(india|indian)\b/i,
        /\b(mumbai|bangalore|bengaluru|delhi|hyderabad|chennai|kolkata|pune|ahmedabad|jaipur|lucknow|noida|gurgaon|gurugram|kochi|chandigarh|indore|nagpur|coimbatore|thiruvananthapuram)\b/i,
        /\b\d{6}\b/,
      ],
      name: 'India',
    },
    de: {
      codes: ['+49', '0049'],
      patterns: [
        /\b(germany|german|deutschland)\b/i,
        /\b(berlin|munich|münchen|hamburg|frankfurt|cologne|köln|düsseldorf|stuttgart|dortmund|essen|leipzig|bremen|dresden|hannover|nuremberg|nürnberg)\b/i,
      ],
      name: 'Germany',
    },
    fr: {
      codes: ['+33', '0033'],
      patterns: [
        /\b(france|french|français)\b/i,
        /\b(paris|marseille|lyon|toulouse|nice|nantes|strasbourg|montpellier|bordeaux|lille|rennes)\b/i,
      ],
      name: 'France',
    },
    nl: {
      codes: ['+31', '0031'],
      patterns: [
        /\b(netherlands|dutch|holland)\b/i,
        /\b(amsterdam|rotterdam|the hague|utrecht|eindhoven|groningen|tilburg|breda|leiden|delft)\b/i,
      ],
      name: 'Netherlands',
    },
    sg: {
      codes: ['+65', '0065'],
      patterns: [
        /\b(singapore|singaporean)\b/i,
      ],
      name: 'Singapore',
    },
    nz: {
      codes: ['+64', '0064'],
      patterns: [
        /\b(new zealand|nz)\b/i,
        /\b(auckland|wellington|christchurch|hamilton|dunedin|tauranga)\b/i,
      ],
      name: 'New Zealand',
    },
    za: {
      codes: ['+27', '0027'],
      patterns: [
        /\b(south africa)\b/i,
        /\b(cape town|johannesburg|durban|pretoria|port elizabeth|bloemfontein)\b/i,
      ],
      name: 'South Africa',
    },
    br: {
      codes: ['+55', '0055'],
      patterns: [
        /\b(brazil|brasil)\b/i,
        /\b(são paulo|rio de janeiro|brasília|salvador|fortaleza|belo horizonte|curitiba|recife|campinas)\b/i,
      ],
      name: 'Brazil',
    },
    pl: {
      codes: ['+48', '0048'],
      patterns: [
        /\b(poland|polish|polska)\b/i,
        /\b(warsaw|warszawa|kraków|krakow|wrocław|gdańsk|poznań|łódź|katowice)\b/i,
      ],
      name: 'Poland',
    },
    at: {
      codes: ['+43', '0043'],
      patterns: [
        /\b(austria|austrian|österreich)\b/i,
        /\b(vienna|wien|graz|linz|salzburg|innsbruck)\b/i,
      ],
      name: 'Austria',
    },
    ie: {
      codes: ['+353', '00353'],
      patterns: [
        /\b(ireland|irish)\b/i,
        /\b(dublin|cork|galway|limerick|waterford)\b/i,
      ],
      name: 'Ireland',
    },
  };

  // Country code to full country name for JSearch
  const countryToFullName = {
    us: 'United States',
    gb: 'United Kingdom',
    ca: 'Canada',
    au: 'Australia',
    in: 'India',
    de: 'Germany',
    fr: 'France',
    nl: 'Netherlands',
    sg: 'Singapore',
    nz: 'New Zealand',
    za: 'South Africa',
    br: 'Brazil',
    pl: 'Poland',
    at: 'Austria',
    ie: 'Ireland',
  };

  return {
    technicalSkills,
    softSkills,
    jobTitles,
    countryIndicators,
    countryToFullName,
  };
})();
