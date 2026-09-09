import React, { useState } from 'react';
import { Shuffle, Search, Plus, Check, Clock, Info } from 'lucide-react';
import { TransitionRegistry } from '../../transitions';
import { TransitionType } from '../../transitions/types';
import { useProjectStore } from '../../state/projectStore';

interface GroupedTransitions {
  id: 'basic' | 'slide' | 'push' | 'creative';
  title: string;
  types: TransitionType[];
}

const TRANSITION_GROUPS: GroupedTransitions[] = [
  {
    id: 'basic',
    title: 'Basic Dissolves',
    types: ['crossDissolve', 'fade', 'dipToBlack', 'dipToWhite', 'cut'],
  },
  {
    id: 'slide',
    title: 'Slides',
    types: ['slideLeft', 'slideRight', 'slideUp', 'slideDown'],
  },
  {
    id: 'push',
    title: 'Push Moves',
    types: ['pushLeft', 'pushRight', 'pushUp', 'pushDown'],
  },
  {
    id: 'creative',
    title: 'Creative & Dynamic',
    types: ['zoomIn', 'zoomOut', 'blur', 'flash', 'spin'],
  },
];

const TRANSITION_ANIMATION_HINTS: Record<TransitionType, string> = {
  crossDissolve: 'Smooth dual blend',
  fade: 'Through black overlay',
  dipToBlack: 'Dip smoothly to black',
  dipToWhite: 'High-energy white flash dip',
  cut: 'Instant hard scene cut',
  slideLeft: 'Slide leftwards over exit',
  slideRight: 'Slide rightwards over exit',
  slideUp: 'Slide upward reveal',
  slideDown: 'Slide downward reveal',
  pushLeft: 'Push outgoing frame left',
  pushRight: 'Push outgoing frame right',
  pushUp: 'Push outgoing frame up',
  pushDown: 'Push outgoing frame down',
  zoomIn: 'Dramatic focal zoom forward',
  zoomOut: 'Expanding field of view',
  blur: 'Gaussian lens defocussed dissolve',
  flash: '1-frame high-intensity flash',
  spin: 'Rotational 360 spin blend',
};

