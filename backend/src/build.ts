import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const rootDir = path.join(__dirname, '../..');
const distDir = path.join(rootDir, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

console.log('Building frontend...');
exec('npm run build', { cwd: rootDir }, (error, stdout, stderr) => {
  if (error) {
    console.error(`Frontend build error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Frontend build stderr: ${stderr}`);
  }
  console.log(`Frontend build stdout: ${stdout}`);
  
  console.log('Building backend...');
  exec('npm run build', { cwd: path.join(rootDir, 'backend') }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Backend build error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Backend build stderr: ${stderr}`);
    }
    console.log(`Backend build stdout: ${stdout}`);
    console.log('Build complete!');
  });
});
