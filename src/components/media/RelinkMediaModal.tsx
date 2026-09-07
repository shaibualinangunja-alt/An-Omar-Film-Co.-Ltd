import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FolderSearch,
  FileVideo,
  FileAudio,
  FileImage,
  X,
  RefreshCw,
  Search,
  ArrowRight,
  FileCheck,
  AlertCircle,
} from 'lucide-react';
import { useProjectStore } from '../../state/projectStore';
import { DesktopBridge } from '../../native/desktopBridge';
import { MediaAsset } from '../../types/project';

interface RelinkMediaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CandidateMatch {
  mediaId: string;
  originalAsset: MediaAsset;
  replacementPathOrFile: string | File;
  replacementName: string;
  status: 'pending' | 'valid' | 'invalid';
  validationError?: string;
}

function getBasename(pathOrName: string): string {
  return pathOrName.replace(/\\/g, '/').split('/').pop()?.toLowerCase() || '';
}

export const RelinkMediaModal: React.FC<RelinkMediaModalProps> = ({ isOpen, onClose }) => {
  const [projectMedia, store] = useProjectStore((s) => s.project.media);
  const [candidateMatches, setCandidateMatches] = useState<Map<string, CandidateMatch>>(new Map());
  const [isSearching, setIsSearching] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const missingMedia = useMemo(() => {
    return projectMedia.filter((m) => m.isMissing);
  }, [projectMedia]);

  if (!isOpen) return null;

  const handleLocateSingle = async (mediaId: string) => {
    const asset = missingMedia.find((m) => m.id === mediaId);
    if (!asset) return;

    try {
      const selected = await DesktopBridge.selectFiles({
        multiple: false,
        title: `Locate Replacement for ${asset.name}`,
      });

      if (!selected || selected.length === 0) return;
      const fileOrPath = selected[0];
      const replacementName = typeof fileOrPath === 'string' ? getBasename(fileOrPath) : fileOrPath.name;

      setIsSearching(true);
      setFeedbackMessage(null);

      // Validate single match directly via relinkMedia
      const result = await store.relinkMedia(mediaId, fileOrPath);
      if (result.success) {
        setFeedbackMessage({
          type: 'success',
          text: `Successfully relinked ${asset.name} to ${replacementName}!`,
        });
        // Remove from candidate map if present
        setCandidateMatches((prev) => {
          const next = new Map(prev);
          next.delete(mediaId);
          return next;
        });
      } else {
        setFeedbackMessage({
          type: 'error',
          text: `Failed to relink ${asset.name}: ${result.error}`,
        });
      }
    } catch (err: unknown) {
      setFeedbackMessage({
        type: 'error',
        text: `Error selecting replacement file: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleBatchScanDirectory = async () => {
    setIsSearching(true);
    setFeedbackMessage(null);

    try {
      // Allow user to select a directory or multiple candidate files
      const result = await DesktopBridge.selectDirectory('Select Folder Containing Media Assets');
      
      let candidates: Array<{ pathOrFile: string | File; name: string }> = [];

      if (Array.isArray(result)) {
        candidates = result.map((item) => ({
          pathOrFile: item,
          name: typeof item === 'string' ? getBasename(item) : item.name.toLowerCase(),
        }));
      } else if (typeof result === 'string') {
        // Tauri returned folder path: probe or allow files selection fallback
        // For comprehensive desktop compatibility, prompt file selection in chosen folder or fallback
        const files = await DesktopBridge.selectFiles({
          multiple: true,
          title: `Select replacement files in ${result}`,
        });
        candidates = files.map((item) => ({
          pathOrFile: item,
          name: typeof item === 'string' ? getBasename(item) : item.name.toLowerCase(),
        }));
      } else {
        // Fallback to multiple file selection
        const files = await DesktopBridge.selectFiles({
          multiple: true,
          title: 'Select Replacement Media Files',
        });
        candidates = files.map((item) => ({
          pathOrFile: item,
          name: typeof item === 'string' ? getBasename(item) : item.name.toLowerCase(),
        }));
      }

      if (candidates.length === 0) {
        setIsSearching(false);
        return;
      }

      // Conservative exact basename matching
      const newMatches = new Map<string, CandidateMatch>();
      let matchCount = 0;

      for (const asset of missingMedia) {
        const targetBasename = getBasename(asset.name || asset.path);
        const match = candidates.find((c) => c.name === targetBasename);

        if (match) {
          newMatches.set(asset.id, {
            mediaId: asset.id,
            originalAsset: asset,
            replacementPathOrFile: match.pathOrFile,
            replacementName: typeof match.pathOrFile === 'string' ? match.pathOrFile : match.pathOrFile.name,
            status: 'pending',
          });
          matchCount++;
        }
      }

      setCandidateMatches(newMatches);

      if (matchCount > 0) {
        setFeedbackMessage({
          type: 'info',
          text: `Found ${matchCount} exact filename match(es). Review and click Apply Relink below.`,
        });
      } else {
        setFeedbackMessage({
          type: 'error',
          text: `No matching files found for the missing assets in the selected location.`,
        });
      }
    } catch (err: unknown) {
      setFeedbackMessage({
        type: 'error',
        text: `Error during search: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleApplyBatchRelink = async () => {
    if (candidateMatches.size === 0) return;

    setIsApplying(true);
    setFeedbackMessage(null);

    try {
      const matchArray = Array.from(candidateMatches.values()).map((m) => ({
        mediaId: m.mediaId,
        newPathOrFile: m.replacementPathOrFile,
      }));

      const result = await store.batchRelinkMedia(matchArray);

      if (result.matchedCount > 0) {
        setFeedbackMessage({
          type: 'success',
          text: `Successfully relinked ${result.matchedCount} media asset(s)!${
            result.failedCount > 0 ? ` (${result.failedCount} failed validation)` : ''
          }`,
        });

        // Update candidate states based on errors
        const errorIds = new Set(result.errors.map((e) => e.mediaId));
        setCandidateMatches((prev) => {
          const next = new Map(prev);
          for (const [id] of prev) {
            if (!errorIds.has(id)) {
              next.delete(id);
            } else {
              const err = result.errors.find((e) => e.mediaId === id);
              const existing = next.get(id)!;
              next.set(id, {
                ...existing,
                status: 'invalid',
                validationError: err?.error || 'Validation failed',
              });
            }
          }
          return next;
        });

        // If all missing assets are resolved, close after brief delay
        if (result.failedCount === 0 && missingMedia.length <= result.matchedCount) {
          setTimeout(() => {
            onClose();
          }, 1200);
        }
      } else {
        setFeedbackMessage({
          type: 'error',
          text: `Batch relink failed: ${result.errors.map((e) => e.error).join('; ')}`,
        });
      }
    } catch (err: unknown) {
      setFeedbackMessage({
        type: 'error',
        text: `Failed to apply batch relink: ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      setIsApplying(false);
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'audio':
        return <FileAudio className="w-4 h-4 text-emerald-400" />;
      case 'image':
        return <FileImage className="w-4 h-4 text-purple-400" />;
      default:
        return <FileVideo className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-freecut-dark border border-freecut-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden text-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-freecut-border bg-freecut-darker/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Relink Missing Media</h2>
              <p className="text-xs text-gray-400">
                {missingMedia.length === 0
                  ? 'All media files in this project are online and verified.'
                  : `${missingMedia.length} media file(s) are currently offline. Locate replacements below.`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-freecut-darker transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center space-x-2 border-b ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                : feedbackMessage.type === 'error'
                ? 'bg-red-950/40 text-red-300 border-red-800/40'
                : 'bg-cyan-950/40 text-cyan-300 border-cyan-800/40'
            }`}
          >
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : feedbackMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 flex-shrink-0 animate-spin" />
            )}
            <span className="truncate">{feedbackMessage.text}</span>
          </div>
        )}

        {/* Search & Actions Bar */}
        {missingMedia.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 bg-freecut-darker/30 border-b border-freecut-border">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBatchScanDirectory}
                disabled={isSearching || isApplying}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {isSearching ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FolderSearch className="w-3.5 h-3.5" />
                )}
                <span>Search Directory for Matches...</span>
              </button>
            </div>

            {candidateMatches.size > 0 && (
              <button
                onClick={handleApplyBatchRelink}
                disabled={isApplying}
                className="flex items-center space-x-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
              >
                {isApplying ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileCheck className="w-3.5 h-3.5" />
                )}
                <span>Apply Relink ({candidateMatches.size} files)</span>
              </button>
            )}
          </div>
        )}

        {/* Missing Files List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {missingMedia.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-400 mb-3 border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-white">All Media Online</h3>
              <p className="text-xs text-gray-400 max-w-sm mt-1">
                Every audio, video, and image asset referenced by this project is linked and accessible.
              </p>
            </div>
          ) : (
            missingMedia.map((asset) => {
              const match = candidateMatches.get(asset.id);

              return (
                <div
                  key={asset.id}
                  className={`p-3.5 rounded-lg border transition-colors flex items-center justify-between ${
                    match
                      ? match.status === 'invalid'
                        ? 'bg-red-950/20 border-red-800/40'
                        : 'bg-emerald-950/20 border-emerald-800/40'
                      : 'bg-freecut-darker/40 border-freecut-border hover:border-freecut-border/80'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1 pr-4">
                    <div className="p-2 rounded bg-freecut-dark border border-freecut-border flex-shrink-0">
                      {getMediaIcon(asset.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-white truncate">{asset.name}</span>
                        <span className="text-[10px] font-mono uppercase bg-red-900/40 text-red-300 border border-red-700/40 px-1.5 py-0.2 rounded">
                          Offline
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-mono truncate mt-0.5" title={asset.path}>
                        {asset.path}
                      </p>

                      {/* Candidate match feedback */}
                      {match && (
                        <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-white/5 text-xs">
                          <ArrowRight className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                          <span className="text-gray-400">Match:</span>
                          <span
                            className="font-mono text-cyan-300 truncate max-w-md font-medium"
                            title={match.replacementName}
                          >
                            {match.replacementName}
                          </span>
                          {match.status === 'invalid' && (
                            <span className="text-red-400 font-semibold text-[11px]">
                              ({match.validationError || 'Invalid'})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={() => handleLocateSingle(asset.id)}
                      disabled={isSearching || isApplying}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-freecut-dark hover:bg-freecut-darker text-gray-200 hover:text-white border border-freecut-border text-xs font-medium transition"
                    >
                      <Search className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Locate File...</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-freecut-border bg-freecut-darker/60">
          <p className="text-xs text-gray-400">
            Relinking updates source media paths while fully preserving timeline cuts, keyframes, effects, and audio grades.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-freecut-dark hover:bg-freecut-darker border border-freecut-border text-xs font-semibold text-gray-200 hover:text-white transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
