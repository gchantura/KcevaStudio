import { useRef, ChangeEvent } from 'react';
import { MusicComposition } from '../types';
import { SONG_PRESETS } from '../audio/songPresets';
import { Play, Sparkles, Music, Radio, Disc3, ArrowRight, Upload, FolderOpen } from 'lucide-react';

interface PresetLibraryProps {
  currentCompositionId: string;
  onSelectComposition: (comp: MusicComposition) => void;
}

export function PresetLibrary({ currentCompositionId, onSelectComposition }: PresetLibraryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.melodySequence && parsed.bassSequence) {
          onSelectComposition(parsed);
        } else {
          alert('Invalid project format. Ensure the file contains a valid music composition schema.');
        }
      } catch (err) {
        alert('Failed to parse JSON project file.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div id="presets-library" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between bg-slate-900/90 p-4 rounded-xl border border-slate-800 gap-4">
        <div>
          <h2 className="text-base font-bold text-white">Genre Presets & Master Compositions</h2>
          <p className="text-xs text-slate-400">
            Hand-crafted multi-track algorithmic compositions demonstrating C++ DSP synthesis, custom filters, and 808 rhythms.
          </p>
        </div>

        {/* Import JSON Project File */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition shadow-sm"
          >
            <Upload className="w-3.5 h-3.5 text-sky-400" />
            <span>Import Project (.json)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {SONG_PRESETS.map((preset) => {
          const isSelected = currentCompositionId === preset.id;

          return (
            <div
              key={preset.id}
              className={`group relative bg-slate-900/80 hover:bg-slate-900 rounded-xl p-5 border transition-all duration-200 flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'border-sky-500 shadow-lg shadow-sky-500/10 ring-1 ring-sky-500/50'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider bg-slate-800 text-sky-400 px-2.5 py-0.5 rounded-full border border-slate-700">
                    {preset.genre}
                  </span>
                  <span className="text-xs font-mono text-slate-400">{preset.tempo} BPM</span>
                </div>

                <h3 className="text-base font-bold text-slate-100 group-hover:text-sky-300 transition">
                  {preset.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                  {preset.description}
                </p>

                <div className="flex items-center gap-3 pt-2 text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-1">
                    <Music className="w-3 h-3 text-sky-400" />
                    <span>Key: {preset.key}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Radio className="w-3 h-3 text-emerald-400" />
                    <span>{preset.scale.split(' ')[0]}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Disc3 className="w-3 h-3 text-amber-400" />
                    <span>16 Steps</span>
                  </div>
                </div>
              </div>

              <button
                id={`btn-load-preset-${preset.id}`}
                onClick={() => onSelectComposition(preset)}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2 ${
                  isSelected
                    ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                }`}
              >
                {isSelected ? (
                  <>
                    <span>Currently Loaded in Studio</span>
                  </>
                ) : (
                  <>
                    <span>Load into Studio</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
