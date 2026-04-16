const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.jsx');
let code = fs.readFileSync(filePath, 'utf-8');

const apiFetchDef = `
const API_URL = \`\$\{window.location.protocol\}//\$\{window.location.hostname\}:4001\`;
const API_KEY = 'devoteam_secure_api_key_2026';

const apiFetch = (url, options = {}) => {
  const headers = {
    ...options.headers,
    'x-api-key': API_KEY,
  };
  return fetch(url, { ...options, headers });
};
`;

code = code.replace(/const API_URL = `\$\{window\.location\.protocol\}\/\/\$\{window\.location\.hostname\}:4001`;/, apiFetchDef.trim());

// We need to replace fetch( with apiFetch( but be careful not to replace apiFetch itself.
// The easiest is a lookbehind or just doing a string split/join if we check manually.
// Regex: /\bfetch\(/g -> apiFetch(
code = code.replace(/\bfetch\(/g, 'apiFetch(');

// Now fix the apiFetch definition we just messed up
code = code.replace(/return apiFetch\(/g, 'return fetch(');

fs.writeFileSync(filePath, code);
console.log('App.jsx refactored successfully.');
