const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting alternative deployment to GitHub Pages...');

try {
  // Check if dist directory exists
  if (!fs.existsSync('dist')) {
    console.error('Error: dist directory not found. Please run "npm run build" first.');
    process.exit(1);
  }

  console.log('1. Creating orphan gh-pages branch...');
  
  // Create a temporary directory with a shorter name
  const tempDir = path.join(require('os').tmpdir(), 'gh-deploy');
  
  // Clean up any existing temp directory
  if (fs.existsSync(tempDir)) {
    execSync(`rmdir /s /q "${tempDir}"`, { stdio: 'inherit' });
  }
  
  // Create temp directory and copy dist files
  fs.mkdirSync(tempDir, { recursive: true });
  execSync(`xcopy /e /i /h /y dist "${tempDir}"`, { stdio: 'inherit' });
  
  // Change to temp directory
  process.chdir(tempDir);
  
  console.log('2. Initializing git repository...');
  execSync('git init', { stdio: 'inherit' });
  execSync('git config user.name "GitHub Actions"', { stdio: 'inherit' });
  execSync('git config user.email "actions@github.com"', { stdio: 'inherit' });
  
  console.log('3. Adding files...');
  execSync('git add .', { stdio: 'inherit' });
  execSync('git commit -m "Deploy to GitHub Pages"', { stdio: 'inherit' });
  
  console.log('4. Pushing to gh-pages branch...');
  execSync('git branch -M gh-pages', { stdio: 'inherit' });
  execSync('git remote add origin https://github.com/DiegoEBV/ALMCONT.git', { stdio: 'inherit' });
  execSync('git push -f origin gh-pages', { stdio: 'inherit' });
  
  console.log('✅ Successfully deployed to GitHub Pages!');
  
  // Clean up
  process.chdir(path.dirname(path.dirname(tempDir)));
  execSync(`rmdir /s /q "${tempDir}"`, { stdio: 'inherit' });
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}