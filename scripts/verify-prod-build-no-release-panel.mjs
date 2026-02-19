import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve('dist');

if (!fs.existsSync(DIST_DIR)) {
  console.error('[verify] dist folder not found. Run a production build first.');
  process.exit(1);
}

const markers = [
  'Local Release Panel',
  '/api/deploy-dev',
  '/api/promote-prod',
  '/api/session',
  '/__qms/release-agent/start',
  'qms_release_agent_session',
];

function readFilesRecursively(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...readFilesRecursively(fullPath));
      continue;
    }
    if (/\.(js|mjs|css|html)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const candidateFiles = readFilesRecursively(DIST_DIR);
const violations = [];

for (const filePath of candidateFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  for (const marker of markers) {
    if (content.includes(marker)) {
      violations.push({ filePath, marker });
    }
  }
}

if (violations.length > 0) {
  console.error('[verify] Production build contains release panel markers:');
  for (const violation of violations) {
    console.error(`- ${violation.filePath} -> ${violation.marker}`);
  }
  process.exit(1);
}

console.log('[verify] Production build clean: release panel markers not found.');
