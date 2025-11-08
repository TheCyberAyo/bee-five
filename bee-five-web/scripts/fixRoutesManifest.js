const fs = require('fs');
const path = require('path');

const manifestPath = path.join(process.cwd(), '.next', 'routes-manifest.json');

try {
  const raw = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(raw);
  let mutated = false;

  if (!Array.isArray(manifest.dataRoutes)) {
    manifest.dataRoutes = [];
    mutated = true;
  }

  if (mutated) {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('Patched .next/routes-manifest.json to include dataRoutes array.');
  }
} catch (error) {
  console.warn(
    `Unable to patch routes manifest at ${manifestPath}: ${error.message}`
  );
}

