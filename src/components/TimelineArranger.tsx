import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Scissors,
  Move,
  ZoomIn,
  ZoomOut,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Upload,
  Sliders,
  X,
  Copy,
  Repeat,
  Headphones,
} from 'lucide-react';
import { MusicComposition, TimelineClip, TimelineTrack } from '../types';
import { audioDsp } from '../audio/dspEngine';
import { noteToFreq } from '../audio/musicTheory';

interface TimelineArrangerProps {
  composition: MusicComposition;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onUpdateComposition: (comp: MusicComposition) => void;
}

// Built-in Sample & Sound Clip Library for 1-Click Pick & Drop
const SOUND_LIBRARY: { name: string; type: TimelineClip['type']; durationBars: number; color: string; speed: number; sampleType: string }[] = [
  { name: 'Vocal Hook - Cyber Night', type: 'vocal', durationBars: 4, color: '#38bdf8', speed: 1.0, sampleType: 'vocal' },
  { name: '808 Sub Boom Drop', type: 'audio', durationBars: 2, color: '#f59e0b', speed: 1.0, sampleType: 'sub_drop' },
  { name: 'Acoustic Drum Break 128', type: 'drum_loop', durationBars: 4, color: '#10b981', speed: 1.0, sampleType: 'drums' },
  { name: 'Synthwave Lead Arp Line', type: 'midi', durationBars: 4, color: '#a855f7', speed: 1.0, sampleType: 'synth' },
  { name: 'Laser Beam Sweep FX', type: 'fx', durationBars: 2, color: '#ec4899', speed: 1.0, sampleType: 'laser' },
  { name: 'Noise Uplifter Riser', type: 'fx', durationBars: 4, color: '#06b6d4', speed: 1.0, sampleType: 'riser' },
  { name: 'Trap Hi-Hat Rolls 2x', type: 'drum_loop', durationBars: 2, color: '#eab308', speed: 2.0, sampleType: 'hihat' },
  { name: 'Vocal Adlib - Yeah Yeah', type: 'vocal', durationBars: 2, color: '#6366f1', speed: 0.75, sampleType: 'vocal' },
];

const createEmptyTimelineTracks = (composition: MusicComposition): TimelineTrack[] => {
  const tracks: TimelineTrack[] = [
    { id: 'melody', name: 'Lead', type: 'synth', color: '#38bdf8', volume: composition.leadSynthPatch?.volume ?? 0.8, pan: 0, isMuted: false, isSoloed: false, isLocked: false, clips: [] },
    { id: 'chords', name: 'Chords', type: 'synth', color: '#a855f7', volume: composition.chordSynthPatch?.volume ?? 0.7, pan: 0, isMuted: false, isSoloed: false, isLocked: false, clips: [] },
    { id: 'bass', name: 'Bass', type: 'bass', color: '#10b981', volume: composition.bassSynthPatch?.volume ?? 0.85, pan: 0, isMuted: false, isSoloed: false, isLocked: false, clips: [] },
    { id: 'drums', name: 'Drums', type: 'drums', color: '#f59e0b', volume: composition.drumVolume ?? 0.85, pan: 0, isMuted: false, isSoloed: false, isLocked: false, clips: [] },
  ];

  return tracks.concat(
    (composition.customLines ?? []).map((line) => ({
      id: line.id,
      name: line.name,
      type: line.type === 'voice' ? 'vocal' : 'synth',
      color: line.color,
      volume: line.volume ?? 0.8,
      pan: line.pan ?? 0,
      isMuted: line.isMuted,
      isSoloed: line.isSoloed,
      isLocked: false,
      clips: [],
    }))
  );
};

