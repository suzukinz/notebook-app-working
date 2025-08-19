// アイコン生成スクリプト
const fs = require('fs');

// SVGアイコンを生成
const createSVGIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <circle cx="256" cy="256" r="240" fill="#3b82f6"/>
  <rect x="166" y="186" width="180" height="140" rx="8" fill="#ffffff"/>
  <circle cx="196" cy="206" r="4" fill="#6366f1"/>
  <circle cx="196" cy="231" r="4" fill="#6366f1"/>
  <circle cx="196" cy="256" r="4" fill="#6366f1"/>
  <rect x="216" y="203" width="100" height="3" rx="1.5" fill="#94a3b8"/>
  <rect x="216" y="228" width="80" height="3" rx="1.5" fill="#cbd5e1"/>
  <rect x="216" y="253" width="90" height="3" rx="1.5" fill="#cbd5e1"/>
</svg>`;

// アイコンサイズ配列
const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];

// public フォルダにアイコンを保存
iconSizes.forEach(size => {
  const svgContent = createSVGIcon(size);
  fs.writeFileSync(`public/icon-${size}x${size}.svg`, svgContent);
  console.log(`✅ Generated icon-${size}x${size}.svg`);
});

// favicon.ico も生成 (16x16)
const faviconSVG = createSVGIcon(16);
fs.writeFileSync('public/favicon.svg', faviconSVG);
console.log('✅ Generated favicon.svg');

console.log('\n🎉 All icons generated successfully!');
console.log('📱 Your PWA is ready for installation!');