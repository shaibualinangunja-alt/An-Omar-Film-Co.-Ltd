import React, { useState } from 'react';
import { X, Sliders, Check } from 'lucide-react';
import { useProjectStore } from '../../state/projectStore';

export const ProjectModal: React.FC = () => {
  const [state, store] = useProjectStore();
  const proj = state.project.project;

  const [name, setName] = useState(proj.name);
  const [width, setWidth] = useState(proj.width);
  const [height, setHeight] = useState(proj.height);
  const [fps, setFps] = useState(proj.fps);

  if (!state.isProjectSettingsOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    store.executeProjectMutation('Update Project Settings', p => {
      p.project.name = name;
      p.project.width = Number(width);
      p.project.height = Number(height);
      p.project.fps = Number(fps);
      return p;
    });
    store.setState({ isProjectSettingsOpen: false });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm select-none">
      <div className="bg-freecut-panel border border-freecut-border rounded-lg shadow-2xl w-full max-w-md overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="p-3 border-b border-freecut-border flex items-center justify-between bg-freecut-darker">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-gray-200">Project Settings</h3>
          </div>
          <button
            onClick={() => store.setState({ isProjectSettingsOpen: false })}
            className="p-1 rounded hover:bg-freecut-panel text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="p-4 space-y-4">
          <div>
            <label className="text-gray-400 block mb-1 font-medium">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-freecut-darkest border border-freecut-border rounded px-3 py-1.5 text-gray-200 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-gray-400 block mb-1 font-medium">Resolution Preset</label>
              <select
                onChange={e => {
                  const [w, h] = e.target.value.split('x').map(Number);
                  setWidth(w);
                  setHeight(h);
                }}
                value={`${width}x${height}`}
                className="w-full bg-freecut-darkest border border-freecut-border rounded px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="1920x1080">1080p FHD (1920×1080)</option>
                <option value="1280x720">720p HD (1280×720)</option>
                <option value="3840x2160">4K UHD (3840×2160)</option>
                <option value="1080x1920">9:16 Vertical (1080×1920)</option>
              </select>
            </div>

            <div>
              <label className="text-gray-400 block mb-1 font-medium">Frame Rate (FPS)</label>
              <select
                value={fps}
                onChange={e => setFps(Number(e.target.value))}
                className="w-full bg-freecut-darkest border border-freecut-border rounded px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="24">24 fps (Cinematic)</option>
                <option value="25">25 fps (PAL)</option>
                <option value="30">30 fps (Standard)</option>
                <option value="60">60 fps (Smooth / High Frame Rate)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => store.setState({ isProjectSettingsOpen: false })}
              className="px-3 py-1.5 rounded bg-freecut-darker hover:bg-freecut-elevated border border-freecut-border text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-semibold shadow"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
