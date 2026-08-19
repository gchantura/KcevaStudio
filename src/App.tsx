import { useState, useEffect, useCallback } from 'react';
import { MusicComposition, ViewTab, FxConfig, SynthPatch, CustomSoundLine } from './types';
import { SONG_PRESETS } from './audio/songPresets';
import { audioDsp } from './audio/dspEngine';
import { Header } from './components/Header';
import { TracksSidebar } from './components/TracksSidebar';
import { VocalPickerModal } from './components/VocalPickerModal';
import { AudioVisualizer } from './components/AudioVisualizer';
import { MidiControllerBar } from './components/MidiControllerBar';
import { StepSequencer } from './components/StepSequencer';

import { PianoRollPro } from './components/PianoRollPro';
import { SampleRack } from './components/SampleRack';
import { AudioRecorderTrack } from './components/AudioRecorderTrack';
import { ProMixer } from './components/ProMixer';
import { SongArranger } from './components/SongArranger';
import { SynthControls } from './components/SynthControls';
import { CppPlayground } from './components/CppPlayground';
import { PresetLibrary } from './components/PresetLibrary';

import { ClearModal } from './components/ClearModal';
import { WelcomeScreen } from './components/WelcomeScreen';
import { defaultProject, createDefaultCustomLine } from './utils/defaultProject';
import { NewProjectModal } from './components/NewProjectModal';
import { SaveProjectModal } from './components/SaveProjectModal';
import { ExportHubModal } from './components/ExportHubModal';
import { DjConsoleDeck } from './components/DjConsoleDeck';
import { InstrumentVoiceRack } from './components/InstrumentVoiceRack';
import { TimelineArranger } from './components/TimelineArranger';
import { ShortcutsModal } from './components/ShortcutsModal';
import { QuickActionsToolbar } from './components/QuickActionsToolbar';
import { TutorialOverlay } from './components/TutorialOverlay';

const AUTOSAVE_STORAGE_KEY = 'kceva_music_studio_autosave_v1';

const getInitialComposition = (): MusicComposition => {
  try {
    const saved = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.melodySequence && parsed.drumPattern) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load autosaved composition:', err);
  }
  return SONG_PRESETS[0];
};

