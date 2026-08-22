import { useState } from 'react';
import { MusicComposition } from '../types';
import { NOTE_NAMES, SCALES } from '../audio/musicTheory';
import { SONG_PRESETS } from '../audio/songPresets';
import { CirclePlus as PlusCircle, Sparkles, X, Music, Layers, Disc3, Zap } from 'lucide-react';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (composition: MusicComposition) => void;
}

export function NewProjectModal({
  isOpen,
  onClose,
  onCreateProject,
}: NewProjectModalProps) {
  const [title, setTitle] = useState('My New Composition');
  const [genre, setGenre] = useState('Electronic');
  const [tempo, setTempo] = useState(120);
  const [key, setKey] = useState('C');
  const [scale, setScale] = useState('Natural Minor (Aeolian)');
  const [stepsCount, setStepsCount] = useState<number>(16);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('blank');

  if (!isOpen) return null;

  const handleCreate = () => {
    if (selectedTemplate === 'blank') {
      const blankComp: MusicComposition = {
        id: `song_${Date.now()}`,
        title: title || 'Untitled Project',
        description: 'Custom created composition in Kceva Studio (kceva.com)',
        genre: genre || 'Custom Synth',
        tempo: tempo,
        key: key,
        scale: scale,
        stepsCount: stepsCount,
        melodySequence: new Array(stepsCount).fill(null),
        bassSequence: new Array(stepsCount).fill(null),
        chordSequence: new Array(stepsCount).fill(null),
        drumPattern: {
          kick: new Array(stepsCount).fill(false),
          snare: new Array(stepsCount).fill(false),
          hihat: new Array(stepsCount).fill(false),
          openHat: new Array(stepsCount).fill(false),
          perc: new Array(stepsCount).fill(false),
        },
        leadSynthPatch: {
          waveType: 'sawtooth',
          attack: 0.01,
          decay: 0.2,
          sustain: 0.5,
          release: 0.3,
          filterCutoff: 3500,
          resonance: 2.5,
          detune: 12,
          drive: 0.2,
          volume: 0.7,
        },
        bassSynthPatch: {
          waveType: 'sawtooth',
          attack: 0.01,
          decay: 0.15,
          sustain: 0.4,
          release: 0.15,
          filterCutoff: 1100,
          resonance: 3.5,
          volume: 0.8,
        },
        chordSynthPatch: {
          waveType: 'sawtooth',
          attack: 0.08,
          decay: 0.4,
          sustain: 0.6,
          release: 0.5,
          filterCutoff: 2400,
          resonance: 1.5,
          volume: 0.55,
        },
        fxSettings: {
          reverbWet: 0.3,
          reverbDecay: 2.5,
          delayTime: 0.25,
          delayFeedback: 0.35,
          delayWet: 0.25,
          drive: 0.2,
          bitDepth: 16,
          masterLowpass: 18000,
          masterHighpass: 30,
        },
      };
      onCreateProject(blankComp);
    } else {
      const preset = SONG_PRESETS.find((p) => p.id === selectedTemplate);
      if (preset) {
        const cloned: MusicComposition = {
          ...JSON.parse(JSON.stringify(preset)),
          id: `song_${Date.now()}`,
          title: title || preset.title,
          stepsCount: stepsCount,
        };
        // Resize steps if needed
        if (stepsCount === 32 && preset.stepsCount === 16) {
          cloned.melodySequence = [...preset.melodySequence, ...preset.melodySequence];
          cloned.bassSequence = [...preset.bassSequence, ...preset.bassSequence];
          cloned.chordSequence = [...preset.chordSequence, ...preset.chordSequence];
          cloned.drumPattern = {
            kick: [...preset.drumPattern.kick, ...preset.drumPattern.kick],
            snare: [...preset.drumPattern.snare, ...preset.drumPattern.snare],
            hihat: [...preset.drumPattern.hihat, ...preset.drumPattern.hihat],
            openHat: [...preset.drumPattern.openHat, ...preset.drumPattern.openHat],
            perc: [...preset.drumPattern.perc, ...preset.drumPattern.perc],
          };
        }
        onCreateProject(cloned);
      }
    }
    onClose();
  };

  return (
    <div className="studio-modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div
        className="studio-modal border rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5 my-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 id="new-project-modal-title" className="text-base font-bold">Create New Project</h2>
              <p className="text-xs text-slate-400">Start fresh from blank or pick a starting template</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Project Details */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Song / Project Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="studio-input w-full border rounded-xl px-3 py-2 text-sm focus:border-sky-500 font-medium"
                placeholder="e.g. Midnight Cyber Drive"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Genre Tag</label>
              <input
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="studio-input w-full border rounded-xl px-3 py-2 text-sm focus:border-sky-500"
                placeholder="e.g. Synthwave, Techno, Lo-Fi"
              />
            </div>
          </div>

          {/* Musical Settings */}
          <div className="studio-inset grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border">
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Tempo (BPM)</label>
              <input
                type="number"
                min="40"
                max="220"
                value={tempo}
                onChange={(e) => setTempo(parseInt(e.target.value, 10) || 120)}
                className="studio-input w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-sky-400 text-center"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Root Key</label>
              <select
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="studio-input w-full border rounded-lg px-2 py-1.5 text-xs font-mono"
              >
                {NOTE_NAMES.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">Scale Mode</label>
              <select
                value={scale}
                onChange={(e) => setScale(e.target.value)}
                className="studio-input w-full border rounded-lg px-2.5 py-1.5 text-xs font-mono"
              >
                {Object.keys(SCALES).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Step Count / Bar Length */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Pattern Length (Measure Count)</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { count: 16, label: '16 Steps', desc: '1 Measure (Loop)' },
                { count: 32, label: '32 Steps', desc: '2 Measures' },
                { count: 64, label: '64 Steps', desc: '4 Measures' },
                { count: 128, label: '128 Steps', desc: '8 Measures (Full)' },
              ].map((s) => (
                <button
                  key={s.count}
                  type="button"
                  onClick={() => setStepsCount(s.count)}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                    stepsCount === s.count
                      ? 'bg-sky-500/15 border-sky-500/50 text-sky-300 shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold font-mono">{s.label}</div>
                    <div className={`w-2.5 h-2.5 rounded-full border ${stepsCount === s.count ? 'bg-sky-400 border-sky-300' : 'border-slate-700'}`} />
                  </div>
                  <div className="text-[10px] opacity-70 mt-1">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Starting Starter Templates */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Starter Template / Genre Base</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setSelectedTemplate('blank')}
                className={`p-2.5 rounded-xl border text-left transition ${
                  selectedTemplate === 'blank'
                    ? 'bg-sky-500/15 border-sky-500/50 text-sky-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200"><Sparkles className="w-3.5 h-3.5 text-sky-400" />Blank Slate</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Empty 8-line canvas</div>
              </button>

              {SONG_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedTemplate(p.id);
                    setTitle(p.title);
                    setGenre(p.genre);
                    setTempo(p.tempo);
                    setKey(p.key);
                    setScale(p.scale);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    selectedTemplate === p.id
                      ? 'bg-purple-500/15 border-purple-500/50 text-purple-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-xs font-bold text-slate-200 truncate">{p.title}</div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">{p.genre}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-500/20 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Song Project</span>
          </button>
        </div>
      </div>
    </div>
  );
}
