// Multi-Track Audio Stem Exporter: Renders individual track WAVs & Master Mix using Audio DSP Engine

import { MusicComposition } from '../types';
import { audioDsp } from './dspEngine';

export interface StemRenderProgress {
  currentTrack: string;
  progressPercent: number;
}

export interface RenderedStem {
  name: string;
  blob: Blob;
  sizeBytes: number;
  durationSec: number;
}

export async function renderAllStems(
  comp: MusicComposition,
  onProgress?: (info: StemRenderProgress) => void
): Promise<RenderedStem[]> {
  const trackDefs = [
    { id: 'master', name: '00_Master_Full_Mix.wav' },
    { id: 'melody', name: '01_Lead_Synth.wav' },
    { id: 'chords', name: '02_Chords_Pad.wav' },
    { id: 'bass', name: '03_Bassline.wav' },
    { id: 'kick', name: '04_Kick_Drum.wav' },
    { id: 'snare', name: '05_Snare_Drum.wav' },
    { id: 'hihat', name: '06_Closed_Hihat.wav' },
    { id: 'openHat', name: '07_Open_Hihat.wav' },
    { id: 'perc', name: '08_Percussion.wav' },
  ];

  if (comp.customLines && comp.customLines.length > 0) {
    comp.customLines.forEach((line, idx) => {
      const padNum = String(9 + idx).padStart(2, '0');
      const safeName = line.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      trackDefs.push({
        id: line.id,
        name: `${padNum}_${safeName}.wav`,
      });
    });
  }

  const results: RenderedStem[] = [];

  for (let t = 0; t < trackDefs.length; t++) {
    const trackDef = trackDefs[t];
    if (onProgress) {
      onProgress({
        currentTrack: trackDef.name,
        progressPercent: Math.round((t / trackDefs.length) * 100),
      });
    }

    const blob = await audioDsp.exportToWav(comp, trackDef.id);
    const durationSec = (comp.stepsCount * 4 * (60.0 / (comp.tempo * 4))) + 2.5;

    results.push({
      name: trackDef.name,
      blob,
      sizeBytes: blob.size,
      durationSec,
    });
  }

  if (onProgress) {
    onProgress({ currentTrack: 'Complete!', progressPercent: 100 });
  }

  return results;
}
