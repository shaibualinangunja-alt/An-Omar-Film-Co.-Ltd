/**
 * FreeCut Font Registry
 * Safe font abstraction layer. Supports system and web-safe typography without downloading unlicensed fonts.
 */

export interface FontDefinition {
  family: string;
  displayName: string;
  category: 'sans-serif' | 'serif' | 'monospace' | 'display';
}

export class FontRegistry {
  private static fonts: Map<string, FontDefinition> = new Map();

  static initialize(): void {
    if (this.fonts.size > 0) return;

    const defaultFonts: FontDefinition[] = [
      { family: 'Inter', displayName: 'Inter (Modern Sans)', category: 'sans-serif' },
      { family: 'Roboto', displayName: 'Roboto', category: 'sans-serif' },
      { family: 'Arial', displayName: 'Arial', category: 'sans-serif' },
      { family: 'Helvetica', displayName: 'Helvetica', category: 'sans-serif' },
      { family: 'Trebuchet MS', displayName: 'Trebuchet MS', category: 'sans-serif' },
      { family: 'Verdana', displayName: 'Verdana', category: 'sans-serif' },
      { family: 'Impact', displayName: 'Impact (Title)', category: 'display' },
      { family: 'Georgia', displayName: 'Georgia (Editorial Serif)', category: 'serif' },
      { family: 'Times New Roman', displayName: 'Times New Roman', category: 'serif' },
      { family: 'Courier New', displayName: 'Courier New (Code Monospace)', category: 'monospace' },
    ];

    defaultFonts.forEach(font => this.fonts.set(font.family.toLowerCase(), font));
  }

  static getAvailableFonts(): FontDefinition[] {
    this.initialize();
    return Array.from(this.fonts.values());
  }

  static registerFont(font: FontDefinition): void {
    this.initialize();
    this.fonts.set(font.family.toLowerCase(), font);
  }

  static isFontAvailable(family: string): boolean {
    this.initialize();
    return this.fonts.has(family.toLowerCase());
  }

  static getFontDisplayName(family: string): string {
    this.initialize();
    return this.fonts.get(family.toLowerCase())?.displayName || family;
  }
}
