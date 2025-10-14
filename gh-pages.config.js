const path = require('path');
const os = require('os');

module.exports = {
  // Use a shorter temporary directory path to avoid ENAMETOOLONG on Windows
  dotfiles: true,
  dest: '.',
  // Use system temp directory with shorter path
  repo: process.env.GH_PAGES_REPO || undefined,
  // Reduce the depth of temporary directories
  silent: false,
  // Use shorter branch name if needed
  branch: 'gh-pages',
  // Configure git with shorter paths
  git: path.join(os.tmpdir(), 'gh-pages-temp'),
  // Add Windows-specific configuration
  user: {
    name: process.env.GH_PAGES_USER_NAME || 'gh-pages',
    email: process.env.GH_PAGES_USER_EMAIL || 'gh-pages@users.noreply.github.com'
  }
};