const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Simple Electron build started...');

try {
  // ビルドフォルダの確認
  if (!fs.existsSync('./build')) {
    console.log('Building React app...');
    execSync('npm run build', { stdio: 'inherit' });
  }

  // シンプルなElectronアプリフォルダを作成
  const electronDir = './electron-app';
  if (fs.existsSync(electronDir)) {
    fs.rmSync(electronDir, { recursive: true });
  }
  fs.mkdirSync(electronDir);

  // 必要なファイルをコピー
  console.log('Copying files...');
  
  // Reactビルドをコピー
  fs.cpSync('./build', path.join(electronDir, 'build'), { recursive: true });
  
  // Electron設定ファイルをコピー
  fs.copyFileSync('./electron.js', path.join(electronDir, 'electron.js'));
  fs.copyFileSync('./preload.js', path.join(electronDir, 'preload.js'));
  
  // package.jsonを簡略化して作成
  const simplePackageJson = {
    "name": "notespace",
    "version": "1.0.0",
    "main": "electron.js",
    "scripts": {
      "start": "electron ."
    },
    "devDependencies": {
      "electron": "^22.3.27"
    }
  };
  
  fs.writeFileSync(
    path.join(electronDir, 'package.json'), 
    JSON.stringify(simplePackageJson, null, 2)
  );

  console.log('📦 Electron app created in ./electron-app/');
  console.log('');
  console.log('🎉 To run the app:');
  console.log('   cd electron-app');
  console.log('   npm install');
  console.log('   npm start');
  console.log('');
  console.log('✨ Your NoteSpace desktop app is ready!');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}