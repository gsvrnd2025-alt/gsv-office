const url = 'https://script.google.com/macros/s/AKfycbxnNGMbCSVVpY4MC7oELU39EP8KY1wEBUSR3dtbVhBbK3MpGBeixEe2tcsd-PJUvfdW/exec';

async function test() {
  try {
    console.log(`Fetching original deployment: ${url}...`);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ping' })
    });
    console.log(`Status: ${response.status}`);
    console.log(`Status Text: ${response.statusText}`);
    const text = await response.text();
    console.log(`Response (first 500 chars):\n${text.substring(0, 500)}`);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

test();
