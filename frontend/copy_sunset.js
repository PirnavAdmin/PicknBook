const fs = require('fs');

const src = 'C:\\Users\\vinay\\Downloads\\Golden skies over the clouds.png';
const dest = 'C:\\Users\\vinay\\Downloads\\frontend (1)\\frontend\\src\\assets\\images\\sunset-bg.png';

try {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('Successfully copied the sunset image!');
  } else {
    console.log('Could not find the image in Downloads.');
  }
} catch (err) {
  console.error(err);
}
