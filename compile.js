const { build } = require('esbuild');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Build the application
async function buildFiles() {
  try {
    // Process Tailwind CSS first
    console.log('Processing Tailwind CSS...');
    try {
      execSync('npx tailwindcss -i ./src/renderer/styles/globals.css -o ./dist/renderer/tailwind.css');
      console.log('Tailwind CSS processed successfully!');
    } catch (error) {
      console.error('Failed to process Tailwind CSS:', error);
      process.exit(1);
    }

    const commonBuildOptions = {
      bundle: true,
      minify: false,
      sourcemap: true,
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
      external: ['electron'],
      publicPath: '/',
      assetNames: '[name]',
    };

    // CSS handling plugin
    const cssPlugin = {
      name: 'css-plugin',
      setup(build) {
        // Handle CSS imports properly
        build.onResolve({ filter: /\.css$/ }, args => {
          return { path: path.resolve(args.resolveDir, args.path) };
        });
      },
    };

    // Build the main process file
    console.log('Building main process...');
    const mainEntryPath = path.resolve(__dirname, 'src/main/index.js');
    console.log('Main entry path:', mainEntryPath);
    await build({
      ...commonBuildOptions,
      entryPoints: [mainEntryPath],
      outdir: path.join(__dirname, 'dist/main'),
      platform: 'node',
    });
    console.log('Main process built successfully!');

    // Build the preload script
    console.log('Building preload script...');
    await build({
      ...commonBuildOptions,
      entryPoints: [path.join(__dirname, 'src/preload/preload.ts')],
      outdir: path.join(__dirname, 'dist/preload'),
      platform: 'node',
    });
    console.log('Preload script built successfully!');

    // Build the main renderer file
    console.log('Building renderer...');
    await build({
      ...commonBuildOptions,
      entryPoints: [path.join(__dirname, 'src/renderer/index.tsx')],
      outdir: path.join(__dirname, 'dist/renderer'),
      plugins: [cssPlugin],
    });
    console.log('Renderer built successfully!');

    // Build the popup file
    console.log('Building popup...');
    await build({
      ...commonBuildOptions,
      entryPoints: [path.join(__dirname, 'src/renderer/popup.tsx')],
      outdir: path.join(__dirname, 'dist/renderer'),
      plugins: [cssPlugin],
    });
    console.log('Popup built successfully!');

    // Copy HTML files
    fs.copyFileSync(
      path.join(__dirname, 'src/renderer/index.html'),
      path.join(__dirname, 'dist/index.html')
    );
    fs.copyFileSync(
      path.join(__dirname, 'src/renderer/popup.html'),
      path.join(__dirname, 'dist/popup.html')
    );

    // Update HTML files to reference the processed Tailwind CSS
    let indexHtml = fs.readFileSync(path.join(__dirname, 'dist/index.html'), 'utf8');
    indexHtml = indexHtml.replace(
      '<link rel="stylesheet" href="./renderer/index.css" />',
      '<link rel="stylesheet" href="./renderer/tailwind.css" />'
    );
    fs.writeFileSync(path.join(__dirname, 'dist/index.html'), indexHtml);

    let popupHtml = fs.readFileSync(path.join(__dirname, 'dist/popup.html'), 'utf8');
    popupHtml = popupHtml.replace(
      '<link rel="stylesheet" href="./renderer/popup.css" />',
      '<link rel="stylesheet" href="./renderer/tailwind.css" />'
    );
    fs.writeFileSync(path.join(__dirname, 'dist/popup.html'), popupHtml);

    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildFiles();
