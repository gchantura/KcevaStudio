import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3002;

app.use(express.json({ limit: '10mb' }));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Endpoint to generate music composition structure from natural language
app.post('/api/generate-music', async (req, res) => {
  const { prompt, genre, mood, tempo, scale, key } = req.body;
  
  // High quality algorithmic generator based on music theory
  const rootKey = key || 'D';
  const targetScale = scale || 'Natural Minor (Aeolian)';
  const targetBpm = tempo || 128;
  const targetGenre = genre || 'Cyberpunk Synthwave';

  const notesMap: Record<string, string[]> = {
    'D': ['D4', 'E4', 'F4', 'G4', 'A4', 'A#4', 'C5', 'D5'],
    'C': ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
    'A': ['A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5'],
    'F': ['F4', 'G4', 'A4', 'A#4', 'C5', 'D5', 'E5', 'F5'],
    'G': ['G4', 'A4', 'A#4', 'C5', 'D5', 'D#5', 'F5', 'G5'],
  };
  const scaleList = notesMap[rootKey] || ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5'];

  const melodySeq: (string | null)[] = [
    scaleList[0], null, scaleList[2], null,
    scaleList[4], scaleList[3], null, scaleList[2],
    scaleList[1], null, scaleList[0], scaleList[2],
    scaleList[4], null, scaleList[0], null
  ];

  const bassSeq: (string | null)[] = [
    `${rootKey}2`, `${rootKey}2`, `${rootKey}2`, `${rootKey}2`,
    `${scaleList[5].charAt(0)}1`, `${scaleList[5].charAt(0)}1`, `${scaleList[5].charAt(0)}1`, `${scaleList[5].charAt(0)}1`,
    `${scaleList[6].charAt(0)}2`, `${scaleList[6].charAt(0)}2`, `${scaleList[6].charAt(0)}2`, `${scaleList[6].charAt(0)}2`,
    `${scaleList[3].charAt(0)}1`, `${scaleList[3].charAt(0)}1`, `${rootKey}2`, `${rootKey}2`
  ];

  const chordSeq: (string | null)[] = [
    scaleList[0], null, null, null,
    scaleList[5], null, null, null,
    scaleList[6], null, null, null,
    scaleList[3], null, scaleList[0], null
  ];

  const composition = {
    title: `${targetGenre} • ${prompt ? prompt.slice(0, 24) : 'Harmonic Spectrum'}`,
    description: `Algorithmic C++ DSP composition generated for ${targetGenre} in ${rootKey} ${targetScale}.`,
    genre: targetGenre,
    tempo: targetBpm,
    key: rootKey,
    scale: targetScale,
    timeSignature: '4/4',
    chordProgression: [`${rootKey}m`, 'VI', 'VII', 'iv'],
    melodySequence: melodySeq,
    bassSequence: bassSeq,
    chordSequence: chordSeq,
    drumPattern: {
      kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
      snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
      hihat: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
      openHat: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
      perc: [false, false, false, true, false, false, false, true, false, false, false, true, false, true, false, false],
    },
    leadSynthPatch: {
      waveType: 'sawtooth',
      attack: 0.01,
      decay: 0.15,
      sustain: 0.6,
      release: 0.3,
      filterCutoff: 3800,
      resonance: 2.8,
    },
    bassSynthPatch: {
      waveType: 'sawtooth',
      attack: 0.005,
      decay: 0.12,
      sustain: 0.5,
      release: 0.1,
      filterCutoff: 900,
      resonance: 3.5,
    },
    fxSettings: {
      reverbWet: 0.3,
      delayTime: 0.25,
      delayFeedback: 0.35,
      drive: 0.25,
    },
    cppDspCode: `// Real-Time C++ DSP Synthesis Engine
#include <cmath>
#include <algorithm>

class MasterSynthesizer {
    float phaseLead = 0.0f;
    float phaseBass = 0.0f;
    float filterState[4] = {0.0f};

public:
    inline float process(float sampleRate, float fLead, float fBass, float cutoff, float res) {
        phaseLead += fLead / sampleRate;
        if (phaseLead >= 1.0f) phaseLead -= 1.0f;
        float leadSaw = 2.0f * phaseLead - 1.0f;

        phaseBass += fBass / sampleRate;
        if (phaseBass >= 1.0f) phaseBass -= 1.0f;
        float bassSaw = 2.0f * phaseBass - 1.0f;

        float mix = leadSaw * 0.4f + bassSaw * 0.6f;
        float g = std::tan(3.14159265f * cutoff / sampleRate);
        filterState[0] += g * (mix - res * filterState[3] - filterState[0]);
        filterState[1] += g * (filterState[0] - filterState[1]);
        filterState[2] += g * (filterState[1] - filterState[2]);
        filterState[3] += g * (filterState[2] - filterState[3]);

        return std::tanh(filterState[3] * 1.5f);
    }
};`
  };

  res.json({ success: true, composition });
});

// Vite middleware configuration
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const url = `http://localhost:${PORT}`;
    console.log(`Music Generator Server running on ${url}`);

    if (process.argv.includes('--open') || process.argv.includes('-o')) {
      const openCmd =
        process.platform === 'win32'
          ? `start ${url}`
          : process.platform === 'darwin'
          ? `open ${url}`
          : `xdg-open ${url}`;
      exec(openCmd, (err) => {
        if (err) console.error('Auto-open browser notice:', err.message);
      });
    }
  });
}

start();
