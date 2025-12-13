const fs = require('fs');
const path = require('path');

// Función para crear iconos PNG desde SVG usando Canvas API (simulado con SVG)
function generateIcon(size, isMaskable = false) {
  const padding = isMaskable ? size * 0.1 : 0; // 10% padding para maskable
  const iconSize = size - (padding * 2);
  const offset = padding;

  const svgContent = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${isMaskable ? `<rect width="${size}" height="${size}" fill="#3B82F6"/>` : ''}
  <g transform="translate(${offset}, ${offset}) scale(${iconSize / 512})">
    <!-- Fondo con gradiente -->
    <rect width="512" height="512" rx="64" fill="url(#gradient)"/>
    
    <!-- Definición del gradiente -->
    <defs>
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#3B82F6;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#1E40AF;stop-opacity:1" />
      </linearGradient>
    </defs>
    
    <!-- Icono de almacén/warehouse -->
    <g transform="translate(128, 128)">
      <!-- Edificio principal -->
      <rect x="32" y="80" width="192" height="176" fill="white" opacity="0.9" rx="8"/>
      
      <!-- Techo -->
      <path d="M16 80 L128 32 L240 80 L224 88 L128 48 L32 88 Z" fill="white"/>
      
      <!-- Puerta principal -->
      <rect x="96" y="160" width="64" height="96" fill="#3B82F6" rx="4"/>
      
      <!-- Ventanas -->
      <rect x="48" y="112" width="24" height="24" fill="#3B82F6" rx="2"/>
      <rect x="184" y="112" width="24" height="24" fill="#3B82F6" rx="2"/>
      <rect x="48" y="160" width="24" height="24" fill="#3B82F6" rx="2"/>
      <rect x="184" y="160" width="24" height="24" fill="#3B82F6" rx="2"/>
      
      <!-- Detalles del almacén -->
      <rect x="112" y="180" width="32" height="8" fill="white" opacity="0.7" rx="2"/>
      <rect x="112" y="200" width="32" height="8" fill="white" opacity="0.7" rx="2"/>
      <rect x="112" y="220" width="32" height="8" fill="white" opacity="0.7" rx="2"/>
      
      <!-- Símbolo de cajas/inventario -->
      <g transform="translate(200, 200)">
        <rect x="0" y="16" width="24" height="24" fill="white" opacity="0.8" rx="2"/>
        <rect x="8" y="8" width="24" height="24" fill="white" opacity="0.9" rx="2"/>
        <rect x="16" y="0" width="24" height="24" fill="white" rx="2"/>
      </g>
    </g>
  </g>
</svg>`;

  return svgContent;
}

// Tamaños de iconos necesarios
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const maskableSizes = [192, 512];

// Crear directorio de iconos si no existe
const iconsDir = path.join(__dirname, 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generar iconos normales
sizes.forEach(size => {
  const svgContent = generateIcon(size, false);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svgContent);
  console.log(`Generated ${filename}`);
});

// Generar iconos maskable
maskableSizes.forEach(size => {
  const svgContent = generateIcon(size, true);
  const filename = `icon-${size}x${size}-maskable.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svgContent);
  console.log(`Generated ${filename}`);
});

console.log('All icons generated successfully!');
console.log('Note: SVG icons are generated. For production, consider converting to PNG using a tool like sharp or imagemagick.');