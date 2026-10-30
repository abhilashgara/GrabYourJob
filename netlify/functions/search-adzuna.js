/**
 * Netlify Serverless Function: search-adzuna
 * Proxies requests to Adzuna API to keep API keys secure.
 *
 * When deployed on Netlify, set ADZUNA_APP_ID and ADZUNA_APP_KEY as environment variables.
 * The frontend calls this function at /api/search-adzuna
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
    'Access-Control-Allow-Headers': 'Content-Type, x-adzuna-app-id, x-adzuna-app-key',
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
  const appId =
    process.env.ADZUNA_APP_ID ||
    reqHeaders['x-adzuna-app-id'] ||
    reqHeaders['X-Adzuna-App-Id'];
  const appKey =
    process.env.ADZUNA_APP_KEY ||
    reqHeaders['x-adzuna-app-key'] ||
    reqHeaders['X-Adzuna-App-Key'];

  if (!appId || !appKey) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Adzuna App ID and App Key are required' }),
    };
  }

  try {
    const params = event.queryStringParameters || {};
    const query = (params.what || '').trim();
    if (!query) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'what (query) is required' }),
      };
    }

    const country = (params.country || 'us').toLowerCase().replace(/[^a-z]/g, '').slice(0, 2) || 'us';
    const page = String(clampInt(params.page, 1, 20, 1));
    const city = params.where || '';

    const baseUrl = `https://api.adzuna.com/v1/api/jobs/${encodeURIComponent(country)}/search/${encodeURIComponent(page)}`;

    const searchParams = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      results_per_page: '20',
      what: query,
    });

    if (city) {
      searchParams.append('where', city);
    }

    const response = await fetch(`${baseUrl}?${searchParams.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (response.status === 401 || response.status === 403) {
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: 'Invalid Adzuna credentials or unauthorized' }),
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
        body: JSON.stringify({ error: 'Invalid JSON from Adzuna API' }),
      };
    }

    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('Adzuna proxy error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch from Adzuna API' }),
    };
  }
};
