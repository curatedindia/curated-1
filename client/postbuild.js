import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
const indexPath = path.join(distDir, 'index.html');

if (fs.existsSync(indexPath)) {
  // 1. Create dist/checkout/index.html so /checkout is a physical static directory/file on Vercel
  const checkoutDir = path.join(distDir, 'checkout');
  if (!fs.existsSync(checkoutDir)) {
    fs.mkdirSync(checkoutDir, { recursive: true });
  }
  fs.copyFileSync(indexPath, path.join(checkoutDir, 'index.html'));
  fs.copyFileSync(indexPath, path.join(distDir, 'checkout.html'));

  // 2. Create dist/nikhil/index.html so /nikhil is a physical static directory/file on Vercel
  const nikhilDir = path.join(distDir, 'nikhil');
  if (!fs.existsSync(nikhilDir)) {
    fs.mkdirSync(nikhilDir, { recursive: true });
  }
  fs.copyFileSync(indexPath, path.join(nikhilDir, 'index.html'));
  fs.copyFileSync(indexPath, path.join(distDir, 'nikhil.html'));

  // 3. Create dist/404.html so Vercel automatically serves the SPA on any unhandled route
  fs.copyFileSync(indexPath, path.join(distDir, '404.html'));

  // 4. Sync client/dist to root /dist for universal Vercel output detection
  const rootDist = path.join(__dirname, '..', 'dist');
  try {
    fs.cpSync(distDir, rootDist, { recursive: true, force: true });
    console.log('✓ Postbuild complete: Generated /checkout, /nikhil, 404.html fallbacks in client/dist and synced to root dist');
  } catch (err) {
    console.log('✓ Postbuild complete: Generated /checkout, /nikhil, and 404.html fallbacks in client/dist');
  }
} else {
  console.warn('Warning: dist/index.html not found, skipping postbuild fallbacks');
}
