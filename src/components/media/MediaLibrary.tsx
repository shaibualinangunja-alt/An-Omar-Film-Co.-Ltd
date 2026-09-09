import React, { useState } from 'react';
import { Upload, Film, Music, Image as ImageIcon, Search, FolderDown, AlertTriangle } from 'lucide-react';
import { useProjectStore } from '../../state/projectStore';
import { DesktopBridge } from '../../native/desktopBridge';
import { MediaService } from '../../services/mediaService';
import { MediaItemCard } from './MediaItemCard';

export const MediaLibrary: React.FC = () => {
  const [media, store] = useProjectStore(s => s.project.media);
  const [activeTab, setActiveTab] = useState<'all' | 'video' | 'audio' | 'image'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const missingCount = media.filter(m => m.isMissing).length;

  const handleImportFiles = async () => {
    setIsImporting(true);
    try {
      const files = await DesktopBridge.selectFiles({
        multiple: true,
        title: 'Import Media (Video, Audio, Images)',
        filters: [
          {
            name: 'Media Files',
            extensions: ['mp4', 'mov', 'webm', 'avi', 'mkv', 'mp3', 'wav', 'aac', 'jpg', 'jpeg', 'png', 'webp'],
          },
        ],
      });

      for (const item of files) {
        if (typeof item === 'string') {
          await handleLoadWorkspaceSample(item);
        } else if (item instanceof File) {
          const asset = await MediaService.probeMediaFile(item);
          store.addMedia(asset);
        }
      }
    } catch (err) {
      console.error('Failed to import files:', err);
    } finally {
      setIsImporting(false);
    }
  };

  const handleLoadWorkspaceSample = async (filePath: string, customName?: string) => {
    setIsImporting(true);
    try {
      const asset = await MediaService.probeLocalFile(filePath, customName);
      store.addMedia(asset);
    } catch (err) {
      console.error('Failed to load sample:', err);
      alert('Could not probe test media: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsImporting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setIsImporting(true);
      try {
        const supportedExts = new Set(['mp4', 'mov', 'webm', 'avi', 'mkv', 'mp3', 'wav', 'aac', 'ogg', 'jpg', 'jpeg', 'png', 'webp']);
        let importedCount = 0;
        let rejectedCount = 0;

        for (let i = 0; i < e.dataTransfer.files.length; i++) {
          const file = e.dataTransfer.files[i];
          const ext = file.name.split('.').pop()?.toLowerCase() || '';
          if (supportedExts.has(ext)) {
            try {
              const asset = await MediaService.probeMediaFile(file);
              store.addMedia(asset);
              importedCount++;
            } catch (err) {
              console.error(`Failed to probe ${file.name}:`, err);
            }
          } else {
            rejectedCount++;
          }
        }

        if (rejectedCount > 0) {
          store.setState({
            statusMessage: `Imported ${importedCount} file(s). Skipped ${rejectedCount} unsupported file(s).`,
          });
        } else if (importedCount > 0) {
          store.setState({
            statusMessage: `Successfully imported ${importedCount} media file(s)`,
          });
        }
      } catch (err) {
        console.error('Drop import error:', err);
      } finally {
        setIsImporting(false);
      }
    }
  };

  const handleAddToTimeline = (mediaId: string) => {
    const asset = media.find(m => m.id === mediaId);
    if (!asset) return;

    const trackId = asset.type === 'audio' ? 'track_a1' : 'track_v1';
    store.addClipToTimeline(mediaId, trackId, store.getState().currentTime);
  };

  const filteredMedia = media.filter(m => {
    const matchesTab = activeTab === 'all' || m.type === activeTab;
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="h-full flex flex-col bg-freecut-darker border-r border-freecut-border select-none">
      {/* Panel Header */}
      <div className="p-3 border-b border-freecut-border flex items-center justify-between">
        <div className="flex items-center space-x-1.5">
          <Film className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300">Media Library</h2>
        </div>
        <div className="flex items-center space-x-1.5">
          <button
            onClick={handleImportFiles}
            disabled={isImporting}
            className="flex items-center space-x-1 bg-freecut-elevated hover:bg-freecut-border text-cyan-400 hover:text-cyan-300 px-2.5 py-1 rounded text-xs font-medium transition-colors border border-cyan-500/20"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isImporting ? 'Probing...' : 'Import'}</span>
          </button>
        </div>
      </div>

      {/* Offline Media Warning Banner */}
      {missingCount > 0 && (
        <div className="bg-amber-950/40 border-b border-amber-800/40 px-3 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 min-w-0 pr-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-amber-200 font-medium truncate">
              {missingCount} {missingCount === 1 ? 'file is' : 'files are'} offline
            </span>
          </div>
          <button
            onClick={() => store.setState({ isRelinkModalOpen: true })}
            className="flex-shrink-0 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 px-2 py-0.5 rounded text-[11px] font-semibold transition cursor-pointer"
          >
            Relink Media
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-freecut-border bg-freecut-darkest px-2 pt-1">
        {[
          { id: 'all', label: 'All Media' },
          { id: 'video', label: 'Video', icon: Film },
          { id: 'audio', label: 'Audio', icon: Music },
          { id: 'image', label: 'Images', icon: ImageIcon },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-medium border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-cyan-400 text-cyan-400 bg-freecut-panel/50'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.icon && <tab.icon className="w-3 h-3" />}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Search Bar & Fast Sample Importer */}
      <div className="p-2 border-b border-freecut-border space-y-1.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search media..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-freecut-darkest border border-freecut-border rounded px-2 pl-8 py-1 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Real Test Media Quick-Load Links */}
        <div className="flex items-center space-x-1 text-[10px]">
          <span className="text-gray-500 font-medium">Real Samples:</span>
          <button
            onClick={() => handleLoadWorkspaceSample('C:/Users/Administrator/.antigravity-ide/An-Omar-Film-Co.-Ltd/test-media/sample-video.mp4', 'sample-video.mp4')}
            className="px-1.5 py-0.5 bg-freecut-panel hover:bg-freecut-elevated text-cyan-400 rounded border border-freecut-border truncate"
            title="Import real 24fps 864x496 video"
          >
            Sample Video (8.08s)
          </button>
          <button
            onClick={() => handleLoadWorkspaceSample('C:/Users/Administrator/.antigravity-ide/An-Omar-Film-Co.-Ltd/test-media/sample-with-audio.mp4', 'sample-with-audio.mp4')}
            className="px-1.5 py-0.5 bg-freecut-panel hover:bg-freecut-elevated text-emerald-400 rounded border border-freecut-border truncate"
            title="Import real 1080p 30fps video with AAC stereo audio"
          >
            Video + Audio (10.12s)
          </button>
        </div>
      </div>

      {/* Media Grid / Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="flex-1 p-3 overflow-y-auto relative"
      >
        {/* Active Explorer Drag-over Dropzone Overlay */}
        {isDraggingOver && (
          <div className="absolute inset-2 z-30 bg-cyan-950/90 border-2 border-dashed border-cyan-400 rounded-lg flex flex-col items-center justify-center pointer-events-none shadow-2xl backdrop-blur-sm">
            <Upload className="w-10 h-10 text-cyan-400 mb-2 animate-bounce" />
            <span className="text-sm font-bold text-cyan-200">Drop Files to Import</span>
            <span className="text-xs text-cyan-400/80 mt-1">Video • Audio • Images</span>
          </div>
        )}

        {filteredMedia.length > 0 ? (
          <div className="grid grid-cols-2 gap-2.5">
            {filteredMedia.map(media => (
              <MediaItemCard
                key={media.id}
                media={media}
                onAddToTimeline={handleAddToTimeline}
                onDeleteMedia={id => store.removeMedia(id)}
              />
            ))}
          </div>
        ) : (
          <div
            onClick={handleImportFiles}
            className="h-full min-h-[240px] flex flex-col items-center justify-center border-2 border-dashed border-freecut-border/80 hover:border-cyan-500/60 rounded-lg p-6 text-center cursor-pointer transition-all group bg-freecut-panel/20 hover:bg-freecut-panel/40"
          >
            <div className="w-14 h-14 rounded-full bg-freecut-panel border border-freecut-border flex items-center justify-center text-cyan-400 group-hover:scale-110 group-hover:border-cyan-400/50 transition-all mb-3 shadow-lg">
              <FolderDown className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-gray-200 mb-1">Drag & Drop Media Here</h3>
            <p className="text-xs text-gray-400 max-w-[220px] mb-3">
              Drag videos, photos or audio directly into this panel
            </p>
            <span className="text-[11px] text-gray-500 mb-3">— or —</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleImportFiles();
              }}
              className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded text-xs shadow-md transition-all active:scale-95 flex items-center space-x-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Media</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
