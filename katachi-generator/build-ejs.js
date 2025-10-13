const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

// Read the main CSS files that need to be inlined
const jqueryUICSS = fs.readFileSync(path.join(__dirname, 'public/css/jquery-ui.min.css'), 'utf8');
const mainCSS = fs.readFileSync(path.join(__dirname, 'public/css/main.css'), 'utf8');

// Template data
const templateData = {
  title: 'Katachi Gen',
  nftData: '___NFT_DATA_PLACEHOLDER___',  // This will be replaced at runtime
  nftDataPlaceholder: '___NFT_DATA_PLACEHOLDER___',
  jqueryUICSS: jqueryUICSS,
  mainCSS: mainCSS,
  fs: fs,  // Make fs available to EJS templates
  path: path,  // Make path available to EJS templates
  projectRoot: __dirname  // Provide project root path
};

// Render the EJS template
const templatePath = path.join(__dirname, 'src/template/index.ejs');
ejs.renderFile(templatePath, templateData, {
  views: [
    path.join(__dirname, 'src/template'),
    path.join(__dirname, 'src/template/partials')
  ]
}, (err, html) => {
  if (err) {
    console.error('Error rendering EJS template:', err);
    process.exit(1);
  }

  // Write the rendered HTML to the public directory for webpack
  const outputPath = path.join(__dirname, 'public/generated-index.html');
  fs.writeFileSync(outputPath, html);
  console.log('EJS template rendered successfully to', outputPath);
  
  // Also write directly to dist as webpack has issues with the large file
  const distPath = path.join(__dirname, 'dist/template.html');
  
  // Ensure dist directory exists
  const distDir = path.dirname(distPath);
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  
  fs.writeFileSync(distPath, html);
  console.log('EJS template also written directly to', distPath);
});