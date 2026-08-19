// Music Theory, Scales, Note mappings, Chord Voicings, and Generative Pro DAW utilities

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const SCALES: Record<string, number[]> = {
  'Major (Ionian)': [0, 2, 4, 5, 7, 9, 11],
  'Natural Minor (Aeolian)': [0, 2, 3, 5, 7, 8, 10],
  'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11],
  'Melodic Minor': [0, 2, 3, 5, 7, 9, 11],
  'Dorian': [0, 2, 3, 5, 7, 9, 10],
  'Phrygian': [0, 1, 3, 5, 7, 8, 10],
  'Phrygian Dominant': [0, 1, 4, 5, 7, 8, 10],
  'Lydian': [0, 2, 4, 6, 7, 9, 11],
  'Mixolydian': [0, 2, 4, 5, 7, 9, 10],
  'Locrian': [0, 1, 3, 5, 6, 8, 10],
  'Pentatonic Major': [0, 2, 4, 7, 9],
  'Pentatonic Minor': [0, 3, 5, 7, 10],
  'Blues': [0, 3, 5, 6, 7, 10],
  'Japanese Hirajoshi': [0, 2, 3, 7, 8],
  'Arabic / Double Harmonic': [0, 1, 4, 5, 7, 8, 11],
  'Whole Tone': [0, 2, 4, 6, 8, 10],
};

export const CHORD_INTERVALS: Record<string, number[]> = {
  'maj': [0, 4, 7],
  'min': [0, 3, 7],
  'dim': [0, 3, 6],
  'aug': [0, 4, 8],
  'sus4': [0, 5, 7],
  'sus2': [0, 2, 7],
  'maj7': [0, 4, 7, 11],
  'min7': [0, 3, 7, 10],
  'dom7': [0, 4, 7, 10],
  '7th': [0, 4, 7, 10],
  'add9': [0, 4, 7, 14],
  'power': [0, 7, 12],
};

const FLAT_TO_SHARP_MAP: Record<string, string> = {
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
  'db': 'C#', 'eb': 'D#', 'gb': 'F#', 'ab': 'G#', 'bb': 'A#',
};