export const TransitionsBrowser: React.FC = () => {
  const [state, store] = useProjectStore(s => ({
    selectedClipIds: s.selectedClipIds,
    project: s.project,
  }));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [defaultDuration, setDefaultDuration] = useState<number>(1.0);
  const [feedbackType, setFeedbackType] = useState<string | null>(null);

  const allTransitions = TransitionRegistry.listTransitions();

  // Find candidate adjacent clips
  const candidateAdjacentClips = (() => {
    if (state.selectedClipIds.length === 2) {
      const c1 = state.project.clips.find(c => c.id === state.selectedClipIds[0]);
      const c2 = state.project.clips.find(c => c.id === state.selectedClipIds[1]);
      if (c1 && c2 && c1.trackId === c2.trackId) {
        const [first, second] = c1.startTime <= c2.startTime ? [c1, c2] : [c2, c1];
        const gap = Math.abs(second.startTime - (first.startTime + first.duration));
        if (gap < 0.2) return { from: first, to: second };
      }
    } else if (state.selectedClipIds.length === 1) {
      const c = state.project.clips.find(c => c.id === state.selectedClipIds[0]);
      if (c) {
        const next = state.project.clips.find(
          other => other.trackId === c.trackId && Math.abs(other.startTime - (c.startTime + c.duration)) < 0.2
        );
        if (next) return { from: c, to: next };
      }
    }
    return null;
  })();

  const handleApplyTransition = (type: TransitionType) => {
    if (!candidateAdjacentClips) {
      store.setState({
        statusMessage: 'Select two adjacent clips on the same timeline track to apply a transition.',
      });
      return;
    }

    store.addTransition(type, candidateAdjacentClips.from.id, candidateAdjacentClips.to.id, defaultDuration);
    const transName = TransitionRegistry.getTransition(type)?.name || type;
    store.setState({
      statusMessage: `Applied transition "${transName}" between ${candidateAdjacentClips.from.name} and ${candidateAdjacentClips.to.name}`,
    });
    setFeedbackType(type);
    setTimeout(() => setFeedbackType(null), 1500);
  };

  const handleDragStart = (e: React.DragEvent, type: TransitionType) => {
    e.dataTransfer.setData('application/freecut-transition-type', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const filteredTransitions = allTransitions.filter(tr => {
    const matchesSearch =
      tr.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tr.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (selectedGroup === 'all') return true;

    const group = TRANSITION_GROUPS.find(g => g.id === selectedGroup);
    return group ? group.types.includes(tr.type) : true;
  });

  return (
    <div className="h-full flex flex-col bg-freecut-darker border-r border-freecut-border select-none text-xs">
      {/* Header */}
      <div className="p-3 border-b border-freecut-border flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded bg-amber-500/20 flex items-center justify-center text-amber-400">
            <Shuffle className="w-3.5 h-3.5" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-200">Transitions</h2>
            <p className="text-[10px] text-gray-500">Crossfades, cuts, slides & wipes</p>
          </div>
        </div>
        <span className="text-[10px] text-gray-500 bg-freecut-darkest px-2 py-0.5 rounded border border-freecut-border">
          {allTransitions.length} Transitions
        </span>
      </div>

      {/* Target Cut Status Hint */}
      <div className="px-3 py-2 bg-freecut-darkest/70 border-b border-freecut-border flex items-center justify-between">
        <span className="text-[11px] text-gray-400 truncate max-w-[200px]">
          Target Cut:{' '}
          {candidateAdjacentClips ? (
            <span className="text-amber-300 font-semibold truncate">
              {candidateAdjacentClips.from.name} ➔ {candidateAdjacentClips.to.name}
            </span>
          ) : (
            <span className="text-gray-500 italic">Select 2 adjacent clips</span>
          )}
        </span>

        {candidateAdjacentClips ? (
          <span className="text-[9px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/40 px-1.5 py-0.5 rounded shrink-0">
            Ready to Apply
          </span>
        ) : (
          <span className="text-[9px] bg-amber-950/80 text-amber-300 border border-amber-800/40 px-1.5 py-0.5 rounded shrink-0">
            Select cut
          </span>
        )}
      </div>

      {/* Duration Selector */}
      <div className="px-3 py-1.5 bg-freecut-darkest border-b border-freecut-border flex items-center justify-between text-[11px] text-gray-400">
        <div className="flex items-center space-x-1">
          <Clock className="w-3 h-3 text-amber-400" />
          <span>Default Duration:</span>
        </div>
        <div className="flex items-center space-x-1.5">
          {[0.5, 1.0, 1.5, 2.0].map(dur => (
            <button
              key={dur}
              onClick={() => setDefaultDuration(dur)}
              className={`px-1.5 py-0.5 rounded font-mono text-[10px] transition-colors ${
                defaultDuration === dur
                  ? 'bg-amber-400 text-black font-bold shadow-sm'
                  : 'bg-freecut-panel text-gray-400 hover:text-gray-200'
              }`}
            >
              {dur.toFixed(1)}s
            </button>
          ))}
        </div>
      </div>

      {/* Group Navigation */}
      <div className="flex border-b border-freecut-border bg-freecut-darkest px-2 pt-1 gap-1">
        <button
          onClick={() => setSelectedGroup('all')}
          className={`px-2.5 py-1 text-[11px] font-medium border-b-2 transition-colors ${
            selectedGroup === 'all'
              ? 'border-amber-400 text-amber-300 bg-freecut-panel/40'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          All
        </button>
        {TRANSITION_GROUPS.map(group => (
          <button
            key={group.id}
            onClick={() => setSelectedGroup(group.id)}
            className={`px-2 py-1 text-[11px] font-medium border-b-2 transition-colors ${
              selectedGroup === group.id
                ? 'border-amber-400 text-amber-300 bg-freecut-panel/40'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {group.title}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="p-2 border-b border-freecut-border">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search transitions..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-freecut-darkest border border-freecut-border rounded px-2 pl-8 py-1 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Transitions Grid */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          {filteredTransitions.map(tr => {
            const isJustAdded = feedbackType === tr.type;
            const animHint = TRANSITION_ANIMATION_HINTS[tr.type] || 'Smooth transition';

            return (
              <div
                key={tr.type}
                draggable
                onDragStart={e => handleDragStart(e, tr.type)}
                className="group relative bg-freecut-panel border border-freecut-border hover:border-amber-400/60 rounded-lg p-2.5 flex flex-col justify-between cursor-grab active:cursor-grabbing transition-all hover:shadow-lg hover:shadow-amber-950/20"
              >
                {/* Visual Representation Graphic */}
                <div className="w-full aspect-[16/10] rounded bg-gradient-to-tr from-amber-950/40 via-orange-950/30 to-yellow-950/40 border border-white/5 relative overflow-hidden flex items-center justify-center mb-2">
                  <div className="flex items-center space-x-2 text-gray-300 group-hover:scale-105 transition-transform">
                    <div className="w-6 h-6 rounded bg-cyan-900/60 border border-cyan-500/40 flex items-center justify-center text-[10px] font-bold text-cyan-200">
                      A
                    </div>
                    <Shuffle className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-180 transition-transform duration-500" />
                    <div className="w-6 h-6 rounded bg-blue-900/60 border border-blue-500/40 flex items-center justify-center text-[10px] font-bold text-blue-200">
                      B
                    </div>
                  </div>
                  <span className="absolute bottom-1 right-1 text-[8px] text-gray-400 font-mono">
                    {defaultDuration.toFixed(1)}s
                  </span>
                </div>

                {/* Transition Info */}
                <div className="space-y-0.5 mb-2">
                  <h3 className="font-semibold text-gray-200 text-xs truncate group-hover:text-amber-300 transition-colors">
                    {tr.name}
                  </h3>
                  <p className="text-[10px] text-gray-400 line-clamp-2 leading-tight">
                    {animHint}
                  </p>
                </div>

                {/* Apply Action Button */}
                <button
                  onClick={() => handleApplyTransition(tr.type)}
                  className={`w-full py-1 px-2 rounded text-[11px] font-semibold flex items-center justify-center space-x-1 transition-all ${
                    isJustAdded
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : candidateAdjacentClips
                      ? 'bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/40'
                      : 'bg-freecut-darkest text-gray-500 hover:text-gray-300 border border-freecut-border'
                  }`}
                  title={candidateAdjacentClips ? `Apply ${tr.name} between selected clips` : 'Select two adjacent clips on the timeline'}
                >
                  {isJustAdded ? (
                    <>
                      <Check className="w-3 h-3 text-white" />
                      <span>Applied!</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      <span>Apply to Cut</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {filteredTransitions.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-xs">
            No transitions match "{searchQuery}"
          </div>
        )}

        {/* Workflow Tip */}
        <div className="mt-4 p-2.5 rounded bg-freecut-darkest border border-freecut-border/60 text-[10px] text-gray-400 space-y-1">
          <div className="flex items-center space-x-1 text-amber-400 font-semibold">
            <Info className="w-3 h-3" />
            <span>Workflow Tip:</span>
          </div>
          <p>
            Place two clips touching on the same track, click either clip, then click <strong className="text-gray-200">Apply to Cut</strong> or drag a transition onto the boundary.
          </p>
        </div>
      </div>
    </div>
  );
};
