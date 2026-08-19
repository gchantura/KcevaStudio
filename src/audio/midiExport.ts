// Standard MIDI File (SMF Type 1) multi-track generator in pure TypeScript
import { MusicComposition } from '../types';
import { noteToMidi, getChordMidiNotes } from './musicTheory';

function writeVarLen(val: number): number[] {
  let buffer = val & 0x7f;
  const bytes: number[] = [];
  while ((val >>= 7)) {
    buffer <<= 8;
    buffer |= (val & 0x7f) | 0x80;
  }
  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) buffer >>= 8;
    else break;
  }
  return bytes;
}

function stringToBytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i) & 0xff);
  }
  return bytes;
}

export function generateMidiFile(comp: MusicComposition): Blob {
  const ticksPerBeat = 480; // Standard PPQ
  const ticksPer16th = ticksPerBeat / 4; // 120 ticks per step

  // Build Track Chunks
  const tracks: number[][] = [];

  // Track 0: Tempo & Time Signature & Meta
  const metaTrack: number[] = [];
  const usPerBeat = Math.round(60000000 / comp.tempo);
  metaTrack.push(0x00, 0xff, 0x51, 0x03, (usPerBeat >> 16) & 0xff, (usPerBeat >> 8) & 0xff, usPerBeat & 0xff);
  const nameBytes = stringToBytes(comp.title || 'Master Track');
  metaTrack.push(0x00, 0xff, 0x03, nameBytes.length, ...nameBytes);
  metaTrack.push(0x00, 0xff, 0x2f, 0x00);
  tracks.push(metaTrack);

  // Track 1: Melody (Channel 0)
  const melodyTrack: number[] = [];
  const melName = stringToBytes('Lead Melody');
  melodyTrack.push(0x00, 0xff, 0x03, melName.length, ...melName);
  let lastMelodyTick = 0;

  for (let step = 0; step < comp.stepsCount; step++) {
    const note = comp.melodySequence[step];
    if (note && note !== 'REST') {
      const midiPitch = noteToMidi(note);
      const noteStartTick = step * ticksPer16th;
      const noteDuration = Math.round(ticksPer16th * 1.5);

      const deltaOn = noteStartTick - lastMelodyTick;
      melodyTrack.push(...writeVarLen(deltaOn));
      melodyTrack.push(0x90, midiPitch, 100); // Note On channel 0, vel 100

      melodyTrack.push(...writeVarLen(noteDuration));
      melodyTrack.push(0x80, midiPitch, 0); // Note Off

      lastMelodyTick = noteStartTick + noteDuration;
    }
  }
  melodyTrack.push(0x00, 0xff, 0x2f, 0x00);
  tracks.push(melodyTrack);

  // Track 2: Bass (Channel 1)
  const bassTrack: number[] = [];
  const bassName = stringToBytes('Bassline');
  bassTrack.push(0x00, 0xff, 0x03, bassName.length, ...bassName);
  let lastBassTick = 0;

  for (let step = 0; step < comp.stepsCount; step++) {
    const note = comp.bassSequence[step];
    if (note && note !== 'REST') {
      const midiPitch = noteToMidi(note);
      const noteStartTick = step * ticksPer16th;
      const noteDuration = Math.round(ticksPer16th * 1.2);

      const deltaOn = noteStartTick - lastBassTick;
      bassTrack.push(...writeVarLen(deltaOn));
      bassTrack.push(0x91, midiPitch, 110); // Note On channel 1

      bassTrack.push(...writeVarLen(noteDuration));
      bassTrack.push(0x81, midiPitch, 0); // Note Off

      lastBassTick = noteStartTick + noteDuration;
    }
  }
  bassTrack.push(0x00, 0xff, 0x2f, 0x00);
  tracks.push(bassTrack);

  // Track 3: Chords / Harmony Polyphonic (Channel 2)
  const chordTrack: number[] = [];
  const chordName = stringToBytes('Chords / Pad');
  chordTrack.push(0x00, 0xff, 0x03, chordName.length, ...chordName);
  let lastChordTick = 0;

  for (let step = 0; step < comp.stepsCount; step++) {
    const chordVal = comp.chordSequence[step];
    if (chordVal && chordVal !== 'REST') {
      const chordsArr = Array.isArray(chordVal) ? chordVal : [chordVal];
      const chordPitches: number[] = [];
      chordsArr.forEach((c) => {
        if (c && c !== 'REST') {
          chordPitches.push(...getChordMidiNotes(c, comp.key, comp.scale));
        }
      });

      if (chordPitches.length > 0) {
        const noteStartTick = step * ticksPer16th;
        const noteDuration = Math.round(ticksPer16th * 3.5);

        chordPitches.forEach((pitch, pIdx) => {
          const deltaOn = pIdx === 0 ? noteStartTick - lastChordTick : 0;
          chordTrack.push(...writeVarLen(deltaOn));
          chordTrack.push(0x92, pitch, 90); // Note On channel 2
        });

        chordPitches.forEach((pitch, pIdx) => {
          const deltaOff = pIdx === 0 ? noteDuration : 0;
          chordTrack.push(...writeVarLen(deltaOff));
          chordTrack.push(0x82, pitch, 0); // Note Off
        });

        lastChordTick = noteStartTick + noteDuration;
      }
    }
  }
  chordTrack.push(0x00, 0xff, 0x2f, 0x00);
  tracks.push(chordTrack);

  // Track 4: 808 Drums (Channel 9 - General MIDI standard percussion channel)
  const drumTrack: number[] = [];
  const drumName = stringToBytes('808 Drums');
  drumTrack.push(0x00, 0xff, 0x03, drumName.length, ...drumName);
  let lastDrumTick = 0;

  const drumMidiMap = {
    kick: 36, // Bass Drum 1
    snare: 38, // Acoustic Snare
    hihat: 42, // Closed Hi-Hat
    openHat: 46, // Open Hi-Hat
    perc: 56, // Cowbell / Synth Perc
  };

  for (let step = 0; step < comp.stepsCount; step++) {
    const stepTick = step * ticksPer16th;
    const triggers: number[] = [];

    if (comp.drumPattern.kick[step]) triggers.push(drumMidiMap.kick);
    if (comp.drumPattern.snare[step]) triggers.push(drumMidiMap.snare);
    if (comp.drumPattern.hihat[step]) triggers.push(drumMidiMap.hihat);
    if (comp.drumPattern.openHat[step]) triggers.push(drumMidiMap.openHat);
    if (comp.drumPattern.perc[step]) triggers.push(drumMidiMap.perc);

    for (let t = 0; t < triggers.length; t++) {
      const noteNum = triggers[t];
      const deltaOn = t === 0 ? stepTick - lastDrumTick : 0;
      drumTrack.push(...writeVarLen(deltaOn));
      drumTrack.push(0x99, noteNum, 115); // Note On channel 10 (0x99)

      drumTrack.push(0x20); // 32 ticks later
      drumTrack.push(0x89, noteNum, 0); // Note Off

      lastDrumTick = stepTick + 32;
    }
  }
  drumTrack.push(0x00, 0xff, 0x2f, 0x00);
  tracks.push(drumTrack);

  // Custom User Lines (Channels 3, 4, 5...)
  if (comp.customLines && comp.customLines.length > 0) {
    comp.customLines.forEach((line, idx) => {
      const channel = Math.min(15, 3 + idx); // MIDI channels 3 to 15 (avoid 9)
      const chNum = channel === 9 ? 10 : channel;
      const customTrack: number[] = [];
      const lineName = stringToBytes(line.name || `Track ${idx + 1}`);
      customTrack.push(0x00, 0xff, 0x03, lineName.length, ...lineName);
      let lastLineTick = 0;

      for (let step = 0; step < comp.stepsCount; step++) {
        const note = line.sequence[step];
        if (note && note !== 'REST') {
          const midiPitch = noteToMidi(note);
          const noteStartTick = step * ticksPer16th;
          const noteDuration = Math.round(ticksPer16th * 1.5);

          const deltaOn = noteStartTick - lastLineTick;
          customTrack.push(...writeVarLen(deltaOn));
          customTrack.push(0x90 | chNum, midiPitch, 100);

          customTrack.push(...writeVarLen(noteDuration));
          customTrack.push(0x80 | chNum, midiPitch, 0);

          lastLineTick = noteStartTick + noteDuration;
        }
      }
      customTrack.push(0x00, 0xff, 0x2f, 0x00);
      tracks.push(customTrack);
    });
  }

  // Combine into complete SMF binary
  const fileBytes: number[] = [];

  // Header Chunk: "MThd", length 6, format 1 (multi-track), number of tracks, PPQ
  fileBytes.push(0x4d, 0x54, 0x68, 0x64); // 'MThd'
  fileBytes.push(0x00, 0x00, 0x00, 0x06); // header size = 6
  fileBytes.push(0x00, 0x01); // Format 1
  fileBytes.push((tracks.length >> 8) & 0xff, tracks.length & 0xff); // Num tracks
  fileBytes.push((ticksPerBeat >> 8) & 0xff, ticksPerBeat & 0xff); // Division

  // Append each Track Chunk: "MTrk", length, data
  for (const track of tracks) {
    fileBytes.push(0x4d, 0x54, 0x72, 0x6b); // 'MTrk'
    const len = track.length;
    fileBytes.push((len >> 24) & 0xff, (len >> 16) & 0xff, (len >> 8) & 0xff, len & 0xff);
    fileBytes.push(...track);
  }

  const u8Array = new Uint8Array(fileBytes);
  return new Blob([u8Array], { type: 'audio/midi' });
}
