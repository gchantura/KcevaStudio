import { MusicComposition } from '../types';
import { Music, Radio, Volume2, VolumeX, Sparkles, Sliders, Layers, Eye, Disc3 } from 'lucide-react';
import { audioDsp } from '../audio/dspEngine';

interface TrackArrangementOverviewProps {
  composition: MusicComposition;
  currentStep: number;
  isPlaying: boolean;
  selectedTrack: 'melody' | 'bass' | 'chords' | 'drums';
  onSelectTrack: (track: 'melody' | 'bass' | 'chords' | 'drums') => void;
  trackMutes: {
    melody: boolean;
    bass: boolean;
    chords: boolean;
    drums: boolean;
  };
  onToggleMute: (track: 'melody' | 'bass' | 'chords' | 'drums') => void;
  onUpdateComposition: (comp: MusicComposition) => void;
  viewMode: 'matrix' | 'piano_roll';
  onViewModeChange: (mode: 'matrix' | 'piano_roll') => void;
}

export function TrackArrangementOverview({
  composition,
  currentStep,
  isPlaying,
  selectedTrack,
  onSelectTrack,
  trackMutes,
  onToggleMute,
  onUpdateComposition,
  viewMode,
  onViewModeChange,
}: TrackArrangementOverviewProps) {
  const countActive = (seq: (string | string[] | null)[]) => seq.filter((n) => n && n !== 'REST').length;
  const countDrum = (arr: boolean[]) => arr.filter(Boolean).length;

  const melodyActive = countActive(composition.melodySequence);
  const bassActive = countActive(composition.bassSequence);
  const chordsActive = countActive(composition.chordSequence);
  const kickActive = countDrum(composition.drumPattern.kick);
  const snareActive = countDrum(composition.drumPattern.snare);
  const hihatActive = countDrum(composition.drumPattern.hihat);
  const openHatActive = countDrum(composition.drumPattern.openHat);
  const percActive = countDrum(composition.drumPattern.perc);

  const totalDrumHits = kickActive + snareActive + hihatActive + openHatActive + percActive;
  const totalActiveNotes = melodyActive + bassActive + chordsActive + totalDrumHits;
  const totalBars = Math.ceil(composition.stepsCount / 16);

  const handleMatrixStepClick = (
    lineKey: 'melody' | 'bass' | 'chords' | 'kick' | 'snare' | 'hihat' | 'openHat' | 'perc',
    stepIdx: number
  ) => {
    audioDsp.resumeContext();
    if (lineKey === 'melody' || lineKey === 'bass' || lineKey === 'chords') {
      const keyName = `${lineKey}Sequence` as 'melodySequence' | 'bassSequence' | 'chordSequence';
      const seq: any[] = [...composition[keyName]];
      if (seq[stepIdx]) {
        seq[stepIdx] = null;
      } else {
        const defaultNote = lineKey === 'melody' ? `${composition.key}4` : lineKey === 'bass' ? `${composition.key}2` : 'I';
        seq[stepIdx] = defaultNote;
        if (lineKey === 'chords') {
          const freqs = audioDsp.getChordFrequencies(defaultNote, composition.key, composition.scale);
          audioDsp.playChordNotes(freqs, composition.chordSynthPatch, 0.4);
        } else {
          const patch = lineKey === 'bass' ? composition.bassSynthPatch : composition.leadSynthPatch;
          audioDsp.playSynthesizerNote(440, patch, 0.3);
        }
      }
      onUpdateComposition({ ...composition, [keyName]: seq });
    } else {
      const newPattern = { ...composition.drumPattern };
      newPattern[lineKey] = [...newPattern[lineKey]];
      newPattern[lineKey][stepIdx] = !newPattern[lineKey][stepIdx];
      if (newPattern[lineKey][stepIdx]) {
        audioDsp.playDrumSound(lineKey);
      }
      onUpdateComposition({ ...composition, drumPattern: newPattern });
    }
  };

  const linesList = [
    {
      id: 'melody',
      trackGroup: 'melody' as const,
      lineNum: 1,
      title: 'Lead Melody Synth',
      subtext: `Sawtooth • ${composition.leadSynthPatch.filterCutoff || 2500}Hz Cutoff`,
      activeCount: melodyActive,
      badgeColor: 'text-sky-400 border-sky-800 bg-sky-950/40',
      activeBorder: 'border-sky-500',
      isMuted: trackMutes.melody,
    },
    {
      id: 'chords',
      trackGroup: 'chords' as const,
      lineNum: 2,
      title: 'Chords & Harmonic Pad',
      subtext: `Polyphonic Voicings • ${composition.chordSynthPatch.filterCutoff || 2000}Hz`,
      activeCount: chordsActive,
      badgeColor: 'text-purple-400 border-purple-800 bg-purple-950/40',
      activeBorder: 'border-purple-500',
      isMuted: trackMutes.chords,
    },
    {
      id: 'bass',
      trackGroup: 'bass' as const,
      lineNum: 3,
      title: 'Analog Sub & Acid Bass',
      subtext: `Resonant Bass • ${composition.bassSynthPatch.filterCutoff || 800}Hz`,
      activeCount: bassActive,
      badgeColor: 'text-emerald-400 border-emerald-800 bg-emerald-950/40',
      activeBorder: 'border-emerald-500',
      isMuted: trackMutes.bass,
    },
    {
      id: 'drums_all',
      trackGroup: 'drums' as const,
      lineNum: 4,
      title: '808 Drum Machine (5 Lines)',
      subtext: `Kick, Snare, Closed Hat, Open Hat, Percussion`,
      activeCount: totalDrumHits,
      badgeColor: 'text-amber-400 border-amber-800 bg-amber-950/40',
      activeBorder: 'border-amber-500',
      isMuted: trackMutes.drums,
    },
  ];

  return (
    <div id="arrangement-overview-container" className="space-y-3">
      {/* Overview Statistics Header */}
      <div className="bg-slate-900 border border-slate-800 rounded p-3 space-y-3 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-slate-950 border border-slate-800 text-sky-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                  Arrangement & Musical Lines Overview
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-emerald-400 border border-emerald-900">
                  8 Audio Lines Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                {composition.stepsCount} Steps ({totalBars} Bar{totalBars > 1 ? 's' : ''}) • {composition.tempo} BPM • {composition.key} {composition.scale}
              </p>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded border border-slate-800 text-xs">
            <button
              id="btn-view-matrix"
              onClick={() => onViewModeChange('matrix')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition ${
                viewMode === 'matrix'
                  ? 'bg-slate-800 text-sky-400 font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All 8 Lines Matrix</span>
            </button>
            <button
              id="btn-view-piano-roll"
              onClick={() => onViewModeChange('piano_roll')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition ${
                viewMode === 'piano_roll'
                  ? 'bg-slate-800 text-sky-400 font-bold border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              <span>Focused Piano Roll</span>
            </button>
          </div>
        </div>

        {/* 4 Instrument Channel Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {linesList.map((line) => {
            const isSelected = selectedTrack === line.trackGroup;

            return (
              <div
                key={line.id}
                onClick={() => onSelectTrack(line.trackGroup)}
                className={`p-2.5 rounded border cursor-pointer transition flex flex-col justify-between space-y-2 ${
                  isSelected
                    ? `bg-slate-850 ${line.activeBorder} shadow-sm ring-1 ring-sky-500/20`
                    : 'bg-slate-950 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-start justify-between gap-1.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        TRACK {line.lineNum}
                      </span>
                      <span className={`text-[9px] font-mono px-1 py-0.2 rounded border ${line.badgeColor}`}>
                        {line.activeCount} notes
                      </span>
                    </div>
                    <h3 className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                      {line.title}
                    </h3>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleMute(line.trackGroup);
                    }}
                    className={`p-1 rounded border transition ${
                      line.isMuted
                        ? 'bg-rose-950/80 border-rose-800 text-rose-400'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                    title={line.isMuted ? 'Unmute Track' : 'Mute Track'}
                  >
                    {line.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <p className="text-[10px] text-slate-400 font-mono truncate">{line.subtext}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ALL 8 LINES MATRIX VIEW (When viewMode === 'matrix') */}
      {viewMode === 'matrix' && (
        <div id="full-8-lines-matrix" className="bg-slate-900 rounded border border-slate-800 p-3 space-y-2.5 shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <span>Full 8-Line Step Matrix</span>
              <span className="text-[10px] text-slate-400 font-normal">
                (Click any step on any line to toggle notes and drum hits instantly)
              </span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">
              Key: {composition.key} {composition.scale}
            </span>
          </div>

          {/* Matrix Rows with horizontal scrolling */}
          <div className="overflow-x-auto pb-1 space-y-1.5">
            {/* Timeline Bar Markers */}
            <div
              className="min-w-[700px] grid gap-1 font-mono text-[9px] text-slate-400 mb-1"
              style={{
                gridTemplateColumns: `140px repeat(${composition.stepsCount}, minmax(22px, 1fr))`,
              }}
            >
              <div className="text-[10px] font-bold text-slate-500">LINE / TRACK</div>
              {Array.from({ length: totalBars }).map((_, barIdx) => (
                <div
                  key={barIdx}
                  className="bg-slate-950 border border-slate-800 text-slate-300 font-bold px-1 py-0.5 rounded text-center"
                  style={{ gridColumn: `span ${Math.min(16, composition.stepsCount - barIdx * 16)}` }}
                >
                  BAR {barIdx + 1}
                </div>
              ))}
            </div>

            {/* Matrix Lines */}
            {[
              { key: 'melody', label: '1. Lead Melody', color: 'bg-sky-600 border-sky-400 text-white', activeCount: melodyActive },
              { key: 'chords', label: '2. Chords / Pad', color: 'bg-purple-600 border-purple-400 text-white', activeCount: chordsActive },
              { key: 'bass', label: '3. Bassline', color: 'bg-emerald-600 border-emerald-400 text-white', activeCount: bassActive },
              { key: 'kick', label: '4. Kick Drum', color: 'bg-amber-500 border-amber-400 text-slate-950', activeCount: kickActive },
              { key: 'snare', label: '5. Snare Drum', color: 'bg-rose-500 border-rose-400 text-white', activeCount: snareActive },
              { key: 'hihat', label: '6. Closed Hat', color: 'bg-yellow-500 border-yellow-400 text-slate-950', activeCount: hihatActive },
              { key: 'openHat', label: '7. Open Hat', color: 'bg-orange-500 border-orange-400 text-slate-950', activeCount: openHatActive },
              { key: 'perc', label: '8. Percussion', color: 'bg-cyan-500 border-cyan-400 text-slate-950', activeCount: percActive },
            ].map((lineDef) => {
              const isMelodic = lineDef.key === 'melody' || lineDef.key === 'bass' || lineDef.key === 'chords';

              return (
                <div
                  key={lineDef.key}
                  className="min-w-[700px] grid gap-1 items-center"
                  style={{
                    gridTemplateColumns: `140px repeat(${composition.stepsCount}, minmax(22px, 1fr))`,
                  }}
                >
                  <button
                    onClick={() => onSelectTrack(isMelodic ? (lineDef.key as any) : 'drums')}
                    className="w-full text-left py-1 px-2 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-200 flex items-center justify-between truncate hover:bg-slate-900"
                  >
                    <span className="truncate">{lineDef.label}</span>
                    <span className="text-[9px] text-slate-500 font-bold">{lineDef.activeCount}</span>
                  </button>

                  {Array.from({ length: composition.stepsCount }).map((_, stepIdx) => {
                    let isActive = false;
                    let displayVal = '';

                    if (isMelodic) {
                      const note = (composition as any)[`${lineDef.key}Sequence`][stepIdx];
                      isActive = Boolean(note && note !== 'REST');
                      displayVal = Array.isArray(note) ? note.join('') : (note || '');
                    } else {
                      isActive = (composition.drumPattern as any)[lineDef.key][stepIdx];
                      displayVal = '●';
                    }

                    const isCurrent = isPlaying && currentStep === stepIdx;
                    const isBeatStart = stepIdx % 4 === 0;

                    return (
                      <button
                        key={stepIdx}
                        onClick={() => handleMatrixStepClick(lineDef.key as any, stepIdx)}
                        className={`h-6 rounded-sm transition flex items-center justify-center text-[8px] font-mono border ${
                          isActive
                            ? `${lineDef.color} font-bold shadow-sm`
                            : isBeatStart
                            ? 'bg-slate-950 border-slate-800 hover:bg-slate-800'
                            : 'bg-slate-900/60 border-slate-900 hover:bg-slate-800/80'
                        } ${isCurrent ? 'ring-2 ring-sky-400 ring-offset-1 ring-offset-slate-950 z-10' : ''}`}
                        title={`Step ${stepIdx + 1}: ${displayVal || 'Empty'}`}
                      >
                        {isActive ? (isMelodic ? displayVal.slice(0, 3) : '●') : ''}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
