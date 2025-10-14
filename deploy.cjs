const ghpages = require('gh-pages');
const path = require('path');
const os = require('os');

// Create a shorter temporary directory path
const tempDir = path.join('C:', 'tmp', 'gh');

// Ensure the temp directory exists
const fs = require('fs');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configure gh-pages with shorter paths
const options = {
  dotfiles: true,
  // Don't specify git path, let gh-pages handle it
  // Use shorter branch name
  branch: 'gh-pages',
  // Configure user
  user: {
    name: 'gh-pages',
    email: 'gh-pages@users.noreply.github.com'
  },
  // Use shorter temporary directory via environment
  dest: '.'
};

// Set environment variable for shorter temp paths
process.env.TMPDIR = tempDir;
process.env.TMP = tempDir;
process.env.TEMP = tempDir;

console.log('Deploying to GitHub Pages...');
console.log('Using temp directory:', tempDir);

ghpages.publish('dist', options, function(err) {
  if (err) {
    console.error('Deployment failed:', err);
    process.exit(1);
  } else {
    console.log('Deployment successful!');
    process.exit(0);
  }
});