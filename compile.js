const { build } = require('esbuild');
const path = require('path');
const fs = require('fs');
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');

// Process CSS with Tailwind and copy to output
async function processCss() {
  try {
    const cssSource = path.join(__dirname, 'src/renderer/styles/globals.css');
    const cssDestIndex = path.join(__dirname, 'src/renderer/index.css');
    const cssDestPopup = path.join(__dirname, 'src/renderer/popup.css');
    
    // Read the CSS file
    const css = fs.readFileSync(cssSource, 'utf8');
    
    // Process with PostCSS (Tailwind + Autoprefixer)
    const result = await postcss([
      tailwindcss(path.join(__dirname, 'tailwind.config.js')),
      autoprefixer
    ]).process(css, { 
      from: cssSource,
      to: cssDestIndex
    });
    
    // Write the processed CSS to the output files
    fs.writeFileSync(cssDestIndex, result.css);
    fs.writeFileSync(cssDestPopup, result.css);
    
    console.log('CSS files processed and copied successfully!');
  } catch (error) {
    console.error('Error processing CSS:', error);
    throw error;
  }
}

// Build the application
async function buildFiles() {
  try {
    // Process CSS first
    await processCss();
    
    // Build the main renderer file
    console.log('Building renderer...');
    await build({
      entryPoints: [path.join(__dirname, 'src/renderer/index.tsx')],
      bundle: true,
      minify: false,
      sourcemap: true,
      outfile: path.join(__dirname, 'src/renderer/index.js'),
      platform: 'browser',
      allowOverwrite: true,
      loader: {
        '.tsx': 'tsx',
        '.ts': 'ts',
        '.js': 'js',
        '.jsx': 'jsx',
        '.css': 'css',
      },
      define: {
        'process.env.NODE_ENV': '"development"',
      },
    });
    console.log('Renderer built successfully!');

    // Build the popup file
    console.log('Building popup...');
    await build({
      entryPoints: [path.join(__dirname, 'src/renderer/popup.tsx')],
      bundle: true,
      minify: false,
      sourcemap: true,
      outfile: path.join(__dirname, 'src/renderer/popup.js'),
      platform: 'browser',
      allowOverwrite: true,
      loader: {
        '.tsx': 'tsx',
        '.ts': 'ts',
        '.js': 'js',
        '.jsx': 'jsx',
        '.css': 'css',
      },
      define: {
        'process.env.NODE_ENV': '"development"',
      },
    });
    console.log('Popup built successfully!');
    
    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildFiles(); 