// Convert Note string (e.g., "C4", "D#3", "Eb4", "Dm", "Cmaj7", "Bb2") to MIDI number (0 - 127)
export function noteToMidi(noteStr: string): number {
  if (!noteStr || noteStr === 'REST') return 60;

  let s = noteStr.trim();
  for (const [flat, sharp] of Object.entries(FLAT_TO_SHARP_MAP)) {
    if (s.startsWith(flat)) {
      s = sharp + s.slice(flat.length);
      break;
    }
  }

  const match = s.match(/^([A-G]#?)([^0-9\-]*)(-?\d+)?$/i);
  if (!match) return 60;

  const name = match[1].toUpperCase();
  const noteIndex = NOTE_NAMES.indexOf(name);
  if (noteIndex === -1) return 60;

  const octave = match[3] !== undefined ? parseInt(match[3], 10) : 4;
  return (octave + 1) * 12 + noteIndex;
}

// Convert MIDI number to Note string
export function midiToNote(midi: number): string {
  const noteIndex = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

// Convert MIDI note number to Frequency (Hz) with A4 = 440Hz standard
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Convert note string directly to frequency
export function noteToFreq(noteStr: string): number {
  return midiToFreq(noteToMidi(noteStr));
}

// Check if a note belongs to a given scale & root key
export function isNoteInScale(note: string, rootKey: string, scaleName: string): boolean {
  if (!note || note === 'REST') return false;
  let s = note.trim();
  for (const [flat, sharp] of Object.entries(FLAT_TO_SHARP_MAP)) {
    if (s.startsWith(flat)) {
      s = sharp + s.slice(flat.length);
      break;
    }
  }
  const match = s.match(/^([A-G]#?)/i);
  if (!match) return true;
  const noteBase = match[1].toUpperCase();
  const rootIndex = NOTE_NAMES.indexOf(rootKey);
  const noteIndex = NOTE_NAMES.indexOf(noteBase);
  if (rootIndex === -1 || noteIndex === -1) return true;
  const semitonesAboveRoot = (noteIndex - rootIndex + 12) % 12;
  const intervals = SCALES[scaleName] || SCALES['Natural Minor (Aeolian)'] || [0, 2, 3, 5, 7, 8, 10];
  return intervals.includes(semitonesAboveRoot);
}

// Check if a note is black key (accidental)
export function isBlackKey(note: string): boolean {
  return note.includes('#');
}

// Get all chromatic notes in range (e.g., C1 to B5 for pro piano roll)
export function getAllChromaticNotes(startOctave = 1, numOctaves = 5): string[] {
  const notes: string[] = [];
  for (let oct = startOctave; oct < startOctave + numOctaves; oct++) {
    for (const name of NOTE_NAMES) {
      notes.push(`${name}${oct}`);
    }
  }
  return notes;
}

// Get notes in a scale for a specific key and octave range
export function getScaleNotes(rootKey: string, scaleName: string, startOctave = 3, numOctaves = 2): string[] {
  const rootIndex = NOTE_NAMES.indexOf(rootKey);
  const intervals = SCALES[scaleName] || SCALES['Natural Minor (Aeolian)'] || [0, 2, 3, 5, 7, 8, 10];
  const notes: string[] = [];

  for (let oct = startOctave; oct < startOctave + numOctaves; oct++) {
    for (const interval of intervals) {
      const midi = (oct + 1) * 12 + ((rootIndex + interval) % 12);
      notes.push(midiToNote(midi));
    }
  }
  return notes;
}

// Generate Chord Notes from a root note and chord stamp
export function getChordNotesFromRoot(rootNote: string, chordType: string): string[] {
  const baseMidi = noteToMidi(rootNote);
  const intervals = CHORD_INTERVALS[chordType] || CHORD_INTERVALS['maj'];
  return intervals.map((interval) => midiToNote(baseMidi + interval));
}

// Humanize pattern velocities with subtle natural analog variance
export function humanizeVelocities(velocities: number[], jitter = 12): number[] {
  return velocities.map((v) => {
    if (v === 0) return 0;
    const delta = Math.floor((Math.random() - 0.5) * 2 * jitter);
    return Math.max(20, Math.min(127, v + delta));
  });
}

// Convert any Chord Name, Roman Numeral, or Note into Polyphonic Frequencies
export function getChordFrequenciesFromName(chordStr: string, rootKey = 'C', scale = 'Major (Ionian)'): number[] {
  if (!chordStr || chordStr === 'REST') return [261.63];

  let s = chordStr.trim();
  for (const [flat, sharp] of Object.entries(FLAT_TO_SHARP_MAP)) {
    if (s.startsWith(flat)) {
      s = sharp + s.slice(flat.length);
      break;
    }
  }

  // Handle Roman Numerals (I, ii, iii, IV, V, vi, vii°, i, iv, v, VI, VII)
  const romanMap: Record<string, { degree: number; quality: string }> = {
    'I': { degree: 0, quality: 'maj' },
    'i': { degree: 0, quality: 'min' },
    'II': { degree: 1, quality: 'maj' },
    'ii': { degree: 1, quality: 'min' },
    'III': { degree: 2, quality: 'maj' },
    'iii': { degree: 2, quality: 'min' },
    'IV': { degree: 3, quality: 'maj' },
    'iv': { degree: 3, quality: 'min' },
    'V': { degree: 4, quality: 'maj' },
    'v': { degree: 4, quality: 'min' },
    'VI': { degree: 5, quality: 'maj' },
    'vi': { degree: 5, quality: 'min' },
    'VII': { degree: 6, quality: 'maj' },
    'vii': { degree: 6, quality: 'min' },
    'vii°': { degree: 6, quality: 'dim' },
    'viio': { degree: 6, quality: 'dim' },
    'Imaj7': { degree: 0, quality: 'maj7' },
    'ii7': { degree: 1, quality: 'min7' },
    'IVmaj7': { degree: 3, quality: 'maj7' },
    'V7': { degree: 4, quality: 'dom7' },
    'vi7': { degree: 5, quality: 'min7' },
  };

  if (romanMap[s]) {
    const scaleIntervals = SCALES[scale] || SCALES['Natural Minor (Aeolian)'] || [0, 2, 4, 5, 7, 9, 11];
    const rootIdx = NOTE_NAMES.indexOf(rootKey);
    const semitones = scaleIntervals[romanMap[s].degree % scaleIntervals.length];
    const rootMidi = 48 + ((rootIdx + semitones) % 12);
    const intervals = CHORD_INTERVALS[romanMap[s].quality] || [0, 4, 7];
    return intervals.map((inter) => midiToFreq(rootMidi + inter));
  }

  // Parse root note and chord quality: e.g. "Cmaj7", "Am7", "F#m", "Ddim", "Eb9", "G7", "C3", "A2"
  const match = s.match(/^([A-G]#?)([^0-9\-]*)(-?\d+)?$/i);
  if (!match) return [261.63];

  const noteBase = match[1].toUpperCase();
  const qualityRaw = (match[2] || '').toLowerCase().trim();
  const octave = match[3] !== undefined ? parseInt(match[3], 10) : 3;

  const noteIndex = NOTE_NAMES.indexOf(noteBase);
  if (noteIndex === -1) return [261.63];

  const baseMidi = (octave + 1) * 12 + noteIndex;

  // Determine chord quality
  let intervals = [0, 4, 7]; // default major triad
  if (qualityRaw.includes('min7') || qualityRaw.includes('m7')) {
    intervals = CHORD_INTERVALS['min7'];
  } else if (qualityRaw.includes('maj7')) {
    intervals = CHORD_INTERVALS['maj7'];
  } else if (qualityRaw.includes('7')) {
    intervals = CHORD_INTERVALS['dom7'];
  } else if (qualityRaw.includes('m') || qualityRaw.includes('min')) {
    intervals = CHORD_INTERVALS['min'];
  } else if (qualityRaw.includes('dim')) {
    intervals = CHORD_INTERVALS['dim'];
  } else if (qualityRaw.includes('aug')) {
    intervals = CHORD_INTERVALS['aug'];
  } else if (qualityRaw.includes('sus4')) {
    intervals = CHORD_INTERVALS['sus4'];
  } else if (qualityRaw.includes('sus2')) {
    intervals = CHORD_INTERVALS['sus2'];
  } else if (qualityRaw.includes('9') || qualityRaw.includes('add9')) {
    intervals = CHORD_INTERVALS['add9'];
  } else if (qualityRaw.includes('5') || qualityRaw.includes('power')) {
    intervals = CHORD_INTERVALS['power'];
  } else {
    // Diatonic chord from the active scale
    const rootIdx = NOTE_NAMES.indexOf(rootKey);
    const semitonesFromRoot = (noteIndex - rootIdx + 12) % 12;
    const scaleIntervals = SCALES[scale] || SCALES['Natural Minor (Aeolian)'] || [0, 2, 4, 5, 7, 9, 11];
    const degreeIndex = scaleIntervals.indexOf(semitonesFromRoot);

    if (degreeIndex !== -1) {
      const thirdDegree = (degreeIndex + 2) % scaleIntervals.length;
      const fifthDegree = (degreeIndex + 4) % scaleIntervals.length;

      const rootSemitones = scaleIntervals[degreeIndex];
      const thirdSemitones = scaleIntervals[thirdDegree] + (thirdDegree < degreeIndex ? 12 : 0);
      const fifthSemitones = scaleIntervals[fifthDegree] + (fifthDegree < degreeIndex ? 12 : 0);

      const thirdDiff = thirdSemitones - rootSemitones;
      const fifthDiff = fifthSemitones - rootSemitones;

      intervals = [0, thirdDiff, fifthDiff];
    }
  }

  return intervals.map((inter) => midiToFreq(baseMidi + inter));
}

// Convert chord name / Roman numeral into an array of MIDI pitch numbers (for MIDI export & sequencer visualization)
export function getChordMidiNotes(chordStr: string, rootKey = 'C', scale = 'Natural Minor (Aeolian)'): number[] {
  if (!chordStr || chordStr === 'REST') return [60];

  let s = chordStr.trim();
  for (const [flat, sharp] of Object.entries(FLAT_TO_SHARP_MAP)) {
    if (s.startsWith(flat)) {
      s = sharp + s.slice(flat.length);
      break;
    }
  }

  const romanMap: Record<string, { degree: number; quality: string }> = {
    'I': { degree: 0, quality: 'maj' },
    'i': { degree: 0, quality: 'min' },
    'II': { degree: 1, quality: 'maj' },
    'ii': { degree: 1, quality: 'min' },
    'III': { degree: 2, quality: 'maj' },
    'iii': { degree: 2, quality: 'min' },
    'IV': { degree: 3, quality: 'maj' },
    'iv': { degree: 3, quality: 'min' },
    'V': { degree: 4, quality: 'maj' },
    'v': { degree: 4, quality: 'min' },
    'VI': { degree: 5, quality: 'maj' },
    'vi': { degree: 5, quality: 'min' },
    'VII': { degree: 6, quality: 'maj' },
    'vii': { degree: 6, quality: 'min' },
    'vii°': { degree: 6, quality: 'dim' },
    'viio': { degree: 6, quality: 'dim' },
    'Imaj7': { degree: 0, quality: 'maj7' },
    'ii7': { degree: 1, quality: 'min7' },
    'IVmaj7': { degree: 3, quality: 'maj7' },
    'V7': { degree: 4, quality: 'dom7' },
    'vi7': { degree: 5, quality: 'min7' },
  };

  if (romanMap[s]) {
    const scaleIntervals = SCALES[scale] || SCALES['Natural Minor (Aeolian)'] || [0, 2, 4, 5, 7, 9, 11];
    const rootIdx = NOTE_NAMES.indexOf(rootKey);
    const semitones = scaleIntervals[romanMap[s].degree % scaleIntervals.length];
    const rootMidi = 48 + ((rootIdx + semitones) % 12);
    const intervals = CHORD_INTERVALS[romanMap[s].quality] || [0, 4, 7];
    return intervals.map((inter) => rootMidi + inter);
  }

  const match = s.match(/^([A-G]#?)([^0-9\-]*)(-?\d+)?$/i);
  if (!match) return [60];

  const noteBase = match[1].toUpperCase();
  const qualityRaw = (match[2] || '').toLowerCase().trim();
  const octave = match[3] !== undefined ? parseInt(match[3], 10) : 4;
  const noteIndex = NOTE_NAMES.indexOf(noteBase);
  if (noteIndex === -1) return [60];

  const baseMidi = (octave + 1) * 12 + noteIndex;
  let intervals = [0, 4, 7];
  if (qualityRaw.includes('min7') || qualityRaw.includes('m7')) intervals = CHORD_INTERVALS['min7'];
  else if (qualityRaw.includes('maj7')) intervals = CHORD_INTERVALS['maj7'];
  else if (qualityRaw.includes('7')) intervals = CHORD_INTERVALS['dom7'];
  else if (qualityRaw.includes('m') || qualityRaw.includes('min')) intervals = CHORD_INTERVALS['min'];
  else if (qualityRaw.includes('dim')) intervals = CHORD_INTERVALS['dim'];
  else if (qualityRaw.includes('aug')) intervals = CHORD_INTERVALS['aug'];
  else if (qualityRaw.includes('sus4')) intervals = CHORD_INTERVALS['sus4'];
  else if (qualityRaw.includes('sus2')) intervals = CHORD_INTERVALS['sus2'];
  else if (qualityRaw.includes('9') || qualityRaw.includes('add9')) intervals = CHORD_INTERVALS['add9'];
  else if (qualityRaw.includes('5') || qualityRaw.includes('power')) intervals = CHORD_INTERVALS['power'];

  return intervals.map((inter) => baseMidi + inter);
}

// Euclidean rhythm generator: Bjorklund algorithm for polyrhythmic drum generation
export function generateEuclideanRhythm(steps: number, pulses: number, rotation = 0): boolean[] {
  if (pulses >= steps) return new Array(steps).fill(true);
  if (pulses <= 0) return new Array(steps).fill(false);

  let pattern: number[][] = [];
  for (let i = 0; i < steps; i++) {
    pattern.push([i < pulses ? 1 : 0]);
  }

  while (true) {
    let zeros: number[][] = [];
    let ones: number[][] = [];
    for (const p of pattern) {
      if (p[p.length - 1] === 1) ones.push(p);
      else zeros.push(p);
    }
    if (zeros.length <= 1 || ones.length <= 1) break;

    const minLen = Math.min(ones.length, zeros.length);
    const newPattern: number[][] = [];
    for (let i = 0; i < minLen; i++) {
      newPattern.push([...ones[i], ...zeros[i]]);
    }
    for (let i = minLen; i < ones.length; i++) newPattern.push(ones[i]);
    for (let i = minLen; i < zeros.length; i++) newPattern.push(zeros[i]);
    pattern = newPattern;
  }

  const flat = pattern.flat();
  const rotated: boolean[] = new Array(steps);
  for (let i = 0; i < steps; i++) {
    rotated[(i + rotation) % steps] = flat[i] === 1;
  }
  return rotated;
}

// Algorithmic progression generator for different genres
export interface SmartProgressionPreset {
  id: string;
  name: string;
  genre: string;
  mood: string;
  roman: string;
  degrees: number[]; // scale degree indices (0-based: 0=I, 1=ii, etc.)
  seventh: boolean[];
  description: string;
}

export const SMART_CHORD_PROGRESSIONS: SmartProgressionPreset[] = [
  {
    id: 'pop_axis',
    name: 'The 4-Chord Hit Anthem',
    genre: 'Pop / EDM',
    mood: 'Uplifting & Triumphant',
    roman: 'I - V - vi - IV',
    degrees: [0, 4, 5, 3],
    seventh: [false, false, false, false],
    description: 'The most popular chord progression in modern music history (Let It Be, With or Without You, Faded).',
  },
  {
    id: 'epic_cinematic',
    name: 'Epic Hero Journey',
    genre: 'Cinematic / Film',
    mood: 'Heroic & Dramatic',
    roman: 'vi - IV - I - V',
    degrees: [5, 3, 0, 4],
    seventh: [false, false, false, false],
    description: 'Dark, driving cinematic progression with intense emotional buildup (Interstellar, Hans Zimmer, Avengers).',
  },
  {
    id: 'synthwave_dark',
    name: 'Cyberpunk Neon Drive',
    genre: 'Darksynth / Retro',
    mood: 'Dystopian & Driving',
    roman: 'i - VI - III - VII',
    degrees: [0, 5, 2, 6],
    seventh: [false, false, false, false],
    description: 'Relentless driving bassline progression for night-drive 80s arpeggios (Stranger Things, Kavinsky, Perturbator).',
  },
  {
    id: 'lofi_chill',
    name: 'Lo-Fi Nostalgia Dream',
    genre: 'Lo-Fi / R&B',
    mood: 'Mellow & Warm',
    roman: 'ii7 - V7 - Imaj7 - vi7',
    degrees: [1, 4, 0, 5],
    seventh: [true, true, true, true],
    description: 'Rich jazz 7th chords with warm vinyl aesthetic and relaxed resolution (ChilledCow, Tomppabeats).',
  },
  {
    id: 'city_pop_royal',
    name: 'Japanese Royal Road (Oudou)',
    genre: 'City Pop / Anime',
    mood: 'Bittersweet & Joyful',
    roman: 'IVmaj7 - V7 - iii7 - vi',
    degrees: [3, 4, 2, 5],
    seventh: [true, true, true, false],
    description: 'The legendary Japanese "Royal Road" progression used in iconic J-Pop, anime themes, and 80s City Pop.',
  },
  {
    id: 'trap_dark_minor',
    name: '808 Underground Trap',
    genre: 'Trap / Hip-Hop',
    mood: 'Menacing & Heavy',
    roman: 'i - VI - v - i',
    degrees: [0, 5, 4, 0],
    seventh: [false, false, false, false],
    description: 'Dark minor gravity with heavy sub-bass weight, tension, and trap hi-hat energy (Metro Boomin, Travis Scott).',
  },
  {
    id: 'berlin_techno_hypnotic',
    name: 'Hypnotic Warehouse Drone',
    genre: 'Melodic Techno',
    mood: 'Hypnotic & Deep',
    roman: 'i - iv - VI - v',
    degrees: [0, 3, 5, 4],
    seventh: [false, false, false, false],
    description: 'Underground warehouse minimal movement emphasizing dynamic filter modulation and rolling kick sub.',
  },
  {
    id: 'andalusian_flamenco',
    name: 'Andalusian Spanish Cadence',
    genre: 'Flamenco / Latin',
    mood: 'Passionate & Tension',
    roman: 'i - VII - VI - V',
    degrees: [0, 6, 5, 4],
    seventh: [false, false, false, false],
    description: 'Descending Spanish cadence creating endless forward momentum and dramatic guitar/synth drama.',
  },
];

// Generate structured 16-step composition elements from a smart chord progression
export function generateSmartHarmonization(
  rootKey: string,
  scaleName: string,
  progression: SmartProgressionPreset
): {
  chordSequence: (string | null)[];
  bassSequence: (string | null)[];
  melodySequence: (string | null)[];
  chordNames: string[];
} {
  const rootIdx = NOTE_NAMES.indexOf(rootKey);
  const scale = SCALES[scaleName] || SCALES['Natural Minor (Aeolian)'];
  const isMinor = scaleName.includes('Minor') || scaleName.includes('Phrygian') || scaleName.includes('Dorian');

  const chordSequence: (string | null)[] = new Array(16).fill(null);
  const bassSequence: (string | null)[] = new Array(16).fill(null);
  const melodySequence: (string | null)[] = new Array(16).fill(null);
  const chordNames: string[] = [];

  // Each chord in the 4-chord progression spans 4 steps (0-3, 4-7, 8-11, 12-15)
  progression.degrees.forEach((deg, idx) => {
    const startStep = idx * 4;
    const semitonesFromRoot = scale[deg % scale.length] || 0;
    const chordRootNoteIdx = (rootIdx + semitonesFromRoot) % 12;
    const chordRootName = NOTE_NAMES[chordRootNoteIdx];

    // Determine chord quality (triad / 7th)
    const has7th = progression.seventh[idx];
    const isChordMinor = isMinor ? [0, 3, 4].includes(deg) : [1, 2, 5].includes(deg);
    const chordLabel = `${chordRootName}${isChordMinor ? 'm' : ''}${has7th ? (isChordMinor ? '7' : 'maj7') : ''}`;
    chordNames.push(chordLabel);

    // Root note for chords track
    chordSequence[startStep] = `${chordRootName}4`;

    // Bassline pattern: driving root on step 0 and octave/fifth on step 2
    bassSequence[startStep] = `${chordRootName}2`;
    bassSequence[startStep + 2] = `${chordRootName}2`;

    // Calculate chord tones for melody harmonization
    const thirdOffset = isChordMinor ? 3 : 4;
    const fifthOffset = 7;
    const thirdNote = NOTE_NAMES[(chordRootNoteIdx + thirdOffset) % 12];
    const fifthNote = NOTE_NAMES[(chordRootNoteIdx + fifthOffset) % 12];

    // Arpeggiated melody line targeting harmonic chord tones
    melodySequence[startStep] = `${chordRootName}4`;
    melodySequence[startStep + 1] = `${thirdNote}4`;
    melodySequence[startStep + 2] = `${fifthNote}4`;
    melodySequence[startStep + 3] = `${chordRootName}5`;
  });

  return {
    chordSequence,
    bassSequence,
    melodySequence,
    chordNames,
  };
}

// Generate Arpeggiator sequence from active notes
export function generateArpeggiatorPattern(
  notes: string[],
  pattern: 'up' | 'down' | 'up_down' | 'random' | 'chord',
  steps = 16,
  octaves = 1
): (string | null)[] {
  if (notes.length === 0) return new Array(steps).fill(null);

  // Expand notes across octaves
  const expandedNotes: string[] = [];
  for (let oct = 0; oct < octaves; oct++) {
    notes.forEach((n) => {
      const midi = noteToMidi(n) + oct * 12;
      expandedNotes.push(midiToNote(midi));
    });
  }

  const result: (string | null)[] = new Array(steps).fill(null);
  let noteIndex = 0;
  let direction = 1;

  for (let i = 0; i < steps; i++) {
    if (pattern === 'up') {
      result[i] = expandedNotes[i % expandedNotes.length];
    } else if (pattern === 'down') {
      result[i] = expandedNotes[(expandedNotes.length - 1 - (i % expandedNotes.length))];
    } else if (pattern === 'up_down') {
      result[i] = expandedNotes[noteIndex];
      noteIndex += direction;
      if (noteIndex >= expandedNotes.length - 1) {
        direction = -1;
      } else if (noteIndex <= 0) {
        direction = 1;
      }
    } else if (pattern === 'random') {
      const randIdx = Math.floor(Math.random() * expandedNotes.length);
      result[i] = expandedNotes[randIdx];
    } else if (pattern === 'chord') {
      result[i] = (i % 4 === 0) ? expandedNotes[0] : null;
    }
  }

  return result;
}

// Beginner Theory Knowledge Base for interactive explanations
export interface TheoryTopic {
  id: string;
  title: string;
  category: 'Synth & DSP' | 'Music Theory' | 'Production & Mixing' | 'C++ Audio';
  summary: string;
  plainEnglish: string;
  proTip: string;
  parametersExplained?: { name: string; desc: string }[];
}

export const THEORY_TOPICS: TheoryTopic[] = [
  {
    id: 'adsr',
    title: 'ADSR Envelope (Shape of Sound)',
    category: 'Synth & DSP',
    summary: 'The 4-stage amplitude envelope that shapes how a sound starts, sustains, and fades away.',
    plainEnglish: 'Think of Attack as how fast a sound strikes (instant like a piano or slow like a violin fade-in), Decay as how quickly it drops, Sustain as how loud it holds while you hold the key, and Release as the ring-out after releasing.',
    proTip: 'For punchy bass and leads, use Attack = 0.005s, Decay = 0.15s, Sustain = 0.4, Release = 0.2s. For atmospheric pads, use slow Attack > 0.4s and long Release > 1.2s.',
    parametersExplained: [
      { name: 'Attack', desc: 'Time taken to reach peak volume (0s = instant hit, 1s = slow swell).' },
      { name: 'Decay', desc: 'Time taken to fall from peak volume to the sustain level.' },
      { name: 'Sustain', desc: 'Volume level maintained while note is held (0% = pluck, 100% = organ).' },
      { name: 'Release', desc: 'Time taken for sound to fade to total silence after key release.' },
    ],
  },
  {
    id: 'filter_cutoff',
    title: 'Lowpass Filter Cutoff & Resonance (Q)',
    category: 'Synth & DSP',
    summary: 'A biquad or ladder frequency filter that cuts bright frequencies and boosts cutoff peaks.',
    plainEnglish: 'The Cutoff knob is like a brightness control: high frequency lets all sparkle through, low frequency muffles the sound like hearing music through a closed club door. Resonance makes the edge squeal or whistle.',
    proTip: 'In synthwave and acid techno, sweeping the cutoff with resonance set around 3.0 to 5.0 creates the famous 303 squelch.',
    parametersExplained: [
      { name: 'Cutoff (Hz)', desc: 'Frequency threshold where high frequencies begin rolling off.' },
      { name: 'Resonance (Q)', desc: 'Feedback boost at the cutoff frequency creating tonal resonance.' },
    ],
  },
  {
    id: 'scales_keys',
    title: 'Musical Scales & Safe Keys',
    category: 'Music Theory',
    summary: 'Sets of 5 to 7 pitch intervals that harmonize naturally together without dissonance.',
    plainEnglish: 'When you choose a Scale (like Minor or Major), our studio locks the piano roll so that every single note you click is guaranteed to sound pleasing and in harmony with the rest of the song.',
    proTip: 'Minor (Aeolian) and Dorian are perfect for moody, electronic, and synthwave styles. Major (Ionian) and Lydian are great for euphoric, uplifting house and pop.',
  },
  {
    id: 'euclidean_rhythms',
    title: 'Euclidean Polyrhythms (Math Drums)',
    category: 'Production & Mixing',
    summary: 'Distributes pulses as evenly as mathematically possible across a grid using the Bjorklund algorithm.',
    plainEnglish: 'Instead of clicking every drum step manually, tell the algorithm how many hits you want in 16 steps (e.g. 5 hits). It creates traditional African, Latin, and EDM grooves automatically.',
    proTip: 'Try 5 pulses over 16 steps for classic Cinquillo / Bossa Nova, or 7 pulses over 16 steps for driving Afrobeat / Techno.',
  },
  {
    id: 'sidechain',
    title: 'Sidechain Ducking & Groove Pumping',
    category: 'Production & Mixing',
    summary: 'Ducks the volume of pads and basslines every time the 4/4 kick drum hits to avoid low-end mud.',
    plainEnglish: 'In EDM and synthwave, whenever the bass drum kicks, the synths dip down for a split second and bounce back up. This gives the song its rhythmic heartbeat and keeps the kick punchy.',
    proTip: 'Set compressor threshold to -18dB with fast attack (5ms) and 150ms release for standard four-on-the-floor EDM pump.',
  },
  {
    id: 'cpp_dsp_architecture',
    title: 'C++ Real-Time Audio DSP Pipeline',
    category: 'C++ Audio',
    summary: 'Low-latency native DSP processing using sample-by-sample floating-point math.',
    plainEnglish: 'Professional DAWs and VST plugins run in C++ because it processes 44,100 floating point audio samples per second with microsecond latency and zero garbage collection pauses.',
    proTip: 'Use fast approximations like `fast_tanh` for distortion saturation and direct form II biquad difference equations for zero-delay filters.',
  },
];

// Algorithmic progression generator for different genres
export function generateProgression(rootKey: string, genre: string): { chords: string[]; bassNotes: string[]; chordNotesMap: Record<string, string[]> } {
  const rootIdx = NOTE_NAMES.indexOf(rootKey);
  const scale = (genre.toLowerCase().includes('major') || genre.toLowerCase().includes('pop')) 
    ? SCALES['Major (Ionian)'] 
    : SCALES['Natural Minor (Aeolian)'];

  // Degree offsets
  let degrees = [0, 5, 3, 4]; // i - VI - iv - v or I - vi - IV - V
  if (genre.includes('Synthwave') || genre.includes('Cyberpunk')) {
    degrees = [0, 5, 2, 6]; // i - VI - III - VII
  } else if (genre.includes('Ambient') || genre.includes('Chill')) {
    degrees = [0, 3, 5, 3]; // i - iv - VI - iv
  } else if (genre.includes('Chiptune') || genre.includes('8-Bit')) {
    degrees = [0, 4, 5, 3]; // i - v - VI - iv
  } else if (genre.includes('Jazz') || genre.includes('Lo-Fi')) {
    degrees = [1, 4, 0, 5]; // ii - V - I - vi
  }

  const chords: string[] = [];
  const bassNotes: string[] = [];
  const chordNotesMap: Record<string, string[]> = {};

  for (const deg of degrees) {
    const rootNoteIdx = (rootIdx + (scale[deg] || 0)) % 12;
    const rootName = NOTE_NAMES[rootNoteIdx];
    const bassNote = `${rootName}2`;
    bassNotes.push(bassNote);

    const isMinor = [1, 2, 5].includes(deg);
    const chordName = `${rootName}${isMinor ? 'm' : ''}`;
    chords.push(chordName);

    const chordIntervals = isMinor ? CHORD_INTERVALS['min'] : CHORD_INTERVALS['maj'];
    const notesInChord = chordIntervals.map(interval => {
      const midi = (4 + 1) * 12 + ((rootNoteIdx + interval) % 12);
      return midiToNote(midi);
    });
    chordNotesMap[chordName] = notesInChord;
  }

  return { chords, bassNotes, chordNotesMap };
}
