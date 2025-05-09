import { writeFile } from 'fs/promises';

// Colors in the MeNova green palette
const colors = {
  'reddit': '#A5D6A7',
  'health': '#81C784',
  'geneva': '#66BB6A',
  'facebook': '#4CAF50',
  'peanut': '#43A047',
  'community': '#2E7D32'
};

// Generate SVG icon
function generateSvgIcon(name, color, letter) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="50" fill="${color}"/>
  <text x="50" y="55" font-family="Arial" font-size="40" fill="white" text-anchor="middle" dominant-baseline="middle">${letter}</text>
</svg>`;
}

// Generate icons for each community
async function generateIcons() {
  for (const [name, color] of Object.entries(colors)) {
    const letter = name.charAt(0).toUpperCase();
    const svg = generateSvgIcon(name, color, letter);
    await writeFile(`${name}-icon.svg`, svg);
    console.log(`Generated ${name}-icon.svg`);
  }
  console.log('All icons generated!');
}

generateIcons().catch(console.error); 