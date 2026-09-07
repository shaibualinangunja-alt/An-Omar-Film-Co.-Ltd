/**
 * FreeCut Alpha 0.8 LUT Engine (.cube 3D LUT Parser and Trilinear Interpolator)
 * Supports technical and creative 3D LUTs with variable intensity and real-time canvas interpolation.
 */

export interface Parsed3DLUT {
  title: string;
  size: number;
  domainMin: [number, number, number];
  domainMax: [number, number, number];
  data: Float32Array; // Flattened [size * size * size * 3]
}

export class LUTService {
  private static parsedCache = new Map<string, Parsed3DLUT>();

  /**
   * Parses standard Adobe/Resolve .cube 3D LUT string
   */
  static parseCubeLUT(content: string): Parsed3DLUT {
    if (this.parsedCache.has(content)) {
      return this.parsedCache.get(content)!;
    }
    const lines = content.split(/\r?\n/);
    let title = 'Untitled LUT';
    let size = 0;
    let domainMin: [number, number, number] = [0.0, 0.0, 0.0];
    let domainMax: [number, number, number] = [1.0, 1.0, 1.0];
    const dataValues: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('#')) continue;

      if (line.startsWith('TITLE')) {
        const match = line.match(/TITLE\s+"?([^"]+)"?/i);
        if (match) title = match[1];
        continue;
      }

      if (line.startsWith('LUT_3D_SIZE')) {
        const parts = line.split(/\s+/);
        size = parseInt(parts[1], 10);
        continue;
      }

      if (line.startsWith('DOMAIN_MIN')) {
        const parts = line.split(/\s+/).slice(1).map(Number);
        if (parts.length >= 3) domainMin = [parts[0], parts[1], parts[2]];
        continue;
      }

      if (line.startsWith('DOMAIN_MAX')) {
        const parts = line.split(/\s+/).slice(1).map(Number);
        if (parts.length >= 3) domainMax = [parts[0], parts[1], parts[2]];
        continue;
      }

      // RGB Float values
      const rgb = line.split(/\s+/).map(Number);
      if (rgb.length >= 3 && !isNaN(rgb[0]) && !isNaN(rgb[1]) && !isNaN(rgb[2])) {
        dataValues.push(rgb[0], rgb[1], rgb[2]);
      }
    }

    if (size <= 0) {
      // Inferred size from count
      size = Math.round(Math.cbrt(dataValues.length / 3));
    }

    if (dataValues.length !== size * size * size * 3) {
      throw new Error(
        `Invalid .cube data: Expected ${size * size * size * 3} values for size ${size}, got ${dataValues.length}`
      );
    }

    const result: Parsed3DLUT = {
      title,
      size,
      domainMin,
      domainMax,
      data: new Float32Array(dataValues),
    };
    this.parsedCache.set(content, result);
    return result;
  }

  /**
   * Evaluates trilinear 3D interpolation on an RGB triplet with intensity mixing
   */
  static apply3DLUT(
    lut: Parsed3DLUT,
    r: number,
    g: number,
    b: number,
    intensity: number = 1.0
  ): [number, number, number] {
    if (intensity <= 0) return [r, g, b];

    const size = lut.size;
    const data = lut.data;

    // Normalize input to domain
    const normR = Math.max(0, Math.min(1, (r - lut.domainMin[0]) / (lut.domainMax[0] - lut.domainMin[0])));
    const normG = Math.max(0, Math.min(1, (g - lut.domainMin[1]) / (lut.domainMax[1] - lut.domainMin[1])));
    const normB = Math.max(0, Math.min(1, (b - lut.domainMin[2]) / (lut.domainMax[2] - lut.domainMin[2])));

    // Scale to lattice coordinates
    const scale = size - 1;
    const x = normR * scale;
    const y = normG * scale;
    const z = normB * scale;

    const x0 = Math.floor(x);
    const x1 = Math.min(size - 1, x0 + 1);
    const y0 = Math.floor(y);
    const y1 = Math.min(size - 1, y0 + 1);
    const z0 = Math.floor(z);
    const z1 = Math.min(size - 1, z0 + 1);

    const xd = x - x0;
    const yd = y - y0;
    const zd = z - z0;

    // Helper to sample RGB at lattice vertex [r, g, b] (standard order: r varies fastest)
    const sample = (xi: number, yi: number, zi: number): [number, number, number] => {
      const idx = (zi * size * size + yi * size + xi) * 3;
      return [data[idx], data[idx + 1], data[idx + 2]];
    };

    const c000 = sample(x0, y0, z0);
    const c100 = sample(x1, y0, z0);
    const c010 = sample(x0, y1, z0);
    const c110 = sample(x1, y1, z0);
    const c001 = sample(x0, y0, z1);
    const c101 = sample(x1, y0, z1);
    const c011 = sample(x0, y1, z1);
    const c111 = sample(x1, y1, z1);

    const out: [number, number, number] = [0, 0, 0];

    for (let c = 0; c < 3; c++) {
      // Interpolate along x
      const c00 = c000[c] * (1 - xd) + c100[c] * xd;
      const c01 = c001[c] * (1 - xd) + c101[c] * xd;
      const c10 = c010[c] * (1 - xd) + c110[c] * xd;
      const c11 = c011[c] * (1 - xd) + c111[c] * xd;

      // Interpolate along y
      const c0 = c00 * (1 - yd) + c10 * yd;
      const c1 = c01 * (1 - yd) + c11 * yd;

      // Interpolate along z
      const interpolated = c0 * (1 - zd) + c1 * zd;

      // Blend with original by intensity
      const orig = c === 0 ? r : c === 1 ? g : b;
      out[c] = orig * (1.0 - intensity) + interpolated * intensity;
    }

    return out;
  }

  /**
   * Generates a standard identity .cube LUT of arbitrary size
   */
  static generateIdentityCube(size: number = 17, title: string = 'FreeCut Identity'): string {
    const lines = [
      `# FreeCut Alpha 0.8 Generated 3D LUT`,
      `TITLE "${title}"`,
      `LUT_3D_SIZE ${size}`,
      `DOMAIN_MIN 0.0 0.0 0.0`,
      `DOMAIN_MAX 1.0 1.0 1.0`,
    ];

    const step = 1.0 / (size - 1);
    for (let b = 0; b < size; b++) {
      for (let g = 0; g < size; g++) {
        for (let r = 0; r < size; r++) {
          lines.push(`${(r * step).toFixed(6)} ${(g * step).toFixed(6)} ${(b * step).toFixed(6)}`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Generates an original creative film look LUT in .cube format
   */
  static generateFilmLookCube(size: number = 17): string {
    const lines = [
      `# FreeCut Alpha 0.8 Cinematic Film 3D LUT`,
      `TITLE "FreeCut Cinematic Film"`,
      `LUT_3D_SIZE ${size}`,
      `DOMAIN_MIN 0.0 0.0 0.0`,
      `DOMAIN_MAX 1.0 1.0 1.0`,
    ];

    const step = 1.0 / (size - 1);
    for (let b = 0; b < size; b++) {
      for (let g = 0; g < size; g++) {
        for (let r = 0; r < size; r++) {
          let red = r * step;
          let green = g * step;
          let blue = b * step;

          // Gentle S-curve contrast
          red = red * red * (3 - 2 * red);
          green = green * green * (3 - 2 * green);
          blue = blue * blue * (3 - 2 * blue);

          // Warm highlights, teal shadows
          red = Math.min(1.0, red * 1.08);
          blue = Math.max(0.0, blue * 0.95);
          if (blue < 0.3) blue += 0.04; // lifted cyan shadow

          lines.push(`${red.toFixed(6)} ${green.toFixed(6)} ${blue.toFixed(6)}`);
        }
      }
    }

    return lines.join('\n');
  }
}
