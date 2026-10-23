/**
 * Lightweight Code 128 Barcode Generator for SVG rendering
 * Used for printing shelf labels, product tags, and visual confirmation
 */

// Code 128 patterns (Table B)
const CODE128_PATTERNS: number[] = [
  212222, 222122, 222221, 121223, 121322, 131222, 122213, 122312, 132212, 221213, // 0-9
  221312, 231212, 112232, 122132, 122231, 113222, 123122, 123221, 223211, 221132, // 10-19
  221231, 213212, 223112, 312131, 311222, 321122, 321221, 312212, 322112, 322211, // 20-29
  212123, 212321, 232121, 111323, 131123, 131321, 112313, 132113, 132311, 211313, // 30-39
  231113, 231311, 112133, 112331, 132131, 113123, 113321, 133121, 313121, 211331, // 40-49
  231131, 213113, 213311, 213131, 311123, 311321, 331121, 312113, 312311, 332111, // 50-59
  314111, 221411, 431111, 111224, 111422, 121124, 121421, 141122, 141221, 112214, // 60-69
  112412, 122114, 122411, 142112, 142211, 241211, 221114, 413111, 241112, 134111, // 70-79
  111242, 121142, 121241, 114212, 124112, 124211, 411212, 421112, 421211, 212141, // 80-89
  214121, 412121, 111143, 111341, 131141, 114113, 114311, 411113, 411311, 113141, // 90-99
  114131, 311141, 411131, 211412, 211214, 211232, 2331112 // 100-106 (106 is STOP)
];

const START_B = 104;
const STOP = 106;

export function generateCode128Bars(text: string): string {
  // Use Code 128 Set B
  const codes: number[] = [START_B];
  let checkSum = START_B;

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const codeVal = charCode - 32;
    if (codeVal >= 0 && codeVal <= 95) {
      codes.push(codeVal);
      checkSum += codeVal * (i + 1);
    }
  }

  const checkCode = checkSum % 103;
  codes.push(checkCode);
  codes.push(STOP);

  // Convert to bar modules (1 = black, 0 = white)
  let modules = '11111'; // Quiet zone
  for (const code of codes) {
    const pattern = CODE128_PATTERNS[code].toString();
    let isBar = true;
    for (let j = 0; j < pattern.length; j++) {
      const width = parseInt(pattern[j], 10);
      modules += (isBar ? '1' : '0').repeat(width);
      isBar = !isBar;
    }
  }
  modules += '11'; // Final termination bar
  modules += '11111'; // Quiet zone

  return modules;
}
