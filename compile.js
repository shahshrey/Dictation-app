const { build } = require('esbuild');
const path = require('path');
const fs = require('fs');
const postcss = require('postcss');
const tailwindcss = require('tailwindcss');
const autoprefixer = require('autoprefixer');

// Simple build logger
const buildLogger = {
  info: (message) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] INFO: ${message}`);
  },
  error: (message, error) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`, error);
  }
};

// Ensure output directories exist
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    buildLogger.info(`Created directory: ${dirPath}`);
  }
}

// Process CSS with Tailwind and copy to output
async function processCss() {
  try {
    buildLogger.info('Processing CSS with Tailwind...');
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
    
    buildLogger.info('CSS files processed and copied successfully!');
    return result.css;
  } catch (error) {
    buildLogger.error('Error processing CSS:', error);
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
    
    buildLogger.info('HTML files copied successfully!');
  } catch (error) {
    buildLogger.error('Error copying HTML files:', error);
    throw error;
  }
}

// Build shared modules
async function buildSharedModules() {
  try {
    buildLogger.info('Building shared modules...');
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
    
    // Also build the types directory
    const typesDir = path.join(sharedDir, 'types');
    const typesOutputDir = path.join(outputDir, 'types');
    
    if (fs.existsSync(typesDir)) {
      ensureDirectoryExists(typesOutputDir);
      
      // Get all TypeScript files in the types directory
      const typesFiles = fs.readdirSync(typesDir)
        .filter(file => file.endsWith('.ts'))
        .map(file => path.join(typesDir, file));
      
      // Build each file
      for (const file of typesFiles) {
        const filename = path.basename(file, '.ts');
        await build({
          entryPoints: [file],
          bundle: false,
          outfile: path.join(typesOutputDir, `${filename}.js`),
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
    }
    
    buildLogger.info('Shared modules built successfully!');
  } catch (error) {
    buildLogger.error('Error building shared modules:', error);
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
    buildLogger.info('Building renderer...');
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
    buildLogger.info('Renderer built successfully!');

    // Build the popup file
    buildLogger.info('Building popup...');
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
    buildLogger.info('Popup built successfully!');
    
    // Clean up temporary files
    try {
      fs.unlinkSync(tempCssPath);
    } catch (error) {
      buildLogger.error('Error cleaning up temporary CSS file:', error);
    }
    
    buildLogger.info('Build completed successfully!');
  } catch (error) {
    buildLogger.error('Build failed:', error);
    process.exit(1);
  }
}

buildFiles(); 