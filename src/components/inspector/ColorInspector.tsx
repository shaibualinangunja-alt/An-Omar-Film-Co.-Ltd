/**
 * FreeCut Alpha 0.8 Professional Color Inspector
 * Organizes Quick Grade, Basic Grading, 4 Color Wheels, Spline Curves,
 * HSL Secondary Qualifier, 3D LUT (.cube), and Color Space Management.
 */

import React, { useState } from 'react';
import { ClipItem } from '../../types/project';
import { useProjectStoreActions } from '../../state/projectStore';
import {
  DEFAULT_COLOR_GRADE,
  DEFAULT_COLOR_MANAGEMENT,
  StandardColorSpace,
  ColorRange,
} from '../../color/types';
import { QuickLooksRegistry } from '../../color/quickLooks';
import { ColorSpaceRegistry } from '../../color/colorSpaceRegistry';
import { LUTService } from '../../color/lutService';
import {
  Sparkles,
  Palette,
  RotateCcw,
} from 'lucide-react';

interface ColorInspectorProps {
  clip: ClipItem;
}

export const ColorInspector: React.FC<ColorInspectorProps> = ({ clip }) => {
  const store = useProjectStoreActions();

  const [activeSection, setActiveSection] = useState<'quick' | 'basic' | 'wheels' | 'curves' | 'hsl' | 'lut' | 'mgmt'>('quick');
  const [activeCurveChannel, setActiveCurveChannel] = useState<'master' | 'red' | 'green' | 'blue'>('master');

  const grade = clip.colorGrade || DEFAULT_COLOR_GRADE;
  const colorMgmt = clip.colorManagement || DEFAULT_COLOR_MANAGEMENT;

  const handleBasicChange = (field: keyof typeof grade.basic, val: number) => {
    store.updateClipBasicGrade(clip.id, { [field]: val });
  };

  const handleWheelChange = (
    wheel: 'lift' | 'gamma' | 'gain' | 'offset',
    field: 'r' | 'g' | 'b' | 'y',
    val: number
  ) => {
    const currentWheel = grade.wheels[wheel];
    store.updateClipColorWheels(clip.id, {
      [wheel]: { ...currentWheel, [field]: val },
    });
  };

  const handleAddCurvePoint = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));

    const currentPoints = [...grade.curves[activeCurveChannel]];
    // Don't add duplicate very close points
    if (currentPoints.some(p => Math.abs(p.x - x) < 0.05)) return;

    currentPoints.push({ x, y });
    currentPoints.sort((a, b) => a.x - b.x);

    store.updateClipCurves(clip.id, {
      [activeCurveChannel]: currentPoints,
    });
  };

  const handleLutUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const parsed = LUTService.parseCubeLUT(text);
        // Cache parsed in grading engine
        const fakePath = `user_lut_${Date.now()}_${file.name}`;
        (window as any).__freecut_lut_cache = (window as any).__freecut_lut_cache || new Map();
        (window as any).__freecut_lut_cache.set(fakePath, parsed);
        import('../../color/gradingEngine').then(({ GradingEngine }) => {
          GradingEngine.cacheParsedLut(fakePath, parsed);
        });

        store.updateClipLut(clip.id, {
          enabled: true,
          lutPath: fakePath,
          name: file.name,
          intensity: 1.0,
        });
      } catch (err) {
        alert('Could not parse .cube LUT: ' + (err instanceof Error ? err.message : String(err)));
      }
    };
    reader.readAsText(file);
  };

  return (
    <section className="space-y-3 bg-freecut-darkest p-3 rounded border border-freecut-border">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-freecut-border/80 pb-2">
        <div className="flex items-center space-x-2">
          <Palette className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-gray-200 text-[11px] uppercase tracking-wider">
            Color Grading
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-1 cursor-pointer">
            <input
              type="checkbox"
              checked={grade.enabled}
              onChange={e => store.updateClipColorGrade(clip.id, { enabled: e.target.checked })}
              className="accent-amber-400 rounded cursor-pointer"
            />
            <span className="text-[10px] text-gray-400">Enable</span>
          </label>

          <button
            onClick={() => store.resetClipColor(clip.id)}
            className="p-1 rounded text-gray-400 hover:text-amber-400 hover:bg-white/5 transition-colors"
            title="Reset All Color Grading"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Sub-section Navigation Tabs */}
      <div className="grid grid-cols-4 gap-1 text-[10px] font-medium">
        <button
          onClick={() => setActiveSection('quick')}
          className={`py-1 rounded border text-center transition-colors ${
            activeSection === 'quick'
              ? 'bg-amber-400/20 text-amber-400 border-amber-400/50'
              : 'bg-freecut-panel text-gray-400 border-freecut-border hover:text-gray-200'
          }`}
        >
          Quick
        </button>
        <button
          onClick={() => setActiveSection('basic')}
          className={`py-1 rounded border text-center transition-colors ${
            activeSection === 'basic'
              ? 'bg-amber-400/20 text-amber-400 border-amber-400/50'
              : 'bg-freecut-panel text-gray-400 border-freecut-border hover:text-gray-200'
          }`}
        >
          Basic
        </button>
        <button
          onClick={() => setActiveSection('wheels')}
          className={`py-1 rounded border text-center transition-colors ${
            activeSection === 'wheels'
              ? 'bg-amber-400/20 text-amber-400 border-amber-400/50'
              : 'bg-freecut-panel text-gray-400 border-freecut-border hover:text-gray-200'
          }`}
        >
          Wheels
        </button>
        <button
          onClick={() => setActiveSection('curves')}
          className={`py-1 rounded border text-center transition-colors ${
            activeSection === 'curves'
              ? 'bg-amber-400/20 text-amber-400 border-amber-400/50'
              : 'bg-freecut-panel text-gray-400 border-freecut-border hover:text-gray-200'
          }`}
        >
          Curves
        </button>
        <button
          onClick={() => setActiveSection('hsl')}
          className={`py-1 rounded border text-center transition-colors ${
            activeSection === 'hsl'
              ? 'bg-amber-400/20 text-amber-400 border-amber-400/50'
              : 'bg-freecut-panel text-gray-400 border-freecut-border hover:text-gray-200'
          }`}
        >
          HSL
        </button>
        <button
          onClick={() => setActiveSection('lut')}
          className={`py-1 rounded border text-center transition-colors ${
            activeSection === 'lut'
              ? 'bg-amber-400/20 text-amber-400 border-amber-400/50'
              : 'bg-freecut-panel text-gray-400 border-freecut-border hover:text-gray-200'
          }`}
        >
          LUT
        </button>
        <button
          onClick={() => setActiveSection('mgmt')}
          className={`col-span-2 py-1 rounded border text-center transition-colors ${
            activeSection === 'mgmt'
              ? 'bg-amber-400/20 text-amber-400 border-amber-400/50'
              : 'bg-freecut-panel text-gray-400 border-freecut-border hover:text-gray-200'
          }`}
        >
          Color Space
        </button>
      </div>

      {/* 1. QUICK GRADE */}
      {activeSection === 'quick' && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => store.applyAutoColor(clip.id)}
              className="flex-1 py-1.5 px-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold rounded flex items-center justify-center space-x-1.5 text-xs shadow"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto Color</span>
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] text-gray-400 font-semibold block">Quick Looks</label>
            <div className="grid grid-cols-3 gap-1.5">
              {QuickLooksRegistry.listLooks().map(look => (
                <button
                  key={look.id}
                  onClick={() => store.applyQuickLook(clip.id, look.id, grade.quickGrade.intensity)}
                  className={`p-1.5 rounded border text-left flex flex-col justify-between transition-all ${
                    grade.quickGrade.lookId === look.id
                      ? 'bg-amber-400/10 border-amber-400 text-gray-100 ring-1 ring-amber-400/30'
                      : 'bg-freecut-panel border-freecut-border text-gray-400 hover:text-gray-200 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center space-x-1 mb-1">
                    <span
                      style={{ backgroundColor: look.previewColor }}
                      className="w-2 h-2 rounded-full inline-block"
                    />
                    <span className="text-[10px] font-bold truncate">{look.name.split(' ')[0]}</span>
                  </div>
                  <span className="text-[8px] text-gray-500 line-clamp-1">{look.name}</span>
                </button>
              ))}
            </div>
          </div>

          {grade.quickGrade.lookId !== 'none' && (
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-[11px] text-gray-400">
                <span>Look Intensity</span>
                <span className="font-mono text-gray-200">
                  {Math.round(grade.quickGrade.intensity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={grade.quickGrade.intensity}
                onChange={e =>
                  store.applyQuickLook(clip.id, grade.quickGrade.lookId, Number(e.target.value))
                }
                className="w-full accent-amber-400 h-1 bg-freecut-panel rounded cursor-pointer"
              />
            </div>
          )}
        </div>
      )}

      {/* 2. BASIC CONTROLS */}
      {activeSection === 'basic' && (
        <div className="space-y-2.5 pt-1">
          {/* Exposure */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-gray-400">
              <span>Exposure</span>
              <span className="font-mono text-gray-200">{grade.basic.exposure.toFixed(2)} EV</span>
            </div>
            <input
              type="range"
              min="-4"
              max="4"
              step="0.05"
              value={grade.basic.exposure}
              onChange={e => handleBasicChange('exposure', Number(e.target.value))}
              className="w-full accent-amber-400 h-1 bg-freecut-panel rounded cursor-pointer"
            />
          </div>

          {/* Brightness */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-gray-400">
              <span>Brightness</span>
              <span className="font-mono text-gray-200">{(grade.basic.brightness || 0).toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.02"
              value={grade.basic.brightness || 0}
              onChange={e => handleBasicChange('brightness', Number(e.target.value))}
              className="w-full accent-amber-400 h-1 bg-freecut-panel rounded cursor-pointer"
            />
          </div>

          {/* Contrast */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-gray-400">
              <span>Contrast</span>
              <span className="font-mono text-gray-200">{grade.basic.contrast.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.02"
              value={grade.basic.contrast}
              onChange={e => handleBasicChange('contrast', Number(e.target.value))}
              className="w-full accent-amber-400 h-1 bg-freecut-panel rounded cursor-pointer"
            />
          </div>

          {/* Temperature */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-gray-400">
              <span>Temperature</span>
              <span className="font-mono text-gray-200">{grade.basic.temperature}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={grade.basic.temperature}
              onChange={e => handleBasicChange('temperature', Number(e.target.value))}
              className="w-full accent-orange-400 h-1 bg-freecut-panel rounded cursor-pointer"
            />
          </div>

          {/* Tint */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-gray-400">
              <span>Tint</span>
              <span className="font-mono text-gray-200">{grade.basic.tint}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={grade.basic.tint}
              onChange={e => handleBasicChange('tint', Number(e.target.value))}
              className="w-full accent-fuchsia-400 h-1 bg-freecut-panel rounded cursor-pointer"
            />
          </div>

          {/* Saturation */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-gray-400">
              <span>Saturation</span>
              <span className="font-mono text-gray-200">{Math.round(grade.basic.saturation * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.02"
              value={grade.basic.saturation}
              onChange={e => handleBasicChange('saturation', Number(e.target.value))}
              className="w-full accent-amber-400 h-1 bg-freecut-panel rounded cursor-pointer"
            />
          </div>

          {/* Vibrance */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-gray-400">
              <span>Vibrance</span>
              <span className="font-mono text-gray-200">{grade.basic.vibrance.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="-1"
              max="1"
              step="0.02"
              value={grade.basic.vibrance}
              onChange={e => handleBasicChange('vibrance', Number(e.target.value))}
              className="w-full accent-emerald-400 h-1 bg-freecut-panel rounded cursor-pointer"
            />
          </div>

          {/* Highlights / Shadows */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Highlights</span>
                <span className="font-mono">{grade.basic.highlights.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={grade.basic.highlights}
                onChange={e => handleBasicChange('highlights', Number(e.target.value))}
                className="w-full accent-amber-400 h-1 bg-freecut-panel rounded"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Shadows</span>
                <span className="font-mono">{grade.basic.shadows.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={grade.basic.shadows}
                onChange={e => handleBasicChange('shadows', Number(e.target.value))}
                className="w-full accent-amber-400 h-1 bg-freecut-panel rounded"
              />
            </div>
          </div>

          {/* Whites / Blacks */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Whites</span>
                <span className="font-mono">{grade.basic.whites.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={grade.basic.whites}
                onChange={e => handleBasicChange('whites', Number(e.target.value))}
                className="w-full accent-amber-400 h-1 bg-freecut-panel rounded cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Blacks</span>
                <span className="font-mono">{grade.basic.blacks.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="-1"
                max="1"
                step="0.05"
                value={grade.basic.blacks}
                onChange={e => handleBasicChange('blacks', Number(e.target.value))}
                className="w-full accent-amber-400 h-1 bg-freecut-panel rounded cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. COLOR WHEELS */}
      {activeSection === 'wheels' && (
        <div className="space-y-3 pt-1">
          {(['lift', 'gamma', 'gain', 'offset'] as const).map(w => {
            const wheelObj = grade.wheels[w];
            const title = w === 'lift' ? 'Lift (Shadows)' : w === 'gamma' ? 'Gamma (Midtones)' : w === 'gain' ? 'Gain (Highlights)' : 'Offset (Global)';
            return (
              <div key={w} className="bg-freecut-panel p-2 rounded border border-freecut-border space-y-1.5">
                <div className="flex justify-between text-[11px] font-semibold text-gray-300">
                  <span>{title}</span>
                  <span className="text-[10px] font-mono text-gray-400">
                    Y: {wheelObj.y.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-[9px]">
                  <div>
                    <span className="text-red-400 block mb-0.5">Red ({wheelObj.r.toFixed(2)})</span>
                    <input
                      type="range"
                      min="-0.5"
                      max="0.5"
                      step="0.01"
                      value={wheelObj.r}
                      onChange={e => handleWheelChange(w, 'r', Number(e.target.value))}
                      className="w-full accent-red-500 h-1 bg-freecut-darker rounded"
                    />
                  </div>
                  <div>
                    <span className="text-green-400 block mb-0.5">Green ({wheelObj.g.toFixed(2)})</span>
                    <input
                      type="range"
                      min="-0.5"
                      max="0.5"
                      step="0.01"
                      value={wheelObj.g}
                      onChange={e => handleWheelChange(w, 'g', Number(e.target.value))}
                      className="w-full accent-green-500 h-1 bg-freecut-darker rounded"
                    />
                  </div>
                  <div>
                    <span className="text-blue-400 block mb-0.5">Blue ({wheelObj.b.toFixed(2)})</span>
                    <input
                      type="range"
                      min="-0.5"
                      max="0.5"
                      step="0.01"
                      value={wheelObj.b}
                      onChange={e => handleWheelChange(w, 'b', Number(e.target.value))}
                      className="w-full accent-blue-500 h-1 bg-freecut-darker rounded"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. SPLINE CURVES */}
      {activeSection === 'curves' && (
        <div className="space-y-2 pt-1">
          {/* Channel Selector */}
          <div className="flex space-x-1">
            {(['master', 'red', 'green', 'blue'] as const).map(ch => (
              <button
                key={ch}
                onClick={() => setActiveCurveChannel(ch)}
                className={`flex-1 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                  activeCurveChannel === ch
                    ? ch === 'red'
                      ? 'bg-red-950 text-red-400 border border-red-800'
                      : ch === 'green'
                      ? 'bg-green-950 text-green-400 border border-green-800'
                      : ch === 'blue'
                      ? 'bg-blue-950 text-blue-400 border border-blue-800'
                      : 'bg-gray-200 text-black'
                    : 'bg-freecut-panel text-gray-400 hover:text-white'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>

          {/* Curve Interactive Graph */}
          <div className="relative w-full h-36 bg-black rounded border border-freecut-border overflow-hidden">
            <svg
              className="w-full h-full cursor-crosshair"
              onClick={handleAddCurvePoint}
            >
              {/* Grid lines */}
              <line x1="25%" y1="0" x2="25%" y2="100%" stroke="#1e293b" strokeWidth="1" />
              <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#1e293b" strokeWidth="1" />
              <line x1="75%" y1="0" x2="75%" y2="100%" stroke="#1e293b" strokeWidth="1" />
              <line x1="0" y1="25%" x2="100%" y2="25%" stroke="#1e293b" strokeWidth="1" />
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#1e293b" strokeWidth="1" />
              <line x1="0" y1="75%" x2="100%" y2="75%" stroke="#1e293b" strokeWidth="1" />

              {/* Diagonal base reference */}
              <line x1="0" y1="100%" x2="100%" y2="0" stroke="#334155" strokeDasharray="3,3" />

              {/* Spline polyline */}
              {(() => {
                const pts = grade.curves[activeCurveChannel];
                const sorted = [...pts].sort((a, b) => a.x - b.x);
                const polyPoints = sorted
                  .map(p => `${(p.x * 100).toFixed(1)}%,${((1 - p.y) * 100).toFixed(1)}%`)
                  .join(' ');

                const strokeColor =
                  activeCurveChannel === 'red'
                    ? '#ef4444'
                    : activeCurveChannel === 'green'
                    ? '#22c55e'
                    : activeCurveChannel === 'blue'
                    ? '#3b82f6'
                    : '#f8fafc';

                return (
                  <>
                    <polyline
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="2"
                      points={polyPoints}
                    />
                    {sorted.map((p, idx) => (
                      <circle
                        key={idx}
                        cx={`${p.x * 100}%`}
                        cy={`${(1 - p.y) * 100}%`}
                        r="4"
                        fill={strokeColor}
                        stroke="#000"
                        strokeWidth="1.5"
                      />
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>

          <div className="flex justify-between items-center text-[10px] text-gray-500">
            <span>Click graph to add control point</span>
            <button
              onClick={() => {
                store.updateClipCurves(clip.id, {
                  [activeCurveChannel]: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
                });
              }}
              className="text-amber-400 hover:underline"
            >
              Reset {activeCurveChannel}
            </button>
          </div>
        </div>
      )}

      {/* 5. HSL SECONDARY QUALIFIER */}
      {activeSection === 'hsl' && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={grade.hsl.enabled}
                onChange={e =>
                  store.updateClipHslQualifier(clip.id, { enabled: e.target.checked })
                }
                className="accent-amber-400 rounded"
              />
              <span className="text-[11px] font-semibold text-gray-300">Enable Qualifier</span>
            </label>
          </div>

          <div className="space-y-2">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>Hue Center ({grade.hsl.hueCenter}°)</span>
                <span>Width ({grade.hsl.hueWidth}°)</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={grade.hsl.hueCenter}
                onChange={e =>
                  store.updateClipHslQualifier(clip.id, { hueCenter: Number(e.target.value) })
                }
                className="w-full accent-amber-400 h-1 bg-freecut-panel rounded"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 block">Hue Shift</span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="1"
                  value={grade.hsl.hueShift}
                  onChange={e =>
                    store.updateClipHslQualifier(clip.id, { hueShift: Number(e.target.value) })
                  }
                  className="w-full accent-amber-400 h-1 bg-freecut-panel rounded"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400 block">Saturation Shift</span>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.05"
                  value={grade.hsl.satShift}
                  onChange={e =>
                    store.updateClipHslQualifier(clip.id, { satShift: Number(e.target.value) })
                  }
                  className="w-full accent-amber-400 h-1 bg-freecut-panel rounded"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. 3D LUT */}
      {activeSection === 'lut' && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-gray-300">3D LUT (.cube)</span>
            <label className="flex items-center space-x-1 cursor-pointer">
              <input
                type="checkbox"
                checked={grade.lut.enabled}
                onChange={e => store.updateClipLut(clip.id, { enabled: e.target.checked })}
                className="accent-amber-400 rounded"
              />
              <span className="text-[10px] text-gray-400">Apply</span>
            </label>
          </div>

          <div className="bg-freecut-panel p-2.5 rounded border border-freecut-border space-y-2">
            <div className="flex justify-between text-[11px]">
              <span className="text-gray-400">Current LUT:</span>
              <span className="text-gray-200 font-mono font-medium truncate max-w-[140px]">
                {grade.lut.name || 'None'}
              </span>
            </div>

            <label className="w-full py-1.5 px-3 bg-freecut-darker hover:bg-freecut-elevated border border-freecut-border rounded text-center block text-gray-300 cursor-pointer text-[11px] font-medium transition-colors">
              Browse .cube File...
              <input
                type="file"
                accept=".cube"
                onChange={handleLutUpload}
                className="hidden"
              />
            </label>
          </div>

          {grade.lut.lutPath && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-gray-400">
                <span>LUT Intensity</span>
                <span className="font-mono text-gray-200">
                  {Math.round(grade.lut.intensity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={grade.lut.intensity}
                onChange={e => store.updateClipLut(clip.id, { intensity: Number(e.target.value) })}
                className="w-full accent-amber-400 h-1 bg-freecut-panel rounded cursor-pointer"
              />
            </div>
          )}
        </div>
      )}

      {/* 7. COLOR MANAGEMENT */}
      {activeSection === 'mgmt' && (
        <div className="space-y-3 pt-1 text-[11px]">
          <div>
            <label className="text-gray-400 block mb-1 font-medium">Input Color Space</label>
            <select
              value={colorMgmt.inputColorSpace}
              onChange={e =>
                store.updateClipColorManagement(clip.id, {
                  inputColorSpace: e.target.value as StandardColorSpace,
                })
              }
              className="w-full bg-freecut-panel border border-freecut-border rounded px-2 py-1 text-gray-200"
            >
              {ColorSpaceRegistry.listColorSpaces().map(cs => (
                <option key={cs.id} value={cs.id}>
                  {cs.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-gray-400 block mb-1 font-medium">Color Range</label>
            <select
              value={colorMgmt.colorRange}
              onChange={e =>
                store.updateClipColorManagement(clip.id, {
                  colorRange: e.target.value as ColorRange,
                })
              }
              className="w-full bg-freecut-panel border border-freecut-border rounded px-2 py-1 text-gray-200"
            >
              <option value="limited">Limited / Video Range (16-235 TV)</option>
              <option value="full">Full / Data Range (0-255 PC)</option>
            </select>
          </div>
        </div>
      )}
    </section>
  );
};
