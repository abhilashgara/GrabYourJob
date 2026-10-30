# JobLens — AI-Powered Resume Job Finder

JobLens is a modern, privacy-first web application that helps you find your dream job by simply uploading your resume. It parses your resume locally in the browser to extract your technical skills, soft skills, and job titles, then automatically searches multiple job boards across the globe to find the best matches.

## Features

- 🔒 **Privacy-First Parsing**: Your resume never leaves your browser. Parsing is done entirely client-side using PDF.js and Mammoth.js.
- 🧠 **Smart Skill Extraction**: Intelligently identifies technical skills, soft skills, and previous job titles from your resume.
- 🌍 **Automatic Country Detection**: Automatically detects your target country based on your resume content.
- 🌐 **Global Multi-Source Search**: Aggregates job postings from major boards (LinkedIn, Indeed, Glassdoor, etc.) via JSearch and Arbeitnow APIs.
- 🎨 **Premium UI/UX**: Beautiful glassmorphism design with a dark theme, smooth micro-animations, and a fully responsive layout.
- ⭐ **Bookmarks**: Save your favorite job postings to your browser's local storage.

## Setup and Deployment

This application is built as a static site (HTML, CSS, JS) with serverless functions for secure API proxying. It is designed to be hosted for free on **Netlify**.

### Local Development

1.  **Clone or download** this repository.
2.  **Install dependencies** (used for local server and Netlify CLI if desired):
    ```bash
    npm install
    ```
3.  **Run the local development server**:
    ```bash
    npm run netlify:dev
    ```
    This starts the static site **and** `/api/*` serverless proxies (typically `http://localhost:8888`). Job search requires these proxies.

    `npm run dev` only serves static files on port 3000 and **cannot** call `/api/search-*`. Use it for UI-only work.

    Optional: copy `.env.example` to `.env` and fill in API keys for local Netlify functions.

### Setting up the JSearch API Key (Important!)

To fetch jobs from major job boards (LinkedIn, Indeed, Glassdoor), you need a free API key from RapidAPI for the JSearch API.

1.  Go to the [JSearch API page on RapidAPI](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch).
2.  Sign up or log in to RapidAPI (no credit card required).
3.  Subscribe to the **Basic (Free)** plan, which gives you 200 requests per month.
4.  Copy your `X-RapidAPI-Key`.

**In the application:**
When you open the web app, click the **"⚙️ Settings"** button in the header and paste your API key. It will be saved securely in your browser's local storage.

### Deployment on Netlify (Free)

1.  Push this project folder to a GitHub repository.
2.  Log in to [Netlify](https://www.netlify.com/) and click **"Add new site"** -> **"Import an existing project"**.
3.  Connect your GitHub account and select the repository.
4.  Netlify will automatically detect the settings from `netlify.toml`.
5.  **Environment Variables**: In your Netlify site settings (Site settings > Environment variables), add:
    - `JSEARCH_API_KEY` — RapidAPI key for JSearch (LinkedIn, Indeed, Glassdoor)
    - `ADZUNA_APP_ID` — optional Adzuna app id
    - `ADZUNA_APP_KEY` — optional Adzuna app key

    With these set, visitors can search without pasting keys in Settings. Users can still provide their own keys in Settings; those are sent as request headers (not query strings) and stored only in their browser.
6.  Deploy the site!

## Architecture

- **Frontend**: Vanilla HTML5, CSS3 (with CSS Variables for theming), and ES6+ JavaScript.
- **Resume Parsers**: [PDF.js](https://mozilla.github.io/pdf.js/) (for PDFs) and [Mammoth.js](https://github.com/mwilliamson/mammoth.js/) (for DOCX).
- **Backend / API Proxy**: Netlify Serverless Functions (Node.js) to securely route requests to external APIs without exposing keys in the frontend.
- **Job APIs**: [JSearch on RapidAPI](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch), [Adzuna](https://developer.adzuna.com/), and [Arbeitnow Free API](https://www.arbeitnow.com/).
