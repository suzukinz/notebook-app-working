import { 
  hexToRgb, 
  rgbToHex, 
  getContrastColor, 
  generateColorVariants, 
  isValidHexColor 
} from '../colorUtils';

describe('colorUtils', () => {
  describe('hexToRgb', () => {
    it('should convert valid hex color to RGB', () => {
      expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#00FF00')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#0000FF')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('should handle short hex format', () => {
      expect(hexToRgb('#F00')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#0F0')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#00F')).toEqual({ r: 0, g: 0, b: 255 });
    });

    it('should handle hex without hash', () => {
      expect(hexToRgb('FF0000')).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should return null for invalid hex', () => {
      expect(hexToRgb('invalid')).toBeNull();
      expect(hexToRgb('#GGGGGG')).toBeNull();
      expect(hexToRgb('')).toBeNull();
    });
  });

  describe('rgbToHex', () => {
    it('should convert RGB values to hex', () => {
      expect(rgbToHex(255, 0, 0)).toBe('#FF0000');
      expect(rgbToHex(0, 255, 0)).toBe('#00FF00');
      expect(rgbToHex(0, 0, 255)).toBe('#0000FF');
    });

    it('should handle decimal values', () => {
      expect(rgbToHex(255.9, 128.5, 64.1)).toBe('#FF8140'); // Math.round(128.5) = 129
    });

    it('should clamp values to valid range', () => {
      expect(rgbToHex(300, -10, 256)).toBe('#FF00FF');
    });
  });

  describe('isValidHexColor', () => {
    it('should validate correct hex colors', () => {
      expect(isValidHexColor('#FF0000')).toBe(true);
      expect(isValidHexColor('#F00')).toBe(true);
      expect(isValidHexColor('FF0000')).toBe(true);
      expect(isValidHexColor('F00')).toBe(true);
    });

    it('should reject invalid hex colors', () => {
      expect(isValidHexColor('#GGGGGG')).toBe(false);
      expect(isValidHexColor('invalid')).toBe(false);
      expect(isValidHexColor('')).toBe(false);
      expect(isValidHexColor('#FF00')).toBe(false); // Invalid length
    });
  });

  describe('getContrastColor', () => {
    it('should return white for dark colors', () => {
      expect(getContrastColor('#000000')).toBe('#FFFFFF');
      expect(getContrastColor('#333333')).toBe('#FFFFFF');
    });

    it('should return black for light colors', () => {
      expect(getContrastColor('#FFFFFF')).toBe('#000000');
      expect(getContrastColor('#FFFF00')).toBe('#000000');
    });

    it('should handle invalid colors gracefully', () => {
      expect(getContrastColor('invalid')).toBe('#000000');
    });
  });

  describe('generateColorVariants', () => {
    it('should generate color variants', () => {
      const variants = generateColorVariants('#FF0000');
      
      expect(variants).toHaveProperty('lighter');
      expect(variants).toHaveProperty('darker');
      expect(variants).toHaveProperty('muted');
      expect(variants).toHaveProperty('bright');
      
      // Check that variants are valid hex colors
      expect(isValidHexColor(variants.lighter)).toBe(true);
      expect(isValidHexColor(variants.darker)).toBe(true);
      expect(isValidHexColor(variants.muted)).toBe(true);
      expect(isValidHexColor(variants.bright)).toBe(true);
    });

    it('should handle edge cases', () => {
      // Test with white
      const whiteVariants = generateColorVariants('#FFFFFF');
      expect(isValidHexColor(whiteVariants.darker)).toBe(true);
      
      // Test with black
      const blackVariants = generateColorVariants('#000000');
      expect(isValidHexColor(blackVariants.lighter)).toBe(true);
    });

    it('should return default variants for invalid colors', () => {
      const variants = generateColorVariants('invalid');
      
      expect(variants).toHaveProperty('lighter');
      expect(variants).toHaveProperty('darker');
      expect(variants).toHaveProperty('muted');
      expect(variants).toHaveProperty('bright');
    });
  });
});