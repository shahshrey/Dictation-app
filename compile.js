const { build } = require('esbuild');
const path = require('path');
const fs = require('fs');
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');

// Ensure output directories exist
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

// Process CSS with Tailwind and copy to output
async function processCss() {
  try {
    console.log('Processing CSS with Tailwind...');
    const cssSource = path.join(__dirname, 'src/renderer/styles/globals.css');
    const outputDir = path.join(__dirname, 'dist/renderer');
    
    ensureDirectoryExists(outputDir);
    
    const cssDestIndex = path.join(outputDir, 'index.css');
    const cssDestPopup = path.join(outputDir, 'popup.css');
    
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
    fs.writeFileSync(cssDestIndex, result.css, 'utf8');
    fs.writeFileSync(cssDestPopup, result.css, 'utf8');
    
    console.log('CSS files processed and copied successfully!');
    return result.css;
  } catch (error) {
    console.error('Error processing CSS:', error);
    throw error;
  }
}

// Copy HTML files to output directory
function copyHtmlFiles() {
  try {
    const outputDir = path.join(__dirname, 'dist/renderer');
    ensureDirectoryExists(outputDir);
    
    // Copy index.html
    fs.copyFileSync(
      path.join(__dirname, 'src/renderer/index.html'),
      path.join(outputDir, 'index.html')
    );
    
    // Copy popup.html
    fs.copyFileSync(
      path.join(__dirname, 'src/renderer/popup.html'),
      path.join(outputDir, 'popup.html')
    );
    
    console.log('HTML files copied successfully!');
  } catch (error) {
    console.error('Error copying HTML files:', error);
    throw error;
  }
}

// Build shared modules
async function buildSharedModules() {
  try {
    console.log('Building shared modules...');
    const sharedDir = path.join(__dirname, 'src/shared');
    const outputDir = path.join(__dirname, 'dist/shared');
    
    ensureDirectoryExists(outputDir);
    
    // Get all TypeScript files in the shared directory
    const files = fs.readdirSync(sharedDir)
      .filter(file => file.endsWith('.ts'))
      .map(file => path.join(sharedDir, file));
    
    // Build each file
    for (const file of files) {
      const filename = path.basename(file, '.ts');
      await build({
        entryPoints: [file],
        bundle: false,
        outfile: path.join(outputDir, `${filename}.js`),
        platform: 'node',
        format: 'cjs',
        target: 'node16',
        sourcemap: true,
        allowOverwrite: true,
        loader: {
          '.ts': 'ts',
        },
      });
    }
    
    console.log('Shared modules built successfully!');
  } catch (error) {
    console.error('Error building shared modules:', error);
    throw error;
  }
}

// Build the application
async function buildFiles() {
  try {
    const outputDir = path.join(__dirname, 'dist/renderer');
    ensureDirectoryExists(outputDir);
    
    // Build shared modules first
    await buildSharedModules();
    
    // Process CSS before building the renderer files
    const processedCss = await processCss();
    
    // Copy HTML files
    copyHtmlFiles();
    
    // Create a temporary CSS file for esbuild to use
    const tempCssPath = path.join(__dirname, 'src/renderer/temp-globals.css');
    fs.writeFileSync(tempCssPath, processedCss, 'utf8');
    
    // Build the main renderer file
    console.log('Building renderer...');
    await build({
      entryPoints: [path.join(__dirname, 'src/renderer/index.tsx')],
      bundle: true,
      minify: false,
      sourcemap: true,
      outfile: path.join(outputDir, 'index.js'),
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
      // Inject the CSS into the bundle
      inject: [path.join(__dirname, 'src/renderer/css-inject.js')],
    });
    console.log('Renderer built successfully!');

    // Build the popup file
    console.log('Building popup...');
    await build({
      entryPoints: [path.join(__dirname, 'src/renderer/popup.tsx')],
      bundle: true,
      minify: false,
      sourcemap: true,
      outfile: path.join(outputDir, 'popup.js'),
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
      // Inject the CSS into the bundle
      inject: [path.join(__dirname, 'src/renderer/css-inject.js')],
    });
    console.log('Popup built successfully!');
    
    // Clean up temporary files
    try {
      fs.unlinkSync(tempCssPath);
    } catch (error) {
      console.error('Error cleaning up temporary CSS file:', error);
    }
    
    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildFiles(); 