export const TimelineArranger: React.FC<TimelineArrangerProps> = ({
  composition,
  isPlaying,
  onTogglePlay,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(48); // pixels per bar
  const [currentPlayheadBar, setCurrentPlayheadBar] = useState<number>(1.0);
  const [activeTool, setActiveTool] = useState<'select' | 'razor'>('select');
  const [snapGrid, setSnapGrid] = useState<'1_bar' | 'half_bar' | 'beat' | 'free'>('1_bar');
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [showSoundDrawer, setShowSoundDrawer] = useState<boolean>(true);

  // Dragging & Resizing State
  const [draggingClip, setDraggingClip] = useState<{
    clipId: string;
    sourceTrackId: string;
    action: 'move' | 'resize-left' | 'resize-right';
    startX: number;
    initialStartBar: number;
    initialDuration: number;
  } | null>(null);

  // Multi-Track Arrangement Lanes start empty and only contain studio tracks.
  const [tracks, setTracks] = useState<TimelineTrack[]>(() => createEmptyTimelineTracks(composition));
  /*
    {
      id: 'trk_v1',
      name: 'V1 - Lead Vocals & Stems',
      type: 'vocal',
      color: '#38bdf8',
      volume: 0.9,
      pan: 0,
      isMuted: false,
      isSoloed: false,
      isLocked: false,
      clips: [
        {
          id: 'clip_1',
          name: 'Vocal Hook 1',
          trackId: 'trk_v1',
          startBar: 1,
          durationBars: 4,
          color: '#38bdf8',
          type: 'vocal',
          speed: 1.0,
          pitchOffset: 0,
          volume: 1.0,
          isMuted: false,
          waveformPoints: [20, 60, 45, 90, 75, 100, 40, 85, 30, 70, 95, 50, 20, 60, 80, 40],
        },
        {
          id: 'clip_2',
          name: 'Vocal Adlib (Half-Speed 0.5x)',
          trackId: 'trk_v1',
          startBar: 7,
          durationBars: 4,
          color: '#0284c7',
          type: 'vocal',
          speed: 0.5,
          pitchOffset: -2,
          volume: 0.9,
          isMuted: false,
          waveformPoints: [10, 30, 50, 80, 90, 60, 40, 70, 80, 50, 30, 60, 40, 20, 50, 30],
        },
      ],
    },
    {
      id: 'trk_a1',
      name: 'A1 - Drum Loops & Beats',
      type: 'drums',
      color: '#f59e0b',
      volume: 0.95,
      pan: 0,
      isMuted: false,
      isSoloed: false,
      isLocked: false,
      clips: [
        {
          id: 'clip_3',
          name: 'Cyber Drum Break (128 BPM)',
          trackId: 'trk_a1',
          startBar: 1,
          durationBars: 8,
          color: '#f59e0b',
          type: 'drum_loop',
          speed: 1.0,
          pitchOffset: 0,
          volume: 1.0,
          isMuted: false,
          waveformPoints: [90, 40, 85, 45, 95, 40, 80, 50, 90, 40, 85, 45, 95, 40, 80, 50],
        },
        {
          id: 'clip_4',
          name: 'Double-Speed Hi-Hats (2.0x)',
          trackId: 'trk_a1',
          startBar: 9,
          durationBars: 4,
          color: '#d97706',
          type: 'drum_loop',
          speed: 2.0,
          pitchOffset: 0,
          volume: 0.85,
          isMuted: false,
          waveformPoints: [40, 60, 40, 70, 50, 80, 40, 90, 50, 60, 40, 70, 50, 80, 40, 90],
        },
      ],
    },
    {
      id: 'trk_a2',
      name: 'A2 - Bass & 808 Sub Lines',
      type: 'bass',
      color: '#10b981',
      volume: 0.9,
      pan: 0,
      isMuted: false,
      isSoloed: false,
      isLocked: false,
      clips: [
        {
          id: 'clip_5',
          name: 'Deep Sub 808 Glide',
          trackId: 'trk_a2',
          startBar: 1,
          durationBars: 8,
          color: '#10b981',
          type: 'audio',
          speed: 1.0,
          pitchOffset: 0,
          volume: 1.0,
          isMuted: false,
          waveformPoints: [80, 70, 90, 85, 60, 95, 80, 75, 80, 70, 90, 85, 60, 95, 80, 75],
        },
      ],
    },
    {
      id: 'trk_a3',
      name: 'A3 - Synth Chords & Melodies',
      type: 'synth',
      color: '#a855f7',
      volume: 0.85,
      pan: 0,
      isMuted: false,
      isSoloed: false,
      isLocked: false,
      clips: [
        {
          id: 'clip_6',
          name: 'Synthwave Chords Progression',
          trackId: 'trk_a3',
          startBar: 1,
          durationBars: 8,
          color: '#a855f7',
          type: 'midi',
          speed: 1.0,
          pitchOffset: 0,
          volume: 0.85,
          isMuted: false,
          waveformPoints: [50, 70, 60, 80, 65, 85, 55, 75, 50, 70, 60, 80, 65, 85, 55, 75],
        },
      ],
    },
    {
      id: 'trk_a4',
      name: 'A4 - Sound FX & Risers',
      type: 'fx',
      color: '#ec4899',
      volume: 0.8,
      pan: 0,
      isMuted: false,
      isSoloed: false,
      isLocked: false,
      clips: [
        {
          id: 'clip_7',
          name: 'Noise Riser (0.75x Slow)',
          trackId: 'trk_a4',
          startBar: 5,
          durationBars: 4,
          color: '#ec4899',
          type: 'fx',
          speed: 0.75,
          pitchOffset: 3,
          volume: 0.8,
          isMuted: false,
          waveformPoints: [10, 20, 30, 45, 60, 75, 90, 100, 10, 20, 30, 45, 60, 75, 90, 100],
        },
      ],
    },
  ]); */

  const totalBars = 32;

  useEffect(() => {
    setTracks((currentTracks) => {
      const builtInIds = new Set(['melody', 'chords', 'bass', 'drums']);
      const builtIns = currentTracks.filter((track) => builtInIds.has(track.id));
      const customTracks = (composition.customLines ?? []).map((line) => {
        const existing = currentTracks.find((track) => track.id === line.id);
        return existing ?? {
          id: line.id,
          name: line.name,
          type: line.type === 'voice' ? 'vocal' : 'synth',
          color: line.color,
          volume: line.volume ?? 0.8,
          pan: line.pan ?? 0,
          isMuted: line.isMuted,
          isSoloed: line.isSoloed,
          isLocked: false,
          clips: [],
        };
      });
      return builtIns.concat(customTracks);
    });
  }, [composition.customLines]);

  // Start or Stop Timeline Audio Engine in sync with isPlaying
  useEffect(() => {
    if (isPlaying) {
      audioDsp.startTimelinePlayer(
        tracks,
        composition.tempo,
        currentPlayheadBar,
        (progressBar) => {
          setCurrentPlayheadBar(progressBar);
        }
      );
    } else {
      audioDsp.stopTimelinePlayer();
    }
    return () => {
      audioDsp.stopTimelinePlayer();
    };
  }, [isPlaying, composition.tempo]);

  // Sync tracks state (moving, resizing, muting, volume) with live audio engine immediately
  useEffect(() => {
    audioDsp.updateTimelineTracks(tracks);
  }, [tracks]);

  // Snap calculation helper
  const snapValue = useCallback((barVal: number): number => {
    if (snapGrid === '1_bar') return Math.max(1, Math.round(barVal));
    if (snapGrid === 'half_bar') return Math.max(1, Math.round(barVal * 2) / 2);
    if (snapGrid === 'beat') return Math.max(1, Math.round(barVal * 4) / 4);
    return Math.max(1, barVal);
  }, [snapGrid]);

  // Handle Global Mouse Move during Dragging / Resizing
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingClip) return;
    const deltaX = e.clientX - draggingClip.startX;
    const deltaBars = deltaX / zoomLevel;

    if (draggingClip.action === 'move') {
      const targetStart = snapValue(draggingClip.initialStartBar + deltaBars);
      setTracks((prev) =>
        prev.map((trk) => ({
          ...trk,
          clips: trk.clips.map((c) =>
            c.id === draggingClip.clipId
              ? { ...c, startBar: Math.min(totalBars - c.durationBars + 1, Math.max(1, targetStart)) }
              : c
          ),
        }))
      );
    } else if (draggingClip.action === 'resize-right') {
      const newDuration = Math.max(0.5, snapValue(draggingClip.initialDuration + deltaBars));
      setTracks((prev) =>
        prev.map((trk) => ({
          ...trk,
          clips: trk.clips.map((c) =>
            c.id === draggingClip.clipId
              ? { ...c, durationBars: newDuration }
              : c
          ),
        }))
      );
    } else if (draggingClip.action === 'resize-left') {
      const rawStart = snapValue(draggingClip.initialStartBar + deltaBars);
      const startClamped = Math.max(1, Math.min(draggingClip.initialStartBar + draggingClip.initialDuration - 0.5, rawStart));
      const durDiff = startClamped - draggingClip.initialStartBar;
      const newDur = Math.max(0.5, draggingClip.initialDuration - durDiff);

      setTracks((prev) =>
        prev.map((trk) => ({
          ...trk,
          clips: trk.clips.map((c) =>
            c.id === draggingClip.clipId
              ? { ...c, startBar: startClamped, durationBars: newDur }
              : c
          ),
        }))
      );
    }
  }, [draggingClip, zoomLevel, snapValue]);

  // Handle Global Mouse Up
  const handleMouseUp = useCallback(() => {
    setDraggingClip(null);
  }, []);

  useEffect(() => {
    if (draggingClip) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingClip, handleMouseMove, handleMouseUp]);

  // Selected Clip Details
  const selectedClip = tracks.flatMap((t) => t.clips).find((c) => c.id === selectedClipId);

  // Timeline-specific Keyboard Shortcuts
  useEffect(() => {
    const handleTimelineKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      if (e.key === 'v' || e.key === 'V') {
        setActiveTool('select');
      } else if (e.key === 'c' || e.key === 'C' || e.key === 'r' || e.key === 'R') {
        setActiveTool('razor');
      } else if ((e.key === 'd' || e.key === 'D') && selectedClip) {
        e.preventDefault();
        handleDuplicateClip(selectedClip);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipId) {
        e.preventDefault();
        handleDeleteClip(selectedClipId);
      } else if ((e.key === 'm' || e.key === 'M') && selectedClip) {
        handleUpdateClip(selectedClip.id, { isMuted: !selectedClip.isMuted });
      } else if (e.key === 'ArrowLeft' && selectedClip) {
        e.preventDefault();
        const newStart = Math.max(1, selectedClip.startBar - 1);
        handleUpdateClip(selectedClip.id, { startBar: newStart });
      } else if (e.key === 'ArrowRight' && selectedClip) {
        e.preventDefault();
        const newStart = Math.min(totalBars - selectedClip.durationBars + 1, selectedClip.startBar + 1);
        handleUpdateClip(selectedClip.id, { startBar: newStart });
      } else if (e.key === 'ArrowUp' && selectedClip) {
        e.preventDefault();
        handleUpdateClip(selectedClip.id, { pitchOffset: Math.min(12, (selectedClip.pitchOffset || 0) + 1) });
      } else if (e.key === 'ArrowDown' && selectedClip) {
        e.preventDefault();
        handleUpdateClip(selectedClip.id, { pitchOffset: Math.max(-12, (selectedClip.pitchOffset || 0) - 1) });
      } else if (e.key === '+' || e.key === '=') {
        setZoomLevel((prev) => Math.min(96, prev + 8));
      } else if (e.key === '-' || e.key === '_') {
        setZoomLevel((prev) => Math.max(24, prev - 8));
      }
    };

    window.addEventListener('keydown', handleTimelineKeyDown);
    return () => window.removeEventListener('keydown', handleTimelineKeyDown);
  }, [selectedClip, selectedClipId, totalBars]);

  // Add a new track lane
  const handleAddTrack = (type: TimelineTrack['type'] = 'audio') => {
    const num = tracks.length + 1;
    const newTrack: TimelineTrack = {
      id: `trk_${Date.now()}`,
      name: `${type.toUpperCase()[0]}${num} - New ${type} Track`,
      type,
      color: type === 'vocal' ? '#38bdf8' : type === 'drums' ? '#f59e0b' : type === 'bass' ? '#10b981' : '#a855f7',
      volume: 0.85,
      pan: 0,
      isMuted: false,
      isSoloed: false,
      isLocked: false,
      clips: [],
    };
    setTracks([...tracks, newTrack]);
  };

  // Drop / Insert a Sound from Library onto a Track
  const handleInsertSoundClip = (trackId: string, item: typeof SOUND_LIBRARY[0], atBar?: number) => {
    const targetBar = atBar !== undefined ? atBar : Math.floor(currentPlayheadBar);
    const newClip: TimelineClip = {
      id: `clip_${Date.now()}`,
      name: item.name,
      trackId,
      startBar: targetBar,
      durationBars: item.durationBars,
      color: item.color,
      type: item.type,
      speed: item.speed,
      pitchOffset: 0,
      volume: 1.0,
      isMuted: false,
      waveformPoints: Array.from({ length: 16 }, () => Math.floor(Math.random() * 80) + 20),
    };

    setTracks(
      tracks.map((trk) => (trk.id === trackId ? { ...trk, clips: [...trk.clips, newClip] } : trk))
    );
    setSelectedClipId(newClip.id);
  };

  // Update selected clip speed / pitch / volume / mute
  const handleUpdateClip = (clipId: string, updates: Partial<TimelineClip>) => {
    setTracks(
      tracks.map((trk) => ({
        ...trk,
        clips: trk.clips.map((clip) => (clip.id === clipId ? { ...clip, ...updates } : clip)),
      }))
    );
  };

  // Duplicate clip
  const handleDuplicateClip = (clip: TimelineClip) => {
    const nextBar = clip.startBar + clip.durationBars;
    const dupClip: TimelineClip = {
      ...clip,
      id: `clip_${Date.now()}`,
      name: `${clip.name} (Copy)`,
      startBar: Math.min(totalBars - clip.durationBars + 1, nextBar),
    };

    setTracks(
      tracks.map((trk) =>
        trk.id === clip.trackId ? { ...trk, clips: [...trk.clips, dupClip] } : trk
      )
    );
    setSelectedClipId(dupClip.id);
  };

  // Delete clip
  const handleDeleteClip = (clipId: string) => {
    setTracks(
      tracks.map((trk) => ({
        ...trk,
        clips: trk.clips.filter((c) => c.id !== clipId),
      }))
    );
    if (selectedClipId === clipId) setSelectedClipId(null);
  };

  // Split / Razor cut clip at current playhead
  const handleRazorClip = (clip: TimelineClip) => {
    const splitBar = currentPlayheadBar;
    if (splitBar <= clip.startBar || splitBar >= clip.startBar + clip.durationBars) return;

    const firstDuration = splitBar - clip.startBar;
    const secondDuration = clip.durationBars - firstDuration;

    const firstClip: TimelineClip = {
      ...clip,
      durationBars: firstDuration,
    };

    const secondClip: TimelineClip = {
      ...clip,
      id: `clip_${Date.now()}`,
      name: `${clip.name} (Pt 2)`,
      startBar: splitBar,
      durationBars: secondDuration,
    };

    setTracks(
      tracks.map((trk) =>
        trk.id === clip.trackId
          ? {
              ...trk,
              clips: trk.clips.map((c) => (c.id === clip.id ? firstClip : c)).concat(secondClip),
            }
          : trk
      )
    );
  };

  // Handle local user audio file drop
  const handleFileDropOnTrack = (trackId: string, file: File, atBar: number) => {
    const newClip: TimelineClip = {
      id: `clip_${Date.now()}`,
      name: file.name.replace(/\.[^/.]+$/, ''),
      trackId,
      startBar: atBar,
      durationBars: 4,
      color: '#38bdf8',
      type: 'audio',
      speed: 1.0,
      pitchOffset: 0,
      volume: 1.0,
      isMuted: false,
      waveformPoints: Array.from({ length: 16 }, () => Math.floor(Math.random() * 85) + 15),
    };

    setTracks(
      tracks.map((trk) => (trk.id === trackId ? { ...trk, clips: [...trk.clips, newClip] } : trk))
    );
    setSelectedClipId(newClip.id);
  };

  // Format Timecode string
  const formatTimecode = (bar: number) => {
    const bpm = composition.tempo || 128;
    const totalSeconds = ((bar - 1) * 4 * 60) / bpm;
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    const frames = Math.floor((totalSeconds % 1) * 30);
    return `00:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3 font-sans select-none">
      {/* Top Toolbar: Timecode, Tools, Transport, Zoom */}
      <div className="bg-slate-900 border border-slate-800 rounded p-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Timecode & Transport */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-slate-950 border border-slate-800 rounded font-mono text-sky-400 font-bold text-sm">
            {formatTimecode(currentPlayheadBar)}
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 border border-slate-800 rounded">
            <button
              onClick={() => {
                setCurrentPlayheadBar(1.0);
                audioDsp.seekTimeline(1.0);
              }}
              className="p-1.5 text-slate-400 hover:text-white rounded transition"
              title="Return to Start (Bar 1)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onTogglePlay}
              className={`px-3 py-1 font-bold rounded text-xs flex items-center gap-1.5 transition ${
                isPlaying ? 'bg-amber-500 text-slate-950' : 'bg-emerald-600 text-white'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
            </button>
          </div>

          {/* Tool Selector */}
          <div className="flex items-center bg-slate-950 p-1 border border-slate-800 rounded gap-0.5">
            <button
              onClick={() => setActiveTool('select')}
              className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition ${
                activeTool === 'select' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Select & Move Clips"
            >
              <Move className="w-3.5 h-3.5" />
              <span>Select / Move</span>
            </button>
            <button
              onClick={() => setActiveTool('razor')}
              className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition ${
                activeTool === 'razor' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Razor Cut / Split Tool"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Razor (Split)</span>
            </button>
          </div>
        </div>

        {/* Center: Snap & Zoom */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 border border-slate-800 rounded">
            <span className="text-slate-500">SNAP:</span>
            <select
              value={snapGrid}
              onChange={(e) => setSnapGrid(e.target.value as any)}
              className="bg-transparent text-slate-300 font-bold focus:outline-none"
            >
              <option value="1_bar">1 Bar</option>
              <option value="half_bar">1/2 Bar</option>
              <option value="beat">1 Beat</option>
              <option value="free">Free</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-950 border border-slate-800 rounded p-0.5">
            <button
              onClick={() => setZoomLevel(Math.max(24, zoomLevel - 8))}
              className="p-1 text-slate-400 hover:text-white rounded"
              title="Zoom Out Timeline"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[10px] text-slate-400">{zoomLevel}px</span>
            <button
              onClick={() => setZoomLevel(Math.min(96, zoomLevel + 8))}
              className="p-1 text-slate-400 hover:text-white rounded"
              title="Zoom In Timeline"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => handleAddTrack('audio')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold flex items-center gap-1 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Track</span>
          </button>
        </div>
      </div>

      {/* Main Arranger Body: Sound Palette Drawer + Multi-Track Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left 3 Cols: Sound & Sample Pick & Drop Palette */}
        {showSoundDrawer && (
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded p-3 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Sound Clips Palette
                </span>
                <span className="text-[10px] font-mono text-slate-500">Drag or Click +</span>
              </div>

              <div className="space-y-1.5 mt-2 max-h-[380px] overflow-y-auto pr-1">
                {SOUND_LIBRARY.map((item, idx) => (
                  <div
                    key={idx}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify(item))}
                    className="p-2 bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded cursor-grab active:cursor-grabbing flex items-center justify-between transition group"
                  >
                    <div className="truncate mr-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-sm shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs font-semibold text-slate-200 truncate">{item.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 pl-3.5">
                        {item.durationBars} Bars • {item.speed}x Speed
                      </span>
                    </div>

                    <button
                      onClick={() => handleInsertSoundClip(tracks[0]?.id || 'trk_v1', item)}
                      className="p-1 rounded bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white transition shrink-0 opacity-80 group-hover:opacity-100"
                      title="Add to Track 1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom File Upload Box */}
            <div className="p-2.5 bg-slate-950 border border-dashed border-slate-800 hover:border-sky-500 rounded text-center transition">
              <label className="cursor-pointer flex flex-col items-center gap-1">
                <Upload className="w-4 h-4 text-sky-400" />
                <span className="text-[11px] font-bold text-slate-300">Drop Local Audio (.wav, .mp3)</span>
                <span className="text-[9px] text-slate-500 font-mono">or click to browse</span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileDropOnTrack(tracks[0]?.id || 'trk_v1', file, 1);
                  }}
                />
              </label>
            </div>
          </div>
        )}

        {/* Right 9 Cols: Linear Multi-Track Canvas */}
        <div className={`${showSoundDrawer ? 'lg:col-span-9' : 'lg:col-span-12'} bg-slate-900 border border-slate-800 rounded p-3 space-y-2 overflow-x-auto`}>
          {/* Top Bar Ruler with Playhead Scrubbing */}
          <div className="flex">
            {/* Header spacer */}
            <div className="w-48 shrink-0 px-2 py-1 text-[10px] font-mono text-slate-500 font-bold uppercase">
              Track Lanes
            </div>

            {/* Ruler Bars */}
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickedBar = Math.max(1, Math.min(totalBars, 1 + clickX / zoomLevel));
                setCurrentPlayheadBar(clickedBar);
                audioDsp.seekTimeline(clickedBar);
              }}
              className="flex-1 flex bg-slate-950 border border-slate-800 rounded-t h-7 relative cursor-pointer overflow-hidden"
              style={{ minWidth: `${totalBars * zoomLevel}px` }}
            >
              {Array.from({ length: totalBars }).map((_, i) => (
                <div
                  key={i}
                  className="border-r border-slate-800 text-[10px] font-mono text-slate-500 font-bold flex items-center justify-start pl-1"
                  style={{ width: `${zoomLevel}px`, flexShrink: 0 }}
                >
                  {i + 1}
                </div>
              ))}

              {/* Playhead Marker */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-red-500 shadow-md z-30 pointer-events-none"
                style={{
                  left: `${(currentPlayheadBar - 1) * zoomLevel}px`,
                }}
              >
                <div className="w-2.5 h-2.5 -ml-[3px] bg-red-500 rotate-45 rounded-xs" />
              </div>
            </div>
          </div>

          {/* Track Lanes */}
          <div className="space-y-1.5" style={{ minWidth: `${48 * 4 + totalBars * zoomLevel}px` }}>
            {tracks.map((track) => (
              <div
                key={track.id}
                className={`flex bg-slate-950 border border-slate-800 rounded transition ${
                  track.isMuted ? 'opacity-50' : ''
                }`}
              >
                {/* Track Controls Left Strip (A1, [M], [S], Vol) */}
                <div className="w-48 shrink-0 p-2 border-r border-slate-800 bg-slate-900/90 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-xs shrink-0" style={{ backgroundColor: track.color }} />
                      <span className="text-xs font-bold text-slate-200 truncate">{track.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          setTracks(
                            tracks.map((t) => (t.id === track.id ? { ...t, isMuted: !t.isMuted } : t))
                          )
                        }
                        className={`w-4 h-4 rounded text-[9px] font-mono font-bold ${
                          track.isMuted ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                        title="Mute Track"
                      >
                        {track.isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() =>
                          setTracks(
                            tracks.map((t) => (t.id === track.id ? { ...t, isSoloed: !t.isSoloed } : t))
                          )
                        }
                        className={`w-4 h-4 rounded text-[9px] font-mono font-bold ${
                          track.isSoloed ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                        title="Solo Track"
                      >
                        <Headphones className="w-3 h-3" />
                      </button>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(track.volume * 100)}
                      onChange={(e) =>
                        setTracks(
                          tracks.map((t) =>
                            t.id === track.id ? { ...t, volume: Number(e.target.value) / 100 } : t
                          )
                        )
                      }
                      className="w-16 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-sky-400"
                    />
                  </div>
                </div>

                {/* Track Timeline Lane */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const dropX = e.clientX - rect.left;
                    const atBar = Math.max(1, Math.floor(1 + dropX / zoomLevel));
                    const dataStr = e.dataTransfer.getData('text/plain');
                    if (dataStr) {
                      try {
                        const item = JSON.parse(dataStr);
                        handleInsertSoundClip(track.id, item, atBar);
                      } catch (err) {
                        console.error('Invalid timeline clip data:', err);
                      }
                    }
                  }}
                  className="flex-1 h-16 bg-slate-950/70 relative overflow-hidden"
                  style={{ minWidth: `${totalBars * zoomLevel}px` }}
                >
                  {/* Grid lines */}
                  {Array.from({ length: totalBars }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 bottom-0 border-r border-slate-900 pointer-events-none"
                      style={{ left: `${(i + 1) * zoomLevel}px` }}
                    />
                  ))}

                  {/* Playhead Line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20"
                    style={{ left: `${(currentPlayheadBar - 1) * zoomLevel}px` }}
                  />

                  {/* Render Audio & MIDI Clips */}
                  {track.clips.map((clip) => {
                    const isSelected = selectedClipId === clip.id;
                    const clipWidth = clip.durationBars * zoomLevel;
                    const clipLeft = (clip.startBar - 1) * zoomLevel;

                    return (
                      <div
                        key={clip.id}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          if (activeTool === 'razor') {
                            handleRazorClip(clip);
                          } else {
                            setSelectedClipId(clip.id);
                            // Start moving clip
                            setDraggingClip({
                              clipId: clip.id,
                              sourceTrackId: track.id,
                              action: 'move',
                              startX: e.clientX,
                              initialStartBar: clip.startBar,
                              initialDuration: clip.durationBars,
                            });
                          }
                        }}
                        className={`absolute top-1 bottom-1 rounded border transition cursor-move overflow-hidden flex flex-col justify-between select-none ${
                          isSelected
                            ? 'ring-2 ring-white border-white z-10'
                            : 'border-slate-700/80 hover:border-slate-500'
                        } ${clip.isMuted ? 'opacity-40 line-through' : ''}`}
                        style={{
                          left: `${clipLeft}px`,
                          width: `${clipWidth}px`,
                          backgroundColor: `${clip.color}33`,
                          borderColor: clip.color,
                        }}
                      >
                        {/* Left Resize Handle (Trim Start) */}
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setSelectedClipId(clip.id);
                            setDraggingClip({
                              clipId: clip.id,
                              sourceTrackId: track.id,
                              action: 'resize-left',
                              startX: e.clientX,
                              initialStartBar: clip.startBar,
                              initialDuration: clip.durationBars,
                            });
                          }}
                          className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize hover:bg-white/40 z-20"
                          title="Drag to trim start"
                        />

                        {/* Clip Content Area */}
                        <div className="px-1.5 pt-1 flex items-center justify-between text-[10px] font-mono leading-none pointer-events-none">
                          <span className="font-bold text-slate-100 truncate mr-1">{clip.name}</span>
                          <div className="flex items-center gap-1">
                            <span
                              className="px-1 py-0.2 rounded text-[9px] font-bold text-slate-950"
                              style={{ backgroundColor: clip.color }}
                            >
                              {clip.speed}x
                            </span>
                          </div>
                        </div>

                        {/* Waveform Visualization Bars */}
                        <div className="h-6 flex items-center justify-around gap-0.5 opacity-80 pointer-events-none px-1">
                          {(clip.waveformPoints || [30, 60, 40, 80, 90, 40, 70, 50]).map((pt, pIdx) => (
                            <div
                              key={pIdx}
                              className="w-1 rounded-xs"
                              style={{
                                height: `${pt}%`,
                                backgroundColor: clip.color,
                              }}
                            />
                          ))}
                        </div>

                        {/* Clip Footer */}
                        <div className="px-1.5 pb-1 flex items-center justify-between text-[8px] font-mono text-slate-400 pointer-events-none">
                          <span>{clip.durationBars} Bars</span>
                          {clip.pitchOffset !== 0 && (
                            <span className="text-amber-400">
                              {clip.pitchOffset > 0 ? `+${clip.pitchOffset}st` : `${clip.pitchOffset}st`}
                            </span>
                          )}
                        </div>

                        {/* Right Resize Handle (Trim End) */}
                        <div
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setSelectedClipId(clip.id);
                            setDraggingClip({
                              clipId: clip.id,
                              sourceTrackId: track.id,
                              action: 'resize-right',
                              startX: e.clientX,
                              initialStartBar: clip.startBar,
                              initialDuration: clip.durationBars,
                            });
                          }}
                          className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-white/40 z-20"
                          title="Drag to trim duration / loop length"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selected Clip Inspector Panel (Speed, Pitch, Length, Volume, Mute, Duplicate) */}
      {selectedClip && (
        <div className="bg-slate-900 border border-slate-800 rounded p-3 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-sky-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Clip Speed & Pitch Inspector: <span className="text-sky-400">{selectedClip.name}</span>
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {/* Mute Clip Button */}
              <button
                onClick={() => handleUpdateClip(selectedClip.id, { isMuted: !selectedClip.isMuted })}
                className={`px-2 py-0.5 rounded text-xs font-mono flex items-center gap-1 transition ${
                  selectedClip.isMuted ? 'bg-red-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {selectedClip.isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                <span>{selectedClip.isMuted ? 'Unmute Clip' : 'Mute Clip'}</span>
              </button>

              {/* Duplicate Clip Button */}
              <button
                onClick={() => handleDuplicateClip(selectedClip)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1 transition"
              >
                <Copy className="w-3 h-3" />
                <span>Duplicate</span>
              </button>

              {/* Delete Clip Button */}
              <button
                onClick={() => handleDeleteClip(selectedClip.id)}
                className="px-2 py-0.5 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 text-xs font-mono flex items-center gap-1 transition"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete Clip</span>
              </button>
              <button onClick={() => setSelectedClipId(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-1">
            {/* Speed Warping (0.5x to 2.0x) */}
            <div className="bg-slate-950 p-2 border border-slate-800 rounded space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Playback Speed:</span>
                <span className="text-sky-400 font-bold">{selectedClip.speed}x</span>
              </div>
              <div className="flex items-center gap-1 pt-1">
                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => handleUpdateClip(selectedClip.id, { speed: spd })}
                    className={`flex-1 py-1 rounded text-[10px] font-bold border transition ${
                      selectedClip.speed === spd
                        ? 'bg-sky-600 text-white border-sky-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Pitch Shift (-12 to +12 Semitones) */}
            <div className="bg-slate-950 p-2 border border-slate-800 rounded space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Pitch Shift:</span>
                <span className="text-amber-400 font-bold">
                  {selectedClip.pitchOffset >= 0 ? `+${selectedClip.pitchOffset} st` : `${selectedClip.pitchOffset} st`}
                </span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                step="1"
                value={selectedClip.pitchOffset}
                onChange={(e) => handleUpdateClip(selectedClip.id, { pitchOffset: Number(e.target.value) })}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-400 mt-2"
              />
            </div>

            {/* Clip Length (Bars) */}
            <div className="bg-slate-950 p-2 border border-slate-800 rounded space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Clip Length (Bars):</span>
                <span className="text-emerald-400 font-bold">{selectedClip.durationBars} Bars</span>
              </div>
              <div className="flex items-center gap-1 pt-1">
                {[1, 2, 4, 8, 16].map((bars) => (
                  <button
                    key={bars}
                    onClick={() => handleUpdateClip(selectedClip.id, { durationBars: bars })}
                    className={`flex-1 py-1 rounded text-[10px] font-bold border transition ${
                      selectedClip.durationBars === bars
                        ? 'bg-emerald-600 text-white border-emerald-400'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {bars}B
                  </button>
                ))}
              </div>
            </div>

            {/* Clip Gain */}
            <div className="bg-slate-950 p-2 border border-slate-800 rounded space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Clip Volume:</span>
                <span className="text-purple-400 font-bold">{Math.round(selectedClip.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1.5"
                step="0.05"
                value={selectedClip.volume}
                onChange={(e) => handleUpdateClip(selectedClip.id, { volume: Number(e.target.value) })}
                className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-400 mt-2"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
