import React, { useEffect } from 'react';
import { TopBar } from './components/editor/TopBar';
import { EditorLayout } from './components/editor/EditorLayout';
import { StatusBar } from './components/editor/StatusBar';
import { ProjectModal } from './components/project/ProjectModal';
import { ExportModal } from './components/export/ExportModal';
import { MediaEngineStatusModal } from './components/editor/MediaEngineStatusModal';
import { projectStore, useProjectStore } from './state/projectStore';
import { DesktopBridge } from './native/desktopBridge';
import { ProjectService } from './services/projectService';
import { ModelManagerModal } from './components/ai/ModelManagerModal';
import { RelinkMediaModal } from './components/media/RelinkMediaModal';

export const App: React.FC = () => {
  const [state, store] = useProjectStore();

  // Media Engine Diagnostic on boot
  useEffect(() => {
    DesktopBridge.getMediaEngineStatus().then(engineStatus => {
      if (engineStatus.ffmpegAvailable && engineStatus.ffprobeAvailable) {
        store.setState({ statusMessage: 'Engine Ready (FFmpeg & FFprobe 8.1.1)' });
      } else {
        store.setState({ statusMessage: 'Media Engine: FFmpeg Not Found' });
      }
    });
  }, [store]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input or textarea
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      // Space = Play/Pause
      if (e.code === 'Space') {
        e.preventDefault();
        projectStore.togglePlayPause();
        return;
      }

      // S = Split Clip
      if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        projectStore.splitClipAtPlayhead();
        return;
      }

      // Shift+Delete = Ripple Delete
      if (e.shiftKey && (e.code === 'Delete' || e.code === 'Backspace')) {
        e.preventDefault();
        projectStore.rippleDeleteSelectedClips();
        return;
      }

      // Delete or Backspace = Normal Delete (preserves gaps)
      if (e.code === 'Delete' || e.code === 'Backspace') {
        e.preventDefault();
        projectStore.deleteSelectedClips();
        return;
      }

      // Home = Timeline start
      if (e.code === 'Home') {
        e.preventDefault();
        projectStore.jumpToStart();
        return;
      }

      // End = Timeline end
      if (e.code === 'End') {
        e.preventDefault();
        projectStore.jumpToEnd();
        return;
      }

      // Ctrl+C = Copy
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') {
        e.preventDefault();
        projectStore.copySelection();
        return;
      }

      // Ctrl+X = Cut
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyX') {
        e.preventDefault();
        projectStore.cutSelection();
        return;
      }

      // Ctrl+V = Paste
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
        e.preventDefault();
        projectStore.pasteClipboard();
        return;
      }

      // Ctrl+D = Duplicate
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD') {
        e.preventDefault();
        projectStore.duplicateSelection();
        return;
      }

      // Ctrl+A = Select All Clips
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyA') {
        e.preventDefault();
        projectStore.selectAllClips();
        return;
      }

      // ArrowLeft = Previous Frame, ArrowRight = Next Frame
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        projectStore.stepFrames(-1);
        return;
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        projectStore.stepFrames(1);
        return;
      }

      // Ctrl+Z = Undo, Ctrl+Shift+Z = Redo
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        if (e.shiftKey) {
          projectStore.redo();
        } else {
          projectStore.undo();
        }
        return;
      }

      // Ctrl+S = Save
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
        const state = projectStore.getState();
        const data = ProjectService.serializeProject(state.project);
        const fileName = `${state.project.project.name || 'Untitled'}.freecut`;
        await DesktopBridge.saveProjectFile(data, fileName);
        projectStore.setState({ statusMessage: `Saved: ${fileName}` });
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-freecut-darkest text-gray-100 overflow-hidden select-none font-sans">
      {/* Top Application Bar */}
      <TopBar />

      {/* Main Multi-Panel Workspace */}
      <EditorLayout />

      {/* Bottom Status Bar */}
      <StatusBar />

      {/* Modals */}
      <ProjectModal />
      <ExportModal />
      <MediaEngineStatusModal
        isOpen={state.isMediaEngineModalOpen}
        onClose={() => store.setState({ isMediaEngineModalOpen: false })}
      />
      {state.isAiModelManagerModalOpen && (
        <ModelManagerModal isOpen={state.isAiModelManagerModalOpen} onClose={() => store.setState({ isAiModelManagerModalOpen: false })} />
      )}
      <RelinkMediaModal
        isOpen={state.isRelinkModalOpen}
        onClose={() => store.setState({ isRelinkModalOpen: false })}
      />
    </div>
  );
};

export default App;
