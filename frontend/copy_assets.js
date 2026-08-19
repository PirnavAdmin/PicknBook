const fs = require('fs');

const srcPng = 'C:\\Users\\vinay\\.gemini\\antigravity-ide\\brain\\fd6618d5-9516-4436-8c9b-be2339f429cd\\media__1786449590952.png';
const destPng = 'C:\\Users\\vinay\\Downloads\\frontend (1)\\frontend\\src\\assets\\images\\sunset-bg.png';

try {
  if (fs.existsSync(srcPng)) {
    fs.copyFileSync(srcPng, destPng);
    console.log('Success! Copied the beautiful sunset background to src/assets/images/sunset-bg.png');
  } else {
    console.log('Error: Source image not found. Path:', srcPng);
  }
} catch(e) {
  console.error(e);
}
