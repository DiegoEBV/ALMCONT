const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertSvgToPng() {
  const iconsDir = path.join(__dirname, 'public', 'icons');
  const svgFiles = fs.readdirSync(iconsDir).filter(file => file.endsWith('.svg'));
  
  for (const svgFile of svgFiles) {
    const svgPath = path.join(iconsDir, svgFile);
    const pngFile = svgFile.replace('.svg', '.png');
    const pngPath = path.join(iconsDir, pngFile);
    
    try {
      // Extraer el tamaño del nombre del archivo
      const sizeMatch = svgFile.match(/(\d+)x(\d+)/);
      if (sizeMatch) {
        const size = parseInt(sizeMatch[1]);
        
        await sharp(svgPath)
          .resize(size, size)
          .png()
          .toFile(pngPath);
        
        console.log(`Converted ${svgFile} to ${pngFile}`);
      }
    } catch (error) {
      console.error(`Error converting ${svgFile}:`, error.message);
    }
  }
  
  console.log('All SVG icons converted to PNG successfully!');
}

convertSvgToPng().catch(console.error);