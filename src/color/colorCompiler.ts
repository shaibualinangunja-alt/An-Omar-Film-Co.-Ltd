/**
 * FreeCut Alpha 0.8 Color Export Compiler
 * Translates project color spaces, grading parameters, wheels, curves, and LUTs
 * into deterministic FFmpeg filter strings.
 */

import {
  ColorGradeSettings,
  ColorManagementSettings,
  CurvePoint,
} from './types';

export class ColorCompiler {
  /**
   * Compiles clip color grading parameters into an array of FFmpeg video filters
   */
  static compileGradingToFFmpeg(
    grade: ColorGradeSettings | undefined,
    colorMgmt?: ColorManagementSettings
  ): string[] {
    if (!grade || !grade.enabled) return [];

    const filters: string[] = [];
    const basic = grade.basic;
    const wheels = grade.wheels;

    // 1. Exposure, Brightness, Contrast, Saturation via FFmpeg 'eq'
    const expFactor = Math.pow(2, basic.exposure);
    const userBrightness = basic.brightness || 0;
    // Net brightness shift from exposure, explicit brightness, and tonal highlights/shadows/whites/blacks
    const brightness = (expFactor - 1.0) * 0.35 + userBrightness * 0.4 + basic.shadows * 0.10 + basic.highlights * 0.10 + basic.blacks * 0.08 + basic.whites * 0.08;
    const contrast = basic.contrast;
    const saturation = Math.max(0, basic.saturation * (1.0 + basic.vibrance * 0.25));

    const eqParams: string[] = [];
    if (Math.abs(contrast - 1.0) > 0.01) eqParams.push(`contrast=${contrast.toFixed(3)}`);
    if (Math.abs(brightness) > 0.005) eqParams.push(`brightness=${brightness.toFixed(3)}`);
    if (Math.abs(saturation - 1.0) > 0.01) eqParams.push(`saturation=${saturation.toFixed(3)}`);

    if (eqParams.length > 0) {
      filters.push(`eq=${eqParams.join(':')}`);
    }

    // 2. Color Balance (Wheels: Lift, Gamma, Gain, and White Balance)
    const tempShift = basic.temperature / 100.0;
    const tintShift = basic.tint / 100.0;

    const rs = (wheels.lift.r + wheels.lift.y) * 0.5;
    const gs = (wheels.lift.g + wheels.lift.y) * 0.5;
    const bs = (wheels.lift.b + wheels.lift.y) * 0.5;

    const rm = (wheels.gamma.r + wheels.gamma.y + tempShift * 0.2) * 0.5;
    const gm = (wheels.gamma.g + wheels.gamma.y - tintShift * 0.15) * 0.5;
    const bm = (wheels.gamma.b + wheels.gamma.y - tempShift * 0.2) * 0.5;

    const rh = (wheels.gain.r + wheels.gain.y + tempShift * 0.3) * 0.5;
    const gh = (wheels.gain.g + wheels.gain.y - tintShift * 0.2) * 0.5;
    const bh = (wheels.gain.b + wheels.gain.y - tempShift * 0.3) * 0.5;

    const hasBalance =
      Math.abs(rs) > 0.005 || Math.abs(gs) > 0.005 || Math.abs(bs) > 0.005 ||
      Math.abs(rm) > 0.005 || Math.abs(gm) > 0.005 || Math.abs(bm) > 0.005 ||
      Math.abs(rh) > 0.005 || Math.abs(gh) > 0.005 || Math.abs(bh) > 0.005;

    if (hasBalance) {
      const balanceParts = [
        `rs=${rs.toFixed(3)}`, `gs=${gs.toFixed(3)}`, `bs=${bs.toFixed(3)}`,
        `rm=${rm.toFixed(3)}`, `gm=${gm.toFixed(3)}`, `bm=${bm.toFixed(3)}`,
        `rh=${rh.toFixed(3)}`, `gh=${gh.toFixed(3)}`, `bh=${bh.toFixed(3)}`,
      ];
      filters.push(`colorbalance=${balanceParts.join(':')}`);
    }

    // 3. Curves Filter
    const curvesFilter = this.compileCurvesToFFmpeg(grade.curves);
    if (curvesFilter) {
      filters.push(curvesFilter);
    }

    // 4. 3D LUT
    if (grade.lut && grade.lut.enabled && grade.lut.lutPath) {
      // Clean path for ffmpeg filter
      const safePath = grade.lut.lutPath.replace(/\\/g, '/').replace(/:/g, '\\:');
      filters.push(`lut3d=file='${safePath}':interp=tetrahedral`);
    }

    // 5. Range & Color Space Transform
    if (colorMgmt) {
      const inRange = colorMgmt.colorRange === 'full' ? 'pc' : 'tv';
      const outRange = 'tv'; // Standard broadcast export range
      if (inRange !== outRange) {
        filters.push(`scale=in_range=${inRange}:out_range=${outRange}`);
      }
    }

    return filters;
  }

  /**
   * Compiles spline curves into FFmpeg 'curves' filter string
   */
  static compileCurvesToFFmpeg(curves: ColorGradeSettings['curves']): string | null {
    if (!curves) return null;

    const formatPoints = (pts: CurvePoint[]) => {
      return pts
        .map(p => `${Math.max(0, Math.min(1, p.x)).toFixed(3)}/${Math.max(0, Math.min(1, p.y)).toFixed(3)}`)
        .join(' ');
    };

    const isDefault = (pts: CurvePoint[]) => {
      if (pts.length !== 2) return false;
      return (
        Math.abs(pts[0].x - 0) < 0.01 &&
        Math.abs(pts[0].y - 0) < 0.01 &&
        Math.abs(pts[1].x - 1) < 0.01 &&
        Math.abs(pts[1].y - 1) < 0.01
      );
    };

    const hasCustomMaster = !isDefault(curves.master);
    const hasCustomRed = !isDefault(curves.red);
    const hasCustomGreen = !isDefault(curves.green);
    const hasCustomBlue = !isDefault(curves.blue);

    if (!hasCustomMaster && !hasCustomRed && !hasCustomGreen && !hasCustomBlue) {
      return null;
    }

    const curveArgs: string[] = [];
    if (hasCustomMaster) curveArgs.push(`m='${formatPoints(curves.master)}'`);
    if (hasCustomRed) curveArgs.push(`r='${formatPoints(curves.red)}'`);
    if (hasCustomGreen) curveArgs.push(`g='${formatPoints(curves.green)}'`);
    if (hasCustomBlue) curveArgs.push(`b='${formatPoints(curves.blue)}'`);

    return `curves=${curveArgs.join(':')}`;
  }

  static compileCurvesFilter(curves: ColorGradeSettings['curves']): string | null {
    return this.compileCurvesToFFmpeg(curves);
  }

  static compileColorSpaceTransform(colorMgmt: ColorManagementSettings): string[] {
    const filters: string[] = [];
    const inRange = colorMgmt.colorRange === 'full' ? 'pc' : 'tv';
    const outRange = colorMgmt.colorRange === 'full' ? 'full' : 'limited';
    filters.push(`scale=in_range=${inRange}:out_range=${outRange}`);
    return filters;
  }
}