export default function App() {
  const [composition, setComposition] = useState<MusicComposition>(getInitialComposition);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTab, setActiveTab] = useState<ViewTab>('studio');
  const [isAutosaving, setIsAutosaving] = useState(false);
  // Beginner mode flag
  const [isBeginnerMode, setIsBeginnerMode] = useState<boolean>(true);
  // Show welcome screen on first load
  const [showWelcome, setShowWelcome] = useState<boolean>(!localStorage.getItem('hasSeenWelcome'));
  const [showTutorial, setShowTutorial] = useState<boolean>(false);

  // Modals state
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [showVocalPicker, setShowVocalPicker] = useState(false);
  const [selectedVocalTrackId, setSelectedVocalTrackId] = useState('');
  const [selectedTrackId, setSelectedTrackId] = useState<string>('melody');
  const [trackMutes, setTrackMutes] = useState<Record<string, boolean>>({});
  const [trackSolos, setTrackSolos] = useState<Record<string, boolean>>({});
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Autosave listener with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(composition));
        setIsAutosaving(true);
        const hideTimer = setTimeout(() => setIsAutosaving(false), 2000);
        return () => clearTimeout(hideTimer);
      } catch (err) {
        console.error('Autosave error:', err);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [composition]);

  // ----- Track control handlers (Core + Custom Lines) -----
  const handleToggleMute = useCallback((id: string) => {
    // Check if it's a custom line
    const isCustom = composition.customLines?.some((l) => l.id === id);
    if (isCustom) {
      const updated = composition.customLines?.map((line) =>
        line.id === id ? { ...line, isMuted: !line.isMuted } : line
      );
      handleUpdateComposition({ ...composition, customLines: updated });
    } else {
      setTrackMutes((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        audioDsp.setTrackMutes(next);
        return next;
      });
    }
  }, [composition]);

  const handleToggleSolo = useCallback((id: string) => {
    const isCustom = composition.customLines?.some((l) => l.id === id);
    if (isCustom) {
      const updated = composition.customLines?.map((line) =>
        line.id === id ? { ...line, isSoloed: !line.isSoloed } : { ...line, isSoloed: false }
      );
      handleUpdateComposition({ ...composition, customLines: updated });
    } else {
      setTrackSolos((prev) => {
        const next = { ...prev, [id]: !prev[id] };
        audioDsp.setTrackSolos(next);
        return next;
      });
    }
  }, [composition]);

  const handleVolumeChange = useCallback((id: string, value: number) => {
    audioDsp.setChannelVolume(id, value);
    if (id === 'melody') {
      handleUpdateComposition({
        ...composition,
        leadSynthPatch: { ...composition.leadSynthPatch, volume: value },
      });
    } else if (id === 'chords') {
      handleUpdateComposition({
        ...composition,
        chordSynthPatch: { ...composition.chordSynthPatch, volume: value },
      });
    } else if (id === 'bass') {
      handleUpdateComposition({
        ...composition,
        bassSynthPatch: { ...composition.bassSynthPatch, volume: value },
      });
    } else {
      const updated = composition.customLines?.map((line) =>
        line.id === id ? { ...line, volume: value } : line
      );
      handleUpdateComposition({ ...composition, customLines: updated });
    }
  }, [composition]);

  const handleSelectTrack = useCallback((id: string) => {
    setSelectedTrackId(id);
    setActiveTab('studio');
  }, []);

  const handleDeleteCustomLine = useCallback((id: string) => {
    const updated = composition.customLines?.filter((l) => l.id !== id);
    handleUpdateComposition({ ...composition, customLines: updated });
    if (selectedTrackId === id) {
      setSelectedTrackId('melody');
    }
  }, [composition, selectedTrackId]);

  const handleOpenVocalPicker = useCallback((id: string) => {
    setSelectedVocalTrackId(id);
    setShowVocalPicker(true);
  }, []);

  const handleVocalSelect = useCallback((sampleUrl: string) => {
    const updated = composition.customLines?.map((line) =>
      line.id === selectedVocalTrackId ? { ...line, sampleUrl, type: 'voice' as const } : line
    );
    handleUpdateComposition({ ...composition, customLines: updated });
  }, [composition, selectedVocalTrackId]);

  const toggleSidebar = () => setIsSidebarCollapsed((prev) => !prev);

  // Handle sequencer step tick
  const handleStepTick = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  const handleTogglePlay = () => {
    if (isPlaying) {
      audioDsp.stopSequencer();
      audioDsp.stopTimelinePlayer();
      setIsPlaying(false);
    } else {
      if (activeTab === 'timeline') {
        setIsPlaying(true);
      } else {
        audioDsp.startSequencer(composition, handleStepTick);
        setIsPlaying(true);
      }
    }
  };

  const handleStop = () => {
    audioDsp.stopSequencer();
    audioDsp.stopTimelinePlayer();
    setIsPlaying(false);
    setCurrentStep(0);
  };

  // Global Keyboard Shortcuts (Space, Enter, Tab, 1-7, ?)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 'Enter' || e.key === 'Home') {
        e.preventDefault();
        handleStop();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      } else if (e.key === '1') {
        setActiveTab('timeline');
      } else if (e.key === '2') {
        setActiveTab('studio');
      } else if (e.key === '3') {
        setActiveTab('piano_roll');
      } else if (e.key === '4') {
        setActiveTab('sound_explorer');
      } else if (e.key === '5') {
        setActiveTab('mixer');
      } else if (e.key === '6') {
        setActiveTab('dj_deck');
      } else if (e.key === '7') {
        setActiveTab('presets');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isPlaying, activeTab, composition, handleStepTick]);

  // Handler to add a new custom track (line)
  const handleAddTrack = () => {
    const newId = crypto.randomUUID();
    const trackNumber = (composition.customLines?.length ?? 0) + 1;
    const newLine = createDefaultCustomLine(newId, `Synth Track ${trackNumber}`);
    const updated = {
      ...composition,
      customLines: [...(composition.customLines ?? []), newLine],
    };
    handleUpdateComposition(updated);
    setSelectedTrackId(newId);
    setActiveTab('studio');
  };

  // Handler to copy current step data to the next step (if possible)
  const handleCopySteps = () => {
    if (currentStep >= composition.stepsCount - 1) return;
    const nextStep = currentStep + 1;
    const copyArray = (arr: (string | null)[]) => {
      const newArr = [...arr];
      newArr[nextStep] = arr[currentStep];
      return newArr;
    };
    const updated: MusicComposition = {
      ...composition,
      melodySequence: copyArray(composition.melodySequence),
      bassSequence: copyArray(composition.bassSequence),
      chordSequence: copyArray(composition.chordSequence),
    };
    handleUpdateComposition(updated);
  };

  // Handler to duplicate a section (simple duplicate of all sequences)
  const handleDuplicateSection = () => {
    const duplicated: MusicComposition = {
      ...composition,
      melodySequence: [...composition.melodySequence, ...composition.melodySequence],
      bassSequence: [...composition.bassSequence, ...composition.bassSequence],
      chordSequence: [...composition.chordSequence, ...composition.chordSequence],
      stepsCount: composition.stepsCount * 2,
    };
    handleUpdateComposition(duplicated);
  };

  // Handler to add a vocal track
  const handleAddVocal = () => {
    const newId = crypto.randomUUID();
    const trackNumber = (composition.customLines?.length ?? 0) + 1;
    const newLine = createDefaultCustomLine(newId, `Vocal ${trackNumber}`);
    newLine.type = 'voice';
    const updated = {
      ...composition,
      customLines: [...(composition.customLines ?? []), newLine],
    };
    handleUpdateComposition(updated);
    setSelectedTrackId(newId);
    setSelectedVocalTrackId(newId);
    setShowVocalPicker(true);
  };

  const handleUpdateComposition = (updated: MusicComposition) => {
    setComposition(updated);
    if (isPlaying) {
      // Smoothly update running audio engine without restarting sequencer
      audioDsp.updateActiveComposition(updated);
    }
  };

  const handleSelectPreset = (preset: MusicComposition) => {
    const wasPlaying = isPlaying;
    if (isPlaying) {
      audioDsp.stopSequencer();
      setIsPlaying(false);
    }
    setComposition(preset);
    setActiveTab('studio');
    if (wasPlaying) {
      setTimeout(() => {
        audioDsp.startSequencer(preset, handleStepTick);
        setIsPlaying(true);
      }, 100);
    }
  };

  // Clear Handlers
  const handleClearAll = () => {
    const cleared: MusicComposition = {
      ...composition,
      melodySequence: new Array(composition.stepsCount).fill(null),
      bassSequence: new Array(composition.stepsCount).fill(null),
      chordSequence: new Array(composition.stepsCount).fill(null),
      drumPattern: {
        kick: new Array(composition.stepsCount).fill(false),
        snare: new Array(composition.stepsCount).fill(false),
        hihat: new Array(composition.stepsCount).fill(false),
        openHat: new Array(composition.stepsCount).fill(false),
        perc: new Array(composition.stepsCount).fill(false),
      },
    };
    handleUpdateComposition(cleared);
  };

  const handleClearMelodic = () => {
    const cleared: MusicComposition = {
      ...composition,
      melodySequence: new Array(composition.stepsCount).fill(null),
      bassSequence: new Array(composition.stepsCount).fill(null),
      chordSequence: new Array(composition.stepsCount).fill(null),
    };
    handleUpdateComposition(cleared);
  };

  const handleClearTrack = (track: 'melody' | 'bass' | 'chords' | 'drums') => {
    if (track === 'drums') {
      const updated = {
        ...composition,
        drumPattern: {
          kick: new Array(composition.stepsCount).fill(false),
          snare: new Array(composition.stepsCount).fill(false),
          hihat: new Array(composition.stepsCount).fill(false),
          openHat: new Array(composition.stepsCount).fill(false),
          perc: new Array(composition.stepsCount).fill(false),
        },
      };
      handleUpdateComposition(updated);
    } else if (track === 'chords') {
      const updated = {
        ...composition,
        chordSequence: new Array(composition.stepsCount).fill(null),
      };
      handleUpdateComposition(updated);
    } else {
      const updated = {
        ...composition,
        [`${track}Sequence`]: new Array(composition.stepsCount).fill(null),
      };
      handleUpdateComposition(updated);
    }
  };

  const handleResetPatches = () => {
    const updated: MusicComposition = {
      ...composition,
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
    handleUpdateComposition(updated);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioDsp.stopSequencer();
      audioDsp.stopCppDsp();
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500 selection:text-white">
      {/* Sidebar */}
      {!isSidebarCollapsed && (
        <TracksSidebar
          composition={composition}
          trackMutes={trackMutes}
          trackSolos={trackSolos}
          selectedTrackId={selectedTrackId}
          onToggleMute={handleToggleMute}
          onToggleSolo={handleToggleSolo}
          onVolumeChange={handleVolumeChange}
          onSelectTrack={handleSelectTrack}
          onOpenVocalPicker={handleOpenVocalPicker}
          onAddTrack={handleAddTrack}
          onAddVocal={handleAddVocal}
          onDeleteCustomLine={handleDeleteCustomLine}
          onClearTrack={handleClearTrack}
        />
      )}

      {/* Main content column */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Welcome screen for beginners */}
        {showWelcome && (
          <WelcomeScreen
            onCreate={() => {
              handleSelectPreset(defaultProject());
              setShowWelcome(false);
              localStorage.setItem('hasSeenWelcome', 'true');
            }}
          />
        )}

        {/* Main Header with integrated sidebar toggle */}
        <Header
          composition={composition}
          isPlaying={isPlaying}
          activeTab={activeTab}
          isSidebarCollapsed={isSidebarCollapsed}
          isAutosaving={isAutosaving}
          onToggleSidebar={toggleSidebar}
          onTabChange={setActiveTab}
          onTogglePlay={handleTogglePlay}
          onStop={handleStop}
          onUpdateComposition={handleUpdateComposition}
          onOpenClearModal={() => setIsClearModalOpen(true)}
          onOpenNewModal={() => setIsNewModalOpen(true)}
          onOpenSaveModal={() => setIsSaveModalOpen(true)}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          onOpenShortcutsModal={() => setIsShortcutsModalOpen(true)}
        />

        {/* Main Studio Viewport */}
        <main className="flex-1 w-full p-4 sm:p-6 space-y-6">
          {/* Real-time Oscilloscope & Frequency Spectrum Visualizer */}
          <AudioVisualizer isPlaying={isPlaying} />

          {/* Hardware Web MIDI Controller Integration Bar */}
          <MidiControllerBar composition={composition} />

          {/* Tab Views */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <TimelineArranger
                composition={composition}
                isPlaying={isPlaying}
                onTogglePlay={handleTogglePlay}
                onUpdateComposition={handleUpdateComposition}
              />
            </div>
          )}

          {activeTab === 'dj_deck' && (
            <div className="space-y-6">
              <DjConsoleDeck
                composition={composition}
                isPlaying={isPlaying}
                onTogglePlay={handleTogglePlay}
                onUpdateComposition={handleUpdateComposition}
              />
            </div>
          )}

          {activeTab === 'sound_explorer' && (
            <div className="space-y-6">
              <InstrumentVoiceRack
                composition={composition}
                onUpdateComposition={handleUpdateComposition}
              />
            </div>
          )}

          {activeTab === 'studio' && (
            <div className="space-y-6">
              <StepSequencer
                composition={composition}
                currentStep={currentStep}
                isPlaying={isPlaying}
                onUpdateComposition={handleUpdateComposition}
                selectedTrack={selectedTrackId}
                onSelectTrack={setSelectedTrackId}
              />
            </div>
          )}

          {activeTab === 'piano_roll' && (
            <div className="space-y-6">
              <PianoRollPro
                composition={composition}
                currentStep={currentStep}
                isPlaying={isPlaying}
                onUpdateComposition={handleUpdateComposition}
              />
            </div>
          )}

          {activeTab === 'samples' && (
            <div className="space-y-6">
              <SampleRack isPlaying={isPlaying} />
            </div>
          )}

          {activeTab === 'audio_rec' && (
            <div className="space-y-6">
              <AudioRecorderTrack isPlaying={isPlaying} />
            </div>
          )}

          {activeTab === 'mixer' && (
            <div className="space-y-6">
              <ProMixer
                composition={composition}
                isPlaying={isPlaying}
                onUpdateComposition={handleUpdateComposition}
              />
            </div>
          )}

          {activeTab === 'arranger' && (
            <div className="space-y-6">
              <SongArranger
                composition={composition}
                isPlaying={isPlaying}
                onUpdateComposition={handleUpdateComposition}
                onPlaySong={handleTogglePlay}
                onStopSong={handleStop}
              />
            </div>
          )}

          {activeTab === 'synths' && (
            <div className="space-y-6">
              <SynthControls
                composition={composition}
                onUpdateComposition={handleUpdateComposition}
              />
            </div>
          )}

          {activeTab === 'cpp_dsp' && (
            <div className="space-y-6">
              <CppPlayground />
            </div>
          )}

          {activeTab === 'presets' && (
            <div className="space-y-6">
              <PresetLibrary
                currentCompositionId={composition.id}
                onSelectComposition={handleSelectPreset}
              />
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-800/80 bg-slate-950/60 py-3 text-center text-xs text-slate-500 font-mono">
          Kceva Music Studio • Real-Time C++ Audio DSP Synthesis & Web Audio Engine • kceva.com
        </footer>
      </div>

      {/* === Modals (rendered outside layout flow) === */}
      <ClearModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        composition={composition}
        onClearAll={handleClearAll}
        onClearMelodic={handleClearMelodic}
        onClearTrack={handleClearTrack}
        onResetPatches={handleResetPatches}
      />

      <NewProjectModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCreateProject={(newComp) => {
          handleSelectPreset(newComp);
        }}
      />

      <SaveProjectModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        composition={composition}
        onLoadProject={(loadedComp) => {
          handleSelectPreset(loadedComp);
        }}
      />

      <ExportHubModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        composition={composition}
      />

      {showTutorial && (
        <TutorialOverlay onClose={() => setShowTutorial(false)} />
      )}

      <VocalPickerModal
        isOpen={showVocalPicker}
        onClose={() => setShowVocalPicker(false)}
        onSelect={handleVocalSelect}
      />
    </div>
  );
}
