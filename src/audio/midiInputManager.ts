// Web MIDI API Hardware Controller Manager: Connects physical USB MIDI Keyboards / Pads

import { audioDsp } from './dspEngine';
import { midiToNote, midiToFreq } from './musicTheory';

export interface MidiDeviceInfo {
  id: string;
  name: string;
  manufacturer: string;
  state: string;
}

export type MidiNoteCallback = (note: string, velocity: number, isNoteOn: boolean) => void;

class MidiInputManager {
  private midiAccess: any = null;
  private connectedDevices: MidiDeviceInfo[] = [];
  private onNoteListeners: Set<MidiNoteCallback> = new Set();
  private isSupported = false;

  constructor() {
    this.checkSupport();
  }

  public checkSupport(): boolean {
    if (typeof navigator !== 'undefined' && 'requestMIDIAccess' in navigator) {
      this.isSupported = true;
      return true;
    }
    this.isSupported = false;
    return false;
  }

  public async requestAccess(): Promise<boolean> {
    if (!this.checkSupport()) return false;

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this.updateDeviceList();

      this.midiAccess.onstatechange = () => {
        this.updateDeviceList();
      };

      // Listen to all inputs
      this.midiAccess.inputs.forEach((input) => {
        input.onmidimessage = this.handleMidiMessage;
      });

      return true;
    } catch (err) {
      console.warn('Web MIDI Access request denied or failed:', err);
      return false;
    }
  }

  private updateDeviceList() {
    if (!this.midiAccess) return;
    const devices: MidiDeviceInfo[] = [];
    this.midiAccess.inputs.forEach((input) => {
      devices.push({
        id: input.id,
        name: input.name || 'Generic MIDI Device',
        manufacturer: input.manufacturer || 'Unknown',
        state: input.state,
      });
    });
    this.connectedDevices = devices;
  }

  public getConnectedDevices(): MidiDeviceInfo[] {
    return [...this.connectedDevices];
  }

  public addNoteListener(callback: MidiNoteCallback) {
    this.onNoteListeners.add(callback);
    return () => {
      this.onNoteListeners.delete(callback);
    };
  }

  private handleMidiMessage = (event: any) => {
    const data = event.data;
    if (!data || data.length < 2) return;

    const status = data[0] >> 4;
    const channel = data[0] & 0xf;
    const noteMidi = data[1];
    const velocity = data[2] || 0;

    // 0x9 = Note On, 0x8 = Note Off
    if (status === 9 && velocity > 0) {
      // Note On
      const noteName = midiToNote(noteMidi);
      this.notifyListeners(noteName, velocity, true);
    } else if (status === 8 || (status === 9 && velocity === 0)) {
      // Note Off
      const noteName = midiToNote(noteMidi);
      this.notifyListeners(noteName, 0, false);
    }
  };

  private notifyListeners(note: string, velocity: number, isNoteOn: boolean) {
    this.onNoteListeners.forEach((fn) => {
      try {
        fn(note, velocity, isNoteOn);
      } catch (e) {
        console.error('Error in MIDI note listener:', e);
      }
    });
  }
}

export const midiManager = new MidiInputManager();
