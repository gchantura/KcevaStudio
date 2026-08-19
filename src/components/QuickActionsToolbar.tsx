import React from 'react';
import { Plus, Copy, Layers, Mic, BookOpen } from 'lucide-react';

interface QuickActionsToolbarProps {
  onAddTrack?: () => void;
  onCopySteps?: () => void;
  onDuplicateSection?: () => void;
  onAddVocal?: () => void;
  onShowTutorial?: () => void;
}

export const QuickActionsToolbar: React.FC<QuickActionsToolbarProps> = ({
  onAddTrack,
  onCopySteps,
  onDuplicateSection,
  onAddVocal,
  onShowTutorial,
}) => {
  return (
    <div className="flex justify-center gap-4 py-2 bg-slate-900/80 border-b border-slate-800">
      <button
        onClick={onAddTrack}
        className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded"
        title="Add New Track (Line)"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm">Add Track</span>
      </button>
      <button
        onClick={onCopySteps}
        className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded"
        title="Copy Steps"
      >
        <Copy className="w-4 h-4" />
        <span className="text-sm">Copy Steps</span>
      </button>
      <button
        onClick={onDuplicateSection}
        className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-70 text-slate-200 rounded"
        title="Duplicate Section"
      >
        <Layers className="w-4 h-4" />
        <span className="text-sm">Duplicate</span>
      </button>
      <button
        onClick={onAddVocal}
        className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded"
        title="Add Vocal Track"
      >
        <Mic className="w-4 h-4" />
        <span className="text-sm">Add Vocal</span>
      </button>
      <button
        onClick={onShowTutorial}
        className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded"
        title="Show Tutorial"
      >
        <BookOpen className="w-4 h-4" />
        <span className="text-sm">Help</span>
      </button>
    </div>
  );
};
