/**
 * Netlify Serverless Function: search-arbeitnow
 * Proxies requests to Arbeitnow API (free, no key required).
 * This helps avoid CORS issues when calling from the browser.
 *
 * The frontend calls this function at /api/search-arbeitnow
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
    'Access-Control-Allow-Headers': 'Content-Type',
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

  try {
    const params = event.queryStringParameters || {};
    const page = String(clampInt(params.page, 1, 20, 1));

    const searchParams = new URLSearchParams({ page });

    const response = await fetch(
      `https://www.arbeitnow.com/api/job-board-api?${searchParams}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
      }
    );

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
        body: JSON.stringify({ error: 'Invalid JSON from Arbeitnow API' }),
      };
    }

    return {
      statusCode: response.status,
      headers,
      body: JSON.stringify(data),
    };
  } catch (err) {
    console.error('Arbeitnow proxy error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch from Arbeitnow API' }),
    };
  }
};
