const fs = require('fs');
const path = require('path');

// Buat folder dulu
const folders = [
  'app/dashboard/produksi',
  'app/dashboard/produksi/input'
];

folders.forEach(folder => {
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    console.log(`✅ Created folder: ${folder}`);
  }
});

// Move file
const source = 'app/dashboard/input-produksi-temp.tsx';
const dest = 'app/dashboard/produksi/input/page.tsx';

if (fs.existsSync(source)) {
  fs.renameSync(source, dest);
  console.log(`✅ Moved: ${source} → ${dest}`);
} else {
  console.log(`❌ Source file not found: ${source}`);
}

console.log('\n✨ Setup selesai!');
