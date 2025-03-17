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
    try {
      execSync('npx tailwindcss -i ./src/renderer/styles/globals.css -o ./dist/renderer/tailwind.css');
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
        '.svg': 'dataurl',
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
    const mainEntryPath = path.resolve(__dirname, 'src/main/index.js');
    await build({
      ...commonBuildOptions,
      entryPoints: [mainEntryPath],
      outdir: path.join(__dirname, 'dist/main'),
      platform: 'node',
    });

    // Build the preload script
    await build({
      ...commonBuildOptions,
      entryPoints: [path.join(__dirname, 'src/preload/preload.ts')],
      outdir: path.join(__dirname, 'dist/preload'),
      platform: 'node',
    });

    // Build the main renderer file
    await build({
      ...commonBuildOptions,
      entryPoints: [path.join(__dirname, 'src/renderer/index.tsx')],
      outdir: path.join(__dirname, 'dist/renderer'),
      plugins: [cssPlugin],
    });

    // Build the popup file
    await build({
      ...commonBuildOptions,
      entryPoints: [path.join(__dirname, 'src/renderer/popup.tsx')],
      outdir: path.join(__dirname, 'dist/renderer'),
      plugins: [cssPlugin],
    });

    // Copy HTML files
    fs.copyFileSync(
      path.join(__dirname, 'src/renderer/index.html'),
      path.join(__dirname, 'dist/index.html')
    );
    fs.copyFileSync(
      path.join(__dirname, 'src/renderer/popup.html'),
      path.join(__dirname, 'dist/popup.html')
    );

    // Copy assets directory
    const assetsDir = path.join(__dirname, 'src/assets');
    const distAssetsDir = path.join(__dirname, 'dist/assets');
    if (fs.existsSync(assetsDir)) {
      fs.cpSync(assetsDir, distAssetsDir, { recursive: true });
    }

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

  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildFiles();
