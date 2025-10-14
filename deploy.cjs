const ghpages = require('gh-pages');
const path = require('path');
const fs = require('fs');

// Try alternative approach: use gh-pages with minimal configuration
const options = {
  dotfiles: true,
  branch: 'gh-pages',
  user: {
    name: 'gh-pages',
    email: 'gh-pages@users.noreply.github.com'
  },
  // Try without specifying dest to avoid path issues
  silent: false
};

console.log('Deploying to GitHub Pages...');

ghpages.publish('dist', options, function(err) {
  if (err) {
    console.error('Deployment failed:', err);
    process.exit(1);
  } else {
    console.log('Deployment successful!');
    process.exit(0);
  }
});