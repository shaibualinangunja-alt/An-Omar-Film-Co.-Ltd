import React from 'react';
import { MediaLibrary } from '../media/MediaLibrary';
import { PreviewPanel } from '../preview/PreviewPanel';
import { InspectorPanel } from '../inspector/InspectorPanel';
import { TimelinePanel } from '../timeline/TimelinePanel';

export const EditorLayout: React.FC = () => {
  return (
    <main className="flex-1 flex flex-col overflow-hidden select-none">
      {/* Top Workspace (Media Library, Preview Monitor, Inspector) */}
      <div className="flex-1 flex overflow-hidden min-h-[300px]">
        {/* Left Panel: Media Library */}
        <section aria-label="Media Library" className="w-72 lg:w-80 h-full shrink-0 flex flex-col">
          <MediaLibrary />
        </section>

        {/* Center Panel: Video Preview Monitor */}
        <section aria-label="Program Monitor" className="flex-1 h-full min-w-[360px] flex flex-col">
          <PreviewPanel />
        </section>

        {/* Right Panel: Inspector / Properties */}
        <section aria-label="Clip Inspector" className="w-72 lg:w-80 h-full shrink-0 flex flex-col">
          <InspectorPanel />
        </section>
      </div>

      {/* Bottom Panel: Multi-track Timeline */}
      <section aria-label="Timeline" className="h-64 lg:h-72 shrink-0 flex flex-col">
        <TimelinePanel />
      </section>
    </main>
  );
};
