/**
 * Netlify Serverless Function: search-jsearch
 * Proxies requests to JSearch API (RapidAPI) to keep API keys secure.
 *
 * When deployed on Netlify, set JSEARCH_API_KEY as an environment variable.
 * The frontend calls this function at /api/search-jsearch
 */

const fetch = require('node-fetch');

function corsHeaders(event) {
  const origin = event.headers.origin || event.headers.Origin || '';
  const allowed = [
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    'http://localhost:8888',
    'http://127.0.0.1:8888',
    'http://localhost:3000',
  ]
    .filter(Boolean)
    .map((u) => u.replace(/\/$/, ''));

  const originNorm = origin.replace(/\/$/, '');
  const allowOrigin = allowed.includes(originNorm) ? origin : (allowed[0] || 'http://localhost:8888');

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-rapidapi-key',
    'Content-Type': 'application/json',
    Vary: 'Origin',
  };
}

function clampInt(value, min, max, fallback) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

exports.handler = async function (event) {
  const headers = corsHeaders(event);

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const reqHeaders = event.headers || {};
  const apiKey =
    process.env.JSEARCH_API_KEY ||
    reqHeaders['x-rapidapi-key'] ||
    reqHeaders['X-RapidAPI-Key'];

  if (!apiKey) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'JSEARCH_API_KEY is required' }),
    };
  }

  try {
    const params = event.queryStringParameters || {};
    const query = (params.query || '').trim();
    if (!query) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'query is required' }),
      };
    }

    const page = String(clampInt(params.page, 1, 20, 1));
    const numPages = String(clampInt(params.num_pages, 1, 3, 1));
    const datePosted = params.date_posted || 'month';

    const searchParams = new URLSearchParams({
      query,
      page,
      num_pages: numPages,
      date_posted: datePosted,
    });

    const response = await fetch(
      `https://jsearch.p.rapidapi.com/search?${searchParams}`,
      {
        method: 'GET',
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'jsearch.p.rapidapi.com',
        },
      }
    );

    if (response.status === 401 || response.status === 403) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: 'Invalid API key or unauthorized' }),
      };
    }
    if (response.status === 429) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: 'Rate limit exceeded' }),
      };
    }

    const data = await parseJsonSafe(response);
    if (data === null) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON from JSearch API' }),
      };
    }

    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('JSearch proxy error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch from JSearch API' }),
    };
  }
};
