const ghpages = require('gh-pages');
const path = require('path');

// Configure gh-pages with Windows-specific options
const options = {
  branch: 'gh-pages',
  dest: '.',
  dotfiles: true,
  nojekyll: true,
  history: false,
  // Use shorter temporary directory name to avoid path length issues
  repo: undefined, // Will use origin by default
  silent: false,
  // Additional Windows-specific configurations
  git: 'git',
  clone: path.join(require('os').tmpdir(), 'gh-tmp'),
  push: true,
  message: 'Deploy',
  // Force clean deployment
  remove: '**/*'
};

console.log('Starting deployment to GitHub Pages...');
console.log('Build directory:', path.resolve('dist'));

ghpages.publish('dist', options, function(err) {
  if (err) {
    console.error('Deployment failed:', err);
    process.exit(1);
  } else {
    console.log('Successfully deployed to GitHub Pages!');
    process.exit(0);
  }
});