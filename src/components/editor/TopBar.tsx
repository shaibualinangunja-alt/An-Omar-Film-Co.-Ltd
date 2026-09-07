import React, { useState, useRef, useEffect } from 'react';
import { 
  Film, 
  Download, 
  RotateCcw, 
  RotateCw, 
  Sliders, 
  Settings, 
  FolderOpen, 
  Save, 
  Scissors, 
  Trash2,
  FilePlus,
  PlaySquare,
  Cpu
} from 'lucide-react';
import { useProjectStore } from '../../state/projectStore';
import { DesktopBridge } from '../../native/desktopBridge';
import { ProjectService } from '../../services/projectService';

export const TopBar: React.FC = () => {
  const [state, store] = useProjectStore(s => ({
    project: s.project,
    selectedClipIds: s.selectedClipIds,
    selectedClipId: s.selectedClipId,
    showSafeAreas: s.showSafeAreas,
    clipboard: s.clipboard,
  }));
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenu(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNewProject = () => {
    if (confirm('Create a new project? Any unsaved changes will be lost.')) {
      store.setProject(ProjectService.createDefaultProject('New Project'));
    }
    setActiveMenu(null);
  };

  const handleSaveProject = async () => {
    const data = ProjectService.serializeProject(state.project);
    const fileName = `${state.project.project.name || 'Untitled'}.freecut`;
    await DesktopBridge.saveProjectFile(data, fileName);
    store.setState({ statusMessage: `Project saved as ${fileName}` });
    setActiveMenu(null);
  };

  const handleOpenProject = async () => {
    const files = await DesktopBridge.selectFiles({
      multiple: false,
      filters: [{ name: 'FreeCut Project', extensions: ['freecut', 'json'] }]
    });

    if (files.length > 0) {
      try {
        const text = await DesktopBridge.readProjectFile(files[0]);
        const loaded = ProjectService.deserializeProject(text);
        const verified = await ProjectService.verifyMediaAvailability(loaded);
        store.setProject(verified);
        const missingCount = verified.media.filter(m => m.isMissing).length;
        if (missingCount > 0) {
          store.setState({ statusMessage: `Project loaded with ${missingCount} missing media file(s)` });
        }
      } catch (err) {
        alert('Could not open project: ' + (err instanceof Error ? err.message : String(err)));
      }
    }
    setActiveMenu(null);
  };

  return (
    <header className="h-12 bg-freecut-darker border-b border-freecut-border flex items-center justify-between px-3 select-none z-40 relative">
      {/* Brand & Tagline */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold tracking-wider text-base text-white">FREECUT</span>
              <span className="text-[10px] text-gray-400 font-medium tracking-normal">by ROMALABS</span>
              <span className="text-[9px] bg-cyan-950/80 text-cyan-400 font-semibold px-1.5 py-0.5 rounded border border-cyan-800/60">ALPHA 0.8</span>
            </div>
            <p className="text-[10px] text-gray-400 hidden md:block tracking-tight font-medium">Professional Editing. Zero Barriers.</p>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-freecut-border mx-1" />

        {/* Menu Bar */}
        <nav ref={menuRef} className="flex items-center space-x-1 text-xs">
          {/* File Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === 'file' ? null : 'file')}
              className={`px-2.5 py-1 rounded transition-colors ${activeMenu === 'file' ? 'bg-freecut-elevated text-cyan-400' : 'text-gray-300 hover:bg-freecut-panel'}`}
            >
              File
            </button>
            {activeMenu === 'file' && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-freecut-panel border border-freecut-border rounded-md shadow-2xl py-1 z-50">
                <button onClick={handleNewProject} className="w-full flex items-center px-3 py-1.5 hover:bg-freecut-elevated text-left space-x-2 text-gray-200">
                  <FilePlus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>New Project</span>
                </button>
                <button onClick={handleOpenProject} className="w-full flex items-center px-3 py-1.5 hover:bg-freecut-elevated text-left space-x-2 text-gray-200">
                  <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span>Open Project...</span>
                </button>
                <div className="h-[1px] bg-freecut-border my-1" />
                <button onClick={handleSaveProject} className="w-full flex items-center px-3 py-1.5 hover:bg-freecut-elevated text-left space-x-2 text-gray-200">
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Save Project (Ctrl+S)</span>
                </button>
              </div>
            )}
          </div>

          {/* Edit Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === 'edit' ? null : 'edit')}
              className={`px-2.5 py-1 rounded transition-colors ${activeMenu === 'edit' ? 'bg-freecut-elevated text-cyan-400' : 'text-gray-300 hover:bg-freecut-panel'}`}
            >
              Edit
            </button>
            {activeMenu === 'edit' && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-freecut-panel border border-freecut-border rounded-md shadow-2xl py-1 z-50">
                <button 
                  disabled={!store.canUndo()} 
                  onClick={() => { store.undo(); setActiveMenu(null); }} 
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-freecut-elevated text-left text-gray-200 disabled:opacity-40"
                >
                  <span className="flex items-center space-x-2"><RotateCcw className="w-3.5 h-3.5" /><span>Undo</span></span>
                  <span className="text-[10px] text-gray-500">Ctrl+Z</span>
                </button>
                <button 
                  disabled={!store.canRedo()} 
                  onClick={() => { store.redo(); setActiveMenu(null); }} 
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-freecut-elevated text-left text-gray-200 disabled:opacity-40"
                >
                  <span className="flex items-center space-x-2"><RotateCw className="w-3.5 h-3.5" /><span>Redo</span></span>
                  <span className="text-[10px] text-gray-500">Ctrl+Shift+Z</span>
                </button>
                <div className="h-[1px] bg-freecut-border my-1" />
                <button 
                  disabled={state.selectedClipIds.length === 0}
                  onClick={() => { store.copySelection(); setActiveMenu(null); }} 
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-freecut-elevated text-left text-gray-200 disabled:opacity-40"
                >
                  <span>Copy</span>
                  <span className="text-[10px] text-gray-500">Ctrl+C</span>
                </button>
                <button 
                  disabled={state.selectedClipIds.length === 0}
                  onClick={() => { store.cutSelection(); setActiveMenu(null); }} 
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-freecut-elevated text-left text-gray-200 disabled:opacity-40"
                >
                  <span>Cut</span>
                  <span className="text-[10px] text-gray-500">Ctrl+X</span>
                </button>
                <button 
                  disabled={state.clipboard.length === 0}
                  onClick={() => { store.pasteClipboard(); setActiveMenu(null); }} 
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-freecut-elevated text-left text-gray-200 disabled:opacity-40"
                >
                  <span>Paste</span>
                  <span className="text-[10px] text-gray-500">Ctrl+V</span>
                </button>
                <button 
                  disabled={state.selectedClipIds.length === 0}
                  onClick={() => { store.duplicateSelection(); setActiveMenu(null); }} 
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-freecut-elevated text-left text-gray-200 disabled:opacity-40"
                >
                  <span>Duplicate</span>
                  <span className="text-[10px] text-gray-500">Ctrl+D</span>
                </button>
                <div className="h-[1px] bg-freecut-border my-1" />
                <button 
                  onClick={() => { store.splitClipAtPlayhead(); setActiveMenu(null); }} 
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-freecut-elevated text-left text-gray-200"
                >
                  <span className="flex items-center space-x-2"><Scissors className="w-3.5 h-3.5 text-amber-400" /><span>Split Clip</span></span>
                  <span className="text-[10px] text-gray-500">S</span>
                </button>
                <button 
                  disabled={state.selectedClipIds.length === 0}
                  onClick={() => { store.deleteSelectedClips(); setActiveMenu(null); }} 
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-freecut-elevated text-left text-gray-200 disabled:opacity-40"
                >
                  <span className="flex items-center space-x-2"><Trash2 className="w-3.5 h-3.5 text-red-400" /><span>Delete Clip</span></span>
                  <span className="text-[10px] text-gray-500">Del</span>
                </button>
                <button 
                  disabled={state.selectedClipIds.length === 0}
                  onClick={() => { store.rippleDeleteSelectedClips(); setActiveMenu(null); }} 
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-freecut-elevated text-left text-cyan-300 disabled:opacity-40"
                >
                  <span>Ripple Delete</span>
                  <span className="text-[10px] text-gray-500">Shift+Del</span>
                </button>
              </div>
            )}
          </div>

          {/* Project Menu */}
          <div className="relative">
            <button
              onClick={() => setActiveMenu(activeMenu === 'project' ? null : 'project')}
              className={`px-2.5 py-1 rounded transition-colors ${activeMenu === 'project' ? 'bg-freecut-elevated text-cyan-400' : 'text-gray-300 hover:bg-freecut-panel'}`}
            >
              Project
            </button>
            {activeMenu === 'project' && (
              <div className="absolute top-full left-0 mt-1 w-52 bg-freecut-panel border border-freecut-border rounded-md shadow-2xl py-1 z-50">
                <button 
                  onClick={() => { store.setState({ isProjectSettingsOpen: true }); setActiveMenu(null); }} 
                  className="w-full flex items-center px-3 py-1.5 hover:bg-freecut-elevated text-left space-x-2 text-gray-200"
                >
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Project Settings...</span>
                </button>
              </div>
            )}
          </div>

          {/* Export Menu */}
          <div className="relative">
            <button
              onClick={() => { store.setState({ isExportModalOpen: true }); }}
              className="px-2.5 py-1 rounded transition-colors text-gray-300 hover:bg-freecut-panel"
            >
              Export
            </button>
          </div>
        </nav>
      </div>

      {/* Project Title and Quick Actions */}
      <div className="flex items-center space-x-3">
        <div className="hidden lg:flex items-center space-x-1 bg-freecut-panel px-3 py-1 rounded-md border border-freecut-border">
          <PlaySquare className="w-3.5 h-3.5 text-cyan-400 mr-1" />
          <span className="text-xs font-medium text-gray-200">{state.project.project.name}</span>
          <span className="text-[10px] text-gray-400 ml-1.5">
            ({state.project.project.width}x{state.project.project.height} @ {state.project.project.fps}fps)
          </span>
        </div>

        {/* Undo/Redo Buttons */}
        <div className="flex items-center space-x-1">
          <button
            title="Undo (Ctrl+Z)"
            disabled={!store.canUndo()}
            onClick={() => store.undo()}
            className="p-1.5 rounded hover:bg-freecut-panel text-gray-400 hover:text-gray-200 disabled:opacity-30"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            title="Redo (Ctrl+Shift+Z)"
            disabled={!store.canRedo()}
            onClick={() => store.redo()}
            className="p-1.5 rounded hover:bg-freecut-panel text-gray-400 hover:text-gray-200 disabled:opacity-30"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {/* Media Engine Diagnostic Button */}
        <button
          title="Media Engine Status (FFmpeg / FFprobe)"
          onClick={() => store.setState({ isMediaEngineModalOpen: true })}
          className="flex items-center space-x-1 px-2 py-1 rounded bg-freecut-panel hover:bg-freecut-elevated border border-freecut-border text-gray-300 hover:text-cyan-400 text-xs transition-colors"
        >
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline text-[11px] font-medium">Engine</span>
        </button>

        {/* AI Engine Button */}
        <button
          title="AI Model Manager"
          onClick={() => store.setState({ isAiModelManagerModalOpen: true })}
          className="flex items-center space-x-1 px-2 py-1 rounded bg-freecut-panel hover:bg-freecut-elevated border border-freecut-border text-gray-300 hover:text-cyan-400 text-xs transition-colors"
        >
          <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="hidden sm:inline text-[11px] font-medium">AI Models</span>
        </button>

        {/* Project Settings Button */}
        <button
          title="Project Settings"
          onClick={() => store.setState({ isProjectSettingsOpen: true })}
          className="p-1.5 rounded hover:bg-freecut-panel text-gray-400 hover:text-gray-200"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Export Button */}
        <button
          onClick={() => store.setState({ isExportModalOpen: true })}
          className="flex items-center space-x-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded shadow-md transition-all active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>
      </div>
    </header>
  );
};
