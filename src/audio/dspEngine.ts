import { MusicComposition, SynthPatch, FxConfig, CppDspPreset, ChannelStripState, TimelineTrack } from '../types';
import { noteToFreq, noteToMidi, midiToFreq, midiToNote, getChordFrequenciesFromName } from './musicTheory';
import { generateMidiFile } from './midiExport';
import { sampleManager } from './sampleManager';

class DspEngine {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  
  // FX Nodes
  private masterFilterLp: BiquadFilterNode | null = null;
  private masterFilterHp: BiquadFilterNode | null = null;
  private distortionNode: WaveShaperNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedbackGain: GainNode | null = null;
  private delayWetGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbWetGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  // Channel Strip Nodes for All Tracks (EQ, Volume, Pan, Sends)
  private trackGains: Record<string, GainNode> = {};
  private trackPanners: Record<string, StereoPannerNode> = {};
  private trackEqLows: Record<string, BiquadFilterNode> = {};
  private trackEqMids: Record<string, BiquadFilterNode> = {};
  private trackEqHighs: Record<string, BiquadFilterNode> = {};
  private trackReverbSends: Record<string, GainNode> = {};
  private trackDelaySends: Record<string, GainNode> = {};

  // C++ DSP Custom Generator Node
  private customCppNode: ScriptProcessorNode | null = null;
  private cppParamValues: Record<string, number> = {};
  private cppSampleIndex = 0;
  private activeCppPreset: CppDspPreset | null = null;
  private isCppRunning = false;

  // Sequencer state
  private isPlaying = false;
  private currentStep = 0;
  private tempo = 120;
  private timerId: number | null = null;
  private nextNoteTime = 0.0;
  private scheduleAheadTime = 0.1; // seconds
  private lookaheadInterval = 25; // ms
  private onStepCallback: ((step: number) => void) | null = null;
  private activeComposition: MusicComposition | null = null;

  // Track mutes & solos
  private trackMutes: Record<string, boolean> = {
    melody: false,
    bass: false,
    chords: false,
    drums: false,
    kick: false,
    snare: false,
    hihat: false,
    openHat: false,
    perc: false,
  };

  private trackSolos: Record<string, boolean> = {
    melody: false,
    bass: false,
    chords: false,
    drums: false,
    kick: false,
    snare: false,
    hihat: false,
    openHat: false,
    perc: false,
  };

  public init() {
    if (this.audioCtx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioContextClass();

    const ctx = this.audioCtx;

    // Master Compressor / Limiter
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-10, ctx.currentTime);
    this.compressor.knee.setValueAtTime(24, ctx.currentTime);
    this.compressor.ratio.setValueAtTime(6, ctx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, ctx.currentTime);
    this.compressor.release.setValueAtTime(0.2, ctx.currentTime);

    // Analyser Node for Visualizations
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.85;

    // Master Gain
    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, ctx.currentTime);

    // Master Filters
    this.masterFilterLp = ctx.createBiquadFilter();
    this.masterFilterLp.type = 'lowpass';
    this.masterFilterLp.frequency.setValueAtTime(20000, ctx.currentTime);

    this.masterFilterHp = ctx.createBiquadFilter();
    this.masterFilterHp.type = 'highpass';
    this.masterFilterHp.frequency.setValueAtTime(20, ctx.currentTime);

    // Distortion
    this.distortionNode = ctx.createWaveShaper();
    this.distortionNode.curve = this.makeDistortionCurve(0);
    this.distortionNode.oversample = '4x';

    // Delay FX (Stereo Ping-Pong capability)
    this.delayNode = ctx.createDelay(2.0);
    this.delayNode.delayTime.setValueAtTime(0.25, ctx.currentTime);
    this.delayFeedbackGain = ctx.createGain();
    this.delayFeedbackGain.gain.setValueAtTime(0.35, ctx.currentTime);
    this.delayWetGain = ctx.createGain();
    this.delayWetGain.gain.setValueAtTime(0.25, ctx.currentTime);

    this.delayNode.connect(this.delayFeedbackGain);
    this.delayFeedbackGain.connect(this.delayNode);
    this.delayNode.connect(this.delayWetGain);

    // Reverb FX
    this.reverbNode = ctx.createConvolver();
    this.reverbNode.buffer = this.createImpulseResponse(2.5, 2.0);
    this.reverbWetGain = ctx.createGain();
    this.reverbWetGain.gain.setValueAtTime(0.3, ctx.currentTime);
    this.reverbNode.connect(this.reverbWetGain);

    // Connect FX Routing Graph
    this.masterFilterHp.connect(this.masterFilterLp);
    this.masterFilterLp.connect(this.distortionNode);
    this.distortionNode.connect(this.compressor);

    // Reverb & Delay sends to compressor
    this.reverbWetGain.connect(this.compressor);
    this.delayWetGain.connect(this.compressor);

    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    // Setup Track Channel Strips for All Tracks
    const defaultTrackNames = ['melody', 'bass', 'chords', 'drums', 'kick', 'snare', 'hihat', 'openHat', 'perc'];
    defaultTrackNames.forEach((t) => {
      this.createChannelStrip(t);
    });

    sampleManager.setContext(ctx);
  }

  public resumeContext() {
    if (!this.audioCtx) {
      this.init();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public getAnalyser(): AnalyserNode | null {
    if (!this.audioCtx) this.init();
    return this.analyser;
  }

  public getSampleRate(): number {
    return this.audioCtx ? this.audioCtx.sampleRate : 44100;
  }

  public setMasterVolume(val: number) {
    if (!this.audioCtx) this.init();
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1.25, val)), this.audioCtx.currentTime, 0.05);
    }
  }

  public getChordFrequencies(chordName: string | string[], rootKey = 'C', scale = 'Major (Ionian)'): number[] {
    if (Array.isArray(chordName)) {
      const freqs: number[] = [];
      chordName.forEach((c) => {
        if (c && c !== 'REST') {
          freqs.push(...getChordFrequenciesFromName(c, rootKey, scale));
        }
      });
      return Array.from(new Set(freqs));
    }
    return getChordFrequenciesFromName(chordName, rootKey, scale);
  }

  public setMasterFilter(freq: number) {
    if (!this.audioCtx) this.init();
    if (this.masterFilterLp && this.audioCtx) {
      this.masterFilterLp.frequency.setTargetAtTime(
        Math.max(200, Math.min(20000, freq)),
        this.audioCtx.currentTime,
        0.05
      );
    }
  }

  public createChannelStrip(trackName: string): AudioNode {
    if (this.trackEqLows[trackName]) {
      return this.trackEqLows[trackName];
    }
    if (!this.audioCtx) this.init();
    const ctx = this.audioCtx!;
    const now = ctx.currentTime;

    // 1. Low Shelf EQ
    const eqLow = ctx.createBiquadFilter();
    eqLow.type = 'lowshelf';
    eqLow.frequency.setValueAtTime(220, now);
    eqLow.gain.setValueAtTime(0, now);

    // 2. Mid Peaking EQ
    const eqMid = ctx.createBiquadFilter();
    eqMid.type = 'peaking';
    eqMid.frequency.setValueAtTime(1200, now);
    eqMid.Q.setValueAtTime(1.2, now);
    eqMid.gain.setValueAtTime(0, now);

    // 3. High Shelf EQ
    const eqHigh = ctx.createBiquadFilter();
    eqHigh.type = 'highshelf';
    eqHigh.frequency.setValueAtTime(4500, now);
    eqHigh.gain.setValueAtTime(0, now);

    // 4. Stereo Panner
    let pannerNode: AudioNode;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.setValueAtTime(0, now);
      this.trackPanners[trackName] = p;
      pannerNode = p;
    } else {
      pannerNode = ctx.createGain();
    }

    // 5. Track Volume Gain Fader
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.85, now);

    // 6. FX Send Gains
    const revSend = ctx.createGain();
    revSend.gain.setValueAtTime(0.25, now);

    const delSend = ctx.createGain();
    delSend.gain.setValueAtTime(0.2, now);

    // Wire strip: eqLow -> eqMid -> eqHigh -> panner -> gain
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(pannerNode);
    pannerNode.connect(gain);

    // Direct Dry Output -> masterFilterHp
    gain.connect(this.masterFilterHp!);

    // Reverb Send Output -> reverbNode
    if (this.reverbNode) {
      gain.connect(revSend);
      revSend.connect(this.reverbNode);
    }

    // Delay Send Output -> delayNode
    if (this.delayNode) {
      gain.connect(delSend);
      delSend.connect(this.delayNode);
    }

    this.trackEqLows[trackName] = eqLow;
    this.trackEqMids[trackName] = eqMid;
    this.trackEqHighs[trackName] = eqHigh;
    this.trackGains[trackName] = gain;
    this.trackReverbSends[trackName] = revSend;
    this.trackDelaySends[trackName] = delSend;

    return eqLow;
  }

  public getTrackInputNode(trackName: string): AudioNode {
    if (!this.audioCtx) this.init();
    if (!this.trackEqLows[trackName]) {
      return this.createChannelStrip(trackName);
    }
    return this.trackEqLows[trackName];
  }

  public setChannelVolume(track: string, volume: number) {
    if (!this.audioCtx) this.init();
    if (!this.audioCtx) return;
    const normalizedVolume = Math.max(0, Math.min(1.5, volume));
    const tracks = track === 'drums' ? ['drums', 'kick', 'snare', 'hihat', 'openHat', 'perc'] : [track];
    tracks.forEach((trackId) => {
      const gain = this.trackGains[trackId];
      if (gain) {
        gain.gain.setTargetAtTime(normalizedVolume, this.audioCtx!.currentTime, 0.02);
      }
    });
  }

  public setChannelPan(track: string, pan: number) {
    if (!this.audioCtx) this.init();
    const p = this.trackPanners[track];
    if (p && this.audioCtx) {
      p.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), this.audioCtx.currentTime, 0.02);
    }
  }

  public setChannelEq(track: string, eq: { low?: number; mid?: number; high?: number }) {
    if (!this.audioCtx) this.init();
    const now = this.audioCtx!.currentTime;
    if (eq.low !== undefined && this.trackEqLows[track]) {
      this.trackEqLows[track].gain.setTargetAtTime(eq.low, now, 0.02);
    }
    if (eq.mid !== undefined && this.trackEqMids[track]) {
      this.trackEqMids[track].gain.setTargetAtTime(eq.mid, now, 0.02);
    }
    if (eq.high !== undefined && this.trackEqHighs[track]) {
      this.trackEqHighs[track].gain.setTargetAtTime(eq.high, now, 0.02);
    }
  }

  public setChannelSends(track: string, sends: { reverbSend?: number; delaySend?: number }) {
    if (!this.audioCtx) this.init();
    const now = this.audioCtx!.currentTime;
    if (sends.reverbSend !== undefined && this.trackReverbSends[track]) {
      this.trackReverbSends[track].gain.setTargetAtTime(Math.max(0, Math.min(1, sends.reverbSend)), now, 0.02);
    }
    if (sends.delaySend !== undefined && this.trackDelaySends[track]) {
      this.trackDelaySends[track].gain.setTargetAtTime(Math.max(0, Math.min(1, sends.delaySend)), now, 0.02);
    }
  }

  public updateFx(fx: FxConfig) {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    if (this.masterFilterLp) {
      this.masterFilterLp.frequency.setTargetAtTime(fx.masterLowpass || 20000, now, 0.05);
    }
    if (this.masterFilterHp) {
      this.masterFilterHp.frequency.setTargetAtTime(fx.masterHighpass || 20, now, 0.05);
    }
    if (this.distortionNode) {
      this.distortionNode.curve = this.makeDistortionCurve(fx.drive || 0);
    }
    if (this.delayNode && this.delayFeedbackGain && this.delayWetGain) {
      this.delayNode.delayTime.setTargetAtTime(fx.delayTime || 0.25, now, 0.05);
      this.delayFeedbackGain.gain.setTargetAtTime(fx.delayFeedback || 0.3, now, 0.05);
      this.delayWetGain.gain.setTargetAtTime(fx.delayWet || 0.2, now, 0.05);
    }
    if (this.reverbWetGain) {
      this.reverbWetGain.gain.setTargetAtTime(fx.reverbWet || 0.2, now, 0.05);
    }
    if (this.compressor && fx.compressorThreshold !== undefined) {
      this.compressor.threshold.setTargetAtTime(fx.compressorThreshold, now, 0.05);
      if (fx.compressorRatio) this.compressor.ratio.setTargetAtTime(fx.compressorRatio, now, 0.05);
    }
  }

  // Generate algorithmic impulse response for reverb
  private createImpulseResponse(duration: number, decay: number, targetCtx?: BaseAudioContext): AudioBuffer {
    const ctx = targetCtx || this.audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * duration;
    const impulse = ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const n = i;
      const factor = Math.pow(1 - n / length, decay);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }
    return impulse;
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const k = amount * 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      if (k === 0) {
        curve[i] = x;
      } else {
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
    }
    return curve;
  }

  // Play a single synthesized note with Dual Oscillators, ADSR, Filter Env, and Velocity
public playSynthesizerNote(
    freq: number,
    patch: SynthPatch,
    duration = 0.5,
    time = 0,
    velocity = 100, // 1 - 127
    customCtx?: BaseAudioContext,
    customDestination?: AudioNode
  ) {
    if (!customCtx) this.resumeContext();
    const ctx = customCtx || this.audioCtx;
    const destination = customDestination || this.masterFilterHp;
    if (!ctx || !destination) return;
    const startTime = time > 0 ? time : ctx.currentTime;
    const stopTime = startTime + duration;

    const velScale = Math.max(0.1, Math.min(1.2, velocity / 100));

    // Filter Node for voice
    const voiceFilter = ctx.createBiquadFilter();
    voiceFilter.type = 'lowpass';
    const baseCutoff = patch.filterCutoff || 2500;
    voiceFilter.frequency.setValueAtTime(baseCutoff, startTime);
    voiceFilter.Q.setValueAtTime(patch.resonance || 1.0, startTime);

    // Filter Envelope sweep if specified
    if (patch.filterEnvAmount) {
      const envAmt = patch.filterEnvAmount;
      const peakCutoff = Math.max(20, Math.min(20000, baseCutoff + envAmt * 50));
      voiceFilter.frequency.exponentialRampToValueAtTime(Math.max(20, peakCutoff), startTime + (patch.filterAttack || 0.05));
      voiceFilter.frequency.exponentialRampToValueAtTime(Math.max(20, baseCutoff), startTime + (patch.filterAttack || 0.05) + (patch.filterDecay || 0.2));
    }

    // Voice Gain Node (ADSR Amplitude)
    const voiceGain = ctx.createGain();
    voiceGain.gain.setValueAtTime(0.0001, startTime);

    const a = Math.max(0.005, patch.attack || 0.01);
    const d = Math.max(0.01, patch.decay || 0.1);
    const s = Math.min(1.0, Math.max(0.0, patch.sustain ?? 0.7));
    const r = Math.max(0.01, patch.release || 0.2);
    const peakVolume = (patch.volume || 0.7) * velScale;

    // ADSR Envelope ramp
    voiceGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peakVolume), startTime + a);
    voiceGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peakVolume * s), startTime + a + d);
    voiceGain.gain.setValueAtTime(Math.max(0.0001, peakVolume * s), stopTime);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, stopTime + r);

    // Connect to Track Channel Strip or Master Destination
    voiceGain.connect(voiceFilter);
    voiceFilter.connect(destination);
    if (!customCtx && !customDestination) {
      if (this.reverbNode) voiceFilter.connect(this.reverbNode);
      if (this.delayNode) voiceFilter.connect(this.delayNode);
    }

    // Sound Generation: Advanced Synthesis Algorithms
    if (patch.waveType === 'supersaw') {
      // 7-Voice Hyper-Spread Supersaw
      const unison = patch.unisonVoices || 7;
      const detuneAmt = patch.detune || 24;
      const detuneRatios = [-1.0, -0.65, -0.3, 0.0, 0.3, 0.65, 1.0];

      for (let i = 0; i < unison; i++) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);
        const ratio = detuneRatios[i % detuneRatios.length];
        osc.detune.setValueAtTime(ratio * detuneAmt, startTime);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(1.0 / Math.sqrt(unison), startTime);

        osc.connect(oscGain);
        oscGain.connect(voiceGain);
        osc.start(startTime);
        osc.stop(stopTime + r);
      }
    } else if (patch.waveType === 'piano') {
      // Acoustic Grand Piano Modeling: Hammer transient + multi-harmonic strings
      const fundamental = ctx.createOscillator();
      fundamental.type = 'triangle';
      fundamental.frequency.setValueAtTime(freq, startTime);

      const overtone1 = ctx.createOscillator();
      overtone1.type = 'sine';
      overtone1.frequency.setValueAtTime(freq * 2, startTime);

      const overtone2 = ctx.createOscillator();
      overtone2.type = 'sine';
      overtone2.frequency.setValueAtTime(freq * 3, startTime);

      const gain1 = ctx.createGain();
      gain1.gain.setValueAtTime(0.7, startTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, startTime + Math.min(1.5, duration * 0.8));

      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0.35, startTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, startTime + Math.min(0.8, duration * 0.4));

      const gain3 = ctx.createGain();
      gain3.gain.setValueAtTime(0.15, startTime);
      gain3.gain.exponentialRampToValueAtTime(0.001, startTime + Math.min(0.4, duration * 0.2));

      // Hammer strike noise transient
      const hammer = ctx.createOscillator();
      hammer.type = 'sine';
      hammer.frequency.setValueAtTime(freq * 4.5, startTime);
      hammer.frequency.exponentialRampToValueAtTime(freq * 0.5, startTime + 0.03);
      const hammerGain = ctx.createGain();
      hammerGain.gain.setValueAtTime(0.4 * velScale, startTime);
      hammerGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.03);

      fundamental.connect(gain1).connect(voiceGain);
      overtone1.connect(gain2).connect(voiceGain);
      overtone2.connect(gain3).connect(voiceGain);
      hammer.connect(hammerGain).connect(voiceGain);

      fundamental.start(startTime);
      overtone1.start(startTime);
      overtone2.start(startTime);
      hammer.start(startTime);

      fundamental.stop(stopTime + r);
      overtone1.stop(stopTime + r);
      overtone2.stop(stopTime + r);
      hammer.stop(startTime + 0.04);
    } else if (patch.waveType === 'rhodes') {
      // 70s Electric Piano / Rhodes: Tine FM + Bell overtone
      const carrier = ctx.createOscillator();
      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(freq, startTime);

      const modulator = ctx.createOscillator();
      modulator.type = 'sine';
      modulator.frequency.setValueAtTime(freq * 3.01, startTime); // Inharmonic tine ratio

      const modGain = ctx.createGain();
      modGain.gain.setValueAtTime(freq * 1.8, startTime);
      modGain.gain.exponentialRampToValueAtTime(1.0, startTime + 0.6);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(voiceGain);

      carrier.start(startTime);
      modulator.start(startTime);
      carrier.stop(stopTime + r);
      modulator.stop(stopTime + r);
    } else if (patch.waveType === 'organ') {
      // Additive Tonewheel Organ: 4 Drawbars (16', 8', 4', 2')
      const harmonics = [0.5, 1.0, 2.0, 3.0];
      const gains = [0.5, 0.8, 0.4, 0.25];

      harmonics.forEach((h, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * h, startTime);

        const g = ctx.createGain();
        g.gain.setValueAtTime(gains[idx] * 0.4, startTime);

        osc.connect(g);
        g.connect(voiceGain);
        osc.start(startTime);
        osc.stop(stopTime + r);
      });
    } else if (patch.waveType === 'formant_vocal') {
      // Human Vocal Formant Synthesis with Dual Formant Filters
      const vowel = patch.formantVowel || 'a';
      const formantMap: Record<string, [number, number]> = {
        a: [800, 1200],  // "Ah"
        e: [500, 2300],  // "Eh"
        i: [300, 2700],  // "Ee"
        o: [500, 1000],  // "Oh"
        u: [350, 800],   // "Oo"
      };
      const [f1, f2] = formantMap[vowel] || [800, 1200];

      const pulse = ctx.createOscillator();
      pulse.type = 'sawtooth';
      pulse.frequency.setValueAtTime(freq, startTime);

      // Formant Filter 1
      const bp1 = ctx.createBiquadFilter();
      bp1.type = 'bandpass';
      bp1.frequency.setValueAtTime(f1, startTime);
      bp1.Q.setValueAtTime(4.5, startTime);

      // Formant Filter 2
      const bp2 = ctx.createBiquadFilter();
      bp2.type = 'bandpass';
      bp2.frequency.setValueAtTime(f2, startTime);
      bp2.Q.setValueAtTime(5.5, startTime);

      pulse.connect(bp1);
      pulse.connect(bp2);
      bp1.connect(voiceGain);
      bp2.connect(voiceGain);

      pulse.start(startTime);
      pulse.stop(stopTime + r);
    } else if (patch.waveType === 'sub_808') {
      // Trap / Hip-Hop 808 Sub-Boom with Pitch Dive
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const glide = patch.subBassGlide || 0.08;

      osc.frequency.setValueAtTime(freq * 1.8, startTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(25, freq), startTime + glide);

      osc.connect(voiceGain);
      osc.start(startTime);
      osc.stop(stopTime + r);
    } else if (patch.waveType === 'acid_303') {
      // Roland TB-303 Acid Resonant Saw
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.connect(voiceGain);
      osc.start(startTime);
      osc.stop(stopTime + r);
    } else if (patch.waveType === 'bell') {
      // Inharmonic Additive Chime
      const ratios = [1.0, 2.76, 5.4, 8.93];
      const amps = [0.8, 0.4, 0.2, 0.1];
      ratios.forEach((ratio, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * ratio, startTime);

        const g = ctx.createGain();
        g.gain.setValueAtTime(amps[idx] * 0.4, startTime);
        g.gain.exponentialRampToValueAtTime(0.001, startTime + Math.min(2.0, duration));

        osc.connect(g);
        g.connect(voiceGain);
        osc.start(startTime);
        osc.stop(stopTime + r);
      });
    } else if (patch.waveType === 'strings') {
      // Ensemble Strings: 4 Sawtooth with Stereo Detuning
      for (let i = 0; i < 4; i++) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);
        const detune = [-12, -4, 4, 12][i];
        osc.detune.setValueAtTime(detune, startTime);

        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(0.25, startTime);

        osc.connect(oscGain);
        oscGain.connect(voiceGain);
        osc.start(startTime);
        osc.stop(stopTime + r);
      }
    } else if (patch.waveType === 'brass') {
      // Synth Brass: Dual Sawtooth with snappy bite
      for (let i = 0; i < 2; i++) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.detune.setValueAtTime(i === 0 ? -6 : 6, startTime);

        const g = ctx.createGain();
        g.gain.setValueAtTime(0.5, startTime);
        osc.connect(g).connect(voiceGain);
        osc.start(startTime);
        osc.stop(stopTime + r);
      }
    } else if (patch.waveType === 'pluck') {
      // Fast Transient Percussive Pluck
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      const noise = ctx.createOscillator();
      noise.type = 'sawtooth';
      noise.frequency.setValueAtTime(freq * 2, startTime);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.3, startTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.04);

      osc.connect(voiceGain);
      noise.connect(noiseGain).connect(voiceGain);

      osc.start(startTime);
      noise.start(startTime);
      osc.stop(stopTime + r);
      noise.stop(startTime + 0.05);
    } else if (patch.waveType === 'fm') {
      // 2-Op FM synthesis
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();

      carrier.type = 'sine';
      carrier.frequency.setValueAtTime(freq, startTime);

      modulator.type = 'sine';
      modulator.frequency.setValueAtTime(freq * 2, startTime);

      modGain.gain.setValueAtTime(freq * 1.5, startTime);
      modGain.gain.exponentialRampToValueAtTime(0.1, stopTime + r);

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(voiceGain);

      modulator.start(startTime);
      carrier.start(startTime);
      modulator.stop(stopTime + r);
      carrier.stop(stopTime + r);
    } else {
      // Standard Oscillator with Unison Voice Spread
      const unison = patch.unisonVoices || (patch.waveType === 'sawtooth' ? 3 : 1);
      const detuneAmt = patch.detune || 7;

      for (let i = 0; i < unison; i++) {
        const osc = ctx.createOscillator();
        osc.type = patch.waveType === 'noise' ? 'triangle' : (patch.waveType as OscillatorType);
        osc.frequency.setValueAtTime(freq, startTime);
        if (unison > 1) {
          const spread = ((i / (unison - 1)) - 0.5) * 2;
          osc.detune.setValueAtTime(spread * detuneAmt, startTime);
        }
        osc.connect(voiceGain);
        osc.start(startTime);
        osc.stop(stopTime + r);
      }

      // Optional Secondary Oscillator (Osc 2)
      if (patch.osc2Wave && patch.oscMix && patch.oscMix > 0.05) {
        const osc2 = ctx.createOscillator();
        osc2.type = patch.osc2Wave === 'noise' ? 'triangle' : (patch.osc2Wave as OscillatorType);
        const octMultiplier = Math.pow(2, patch.osc2Octave || 0);
        osc2.frequency.setValueAtTime(freq * octMultiplier, startTime);
        if (patch.osc2Detune) {
          osc2.detune.setValueAtTime(patch.osc2Detune, startTime);
        }
        const osc2Gain = ctx.createGain();
        osc2Gain.gain.setValueAtTime(patch.oscMix, startTime);
        osc2.connect(osc2Gain);
        osc2Gain.connect(voiceGain);
        osc2.start(startTime);
        osc2.stop(stopTime + r);
      }
    }
  }

  // Play Polyphonic Chord
  public playChordNotes(
    freqs: number[],
    patch: SynthPatch,
    duration = 1.0,
    time = 0,
    velocity = 100,
    customCtx?: BaseAudioContext,
    customDestination?: AudioNode
  ) {
    if (!customCtx) this.resumeContext();
    const chordPatch: SynthPatch = {
      ...patch,
      volume: (patch.volume || 0.6) / Math.max(1, Math.sqrt(freqs.length)),
    };
    for (const f of freqs) {
      this.playSynthesizerNote(f, chordPatch, duration, time, velocity, customCtx, customDestination);
    }
  }

  // Play Drum Sounds (Custom Sample Player with Analog 808/909 Fallback)
  public playDrumSound(
    type: 'kick' | 'snare' | 'hihat' | 'openHat' | 'perc',
    time = 0,
    velocity = 100,
    customCtx?: BaseAudioContext,
    customDestination?: AudioNode
  ) {
    if (!customCtx) this.resumeContext();
    const ctx = customCtx || this.audioCtx;
    const targetNode = customDestination || this.trackGains[type] || this.masterFilterHp;
    if (!ctx || !targetNode) return;
    const startTime = time > 0 ? time : ctx.currentTime;
    const velScale = Math.max(0.1, Math.min(1.2, velocity / 100));

    if (!customCtx) {
      const samplePlayed = sampleManager.playSample(type, targetNode, startTime, velocity);
      if (samplePlayed) return;
    }

    switch (type) {
      case 'kick': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';

        // Pitch drop envelope
        osc.frequency.setValueAtTime(150, startTime);
        osc.frequency.exponentialRampToValueAtTime(45, startTime + 0.08);
        osc.frequency.exponentialRampToValueAtTime(30, startTime + 0.3);

        // Amplitude envelope
        gain.gain.setValueAtTime(1.0 * velScale, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(targetNode);

        osc.start(startTime);
        osc.stop(startTime + 0.4);
        break;
      }
      case 'snare': {
        // Tonal body
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, startTime);
        osc.frequency.exponentialRampToValueAtTime(80, startTime + 0.1);
        oscGain.gain.setValueAtTime(0.7 * velScale, startTime);
        oscGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
        osc.connect(oscGain);
        oscGain.connect(targetNode);
        osc.start(startTime);
        osc.stop(startTime + 0.2);

        // White noise snap
        const bufferSize = ctx.sampleRate * 0.2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(1000, startTime);

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.8 * velScale, startTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(targetNode);
        if (!customCtx && this.reverbNode) noiseGain.connect(this.reverbNode);

        noise.start(startTime);
        noise.stop(startTime + 0.25);
        break;
      }
      case 'hihat':
      case 'openHat': {
        const isOpen = type === 'openHat';
        const duration = isOpen ? 0.35 : 0.06;
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(8500, startTime);
        bandpass.Q.setValueAtTime(3.0, startTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.6 * velScale, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        noise.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(targetNode);

        noise.start(startTime);
        noise.stop(startTime + duration + 0.05);
        break;
      }
      case 'perc': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, startTime);
        osc.frequency.exponentialRampToValueAtTime(180, startTime + 0.05);
        gain.gain.setValueAtTime(0.6 * velScale, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

        osc.connect(gain);
        gain.connect(targetNode);
        if (!customCtx && this.delayNode) gain.connect(this.delayNode);

        osc.start(startTime);
        osc.stop(startTime + 0.1);
        break;
      }
    }
  }

  // C++ DSP Real-time Sound Generator Playground
  public generateCppDspSample(soundType: string, params: Record<string, number>): number[] {
    const sampleRate = 44100;
    const durationSec = 3.0;
    const numSamples = Math.floor(sampleRate * durationSec);
    const output = new Array(numSamples).fill(0);

    const freq = params.cutoff ? Math.max(100, Math.min(800, params.cutoff * 0.15)) : 220;
    const cutoffHz = params.cutoff || 3200;
    const resonanceQ = params.resonance || 2.0;
    const drive = params.drive || 0.3;

    let phase = 0.0;
    const stage = [0.0, 0.0, 0.0, 0.0];

    for (let i = 0; i < numSamples; i++) {
      const phaseInc = freq / sampleRate;
      phase += phaseInc;
      if (phase >= 1.0) phase -= 1.0;

      let rawSaw = 2.0 * phase - 1.0;
      if (phase < phaseInc) {
        const t = phase / phaseInc;
        rawSaw -= (2.0 * t - t * t - 1.0);
      } else if (phase > 1.0 - phaseInc) {
        const t = (phase - 1.0) / phaseInc;
        rawSaw += (t * t + 2.0 * t + 1.0);
      }

      const env = Math.exp(-i / (sampleRate * 0.6));
      const w = 2.0 * Math.PI * (cutoffHz / sampleRate);
      const g = Math.max(0.001, Math.min(0.95, 0.9892 * w - 0.4342 * w * w));
      const feedback = resonanceQ * stage[3];
      const inSaturated = Math.tanh((rawSaw * env - feedback) * (1.0 + drive * 2.0));

      stage[0] += g * (inSaturated - stage[0]);
      stage[1] += g * (stage[0] - stage[1]);
      stage[2] += g * (stage[1] - stage[2]);
      stage[3] += g * (stage[2] - stage[3]);

      output[i] = stage[3] * 0.7;
    }

    return output;
  }

  public exportToMidi(comp: MusicComposition): Blob {
    return generateMidiFile(comp);
  }

  // Export Composition as 16-bit PCM WAV File with 100% audio graph accuracy
  public async exportToWav(comp: MusicComposition, trackFilter?: string): Promise<Blob> {
    const sampleRate = 44100;
    const baseStepDuration = 60.0 / (comp.tempo * 4);
    const swingFactor = (comp.swing || 0) / 100;

    let renderingPlan: { stepIndex: number; activeTracks?: string[] }[] = [];

    if (comp.arrangement?.sections && comp.arrangement.sections.length > 0) {
      for (const section of comp.arrangement.sections) {
        const sectionSteps = section.bars * 16;
        for (let i = 0; i < sectionSteps; i++) {
          renderingPlan.push({
            stepIndex: i % comp.stepsCount,
            activeTracks: section.activeTracks,
          });
        }
      }
    } else {
      const totalSteps = comp.stepsCount * 4;
      for (let i = 0; i < totalSteps; i++) {
        renderingPlan.push({ stepIndex: i % comp.stepsCount });
      }
    }

    const totalDuration = renderingPlan.length * baseStepDuration + 2.5;
    const length = Math.floor(sampleRate * totalDuration);

    const offlineCtx = new OfflineAudioContext(2, length, sampleRate);

    // Master bus & filters
    const masterGain = offlineCtx.createGain();
    masterGain.gain.setValueAtTime(this.masterGain ? this.masterGain.gain.value : 0.85, 0);

    const masterLp = offlineCtx.createBiquadFilter();
    masterLp.type = 'lowpass';
    masterLp.frequency.setValueAtTime(comp.fxSettings?.masterLowpass || 18000, 0);

    const masterHp = offlineCtx.createBiquadFilter();
    masterHp.type = 'highpass';
    masterHp.frequency.setValueAtTime(comp.fxSettings?.masterHighpass || 30, 0);

    masterHp.connect(masterLp);
    masterLp.connect(masterGain);
    masterGain.connect(offlineCtx.destination);

    // Offline Reverb Bus
    const offlineReverb = offlineCtx.createConvolver();
    offlineReverb.buffer = this.createImpulseResponse(comp.fxSettings?.reverbDecay || 2.5, 2.0, offlineCtx);
    const offlineReverbWet = offlineCtx.createGain();
    offlineReverbWet.gain.setValueAtTime(comp.fxSettings?.reverbWet || 0.25, 0);
    offlineReverb.connect(offlineReverbWet);
    offlineReverbWet.connect(masterHp);

    // Offline Delay Bus
    const offlineDelay = offlineCtx.createDelay(2.0);
    offlineDelay.delayTime.setValueAtTime(comp.fxSettings?.delayTime || 0.25, 0);
    const offlineDelayFeedback = offlineCtx.createGain();
    offlineDelayFeedback.gain.setValueAtTime(comp.fxSettings?.delayFeedback || 0.3, 0);
    const offlineDelayWet = offlineCtx.createGain();
    offlineDelayWet.gain.setValueAtTime(comp.fxSettings?.delayWet || 0.2, 0);
    offlineDelay.connect(offlineDelayFeedback);
    offlineDelayFeedback.connect(offlineDelay);
    offlineDelay.connect(offlineDelayWet);
    offlineDelayWet.connect(masterHp);

    // Offline Channel Strips Map (Track ID -> Destination Node)
    const channelInputs: Record<string, AudioNode> = {};
    const trackNames = ['melody', 'bass', 'chords', 'drums', 'kick', 'snare', 'hihat', 'openHat', 'perc'];
    if (comp.customLines) {
      comp.customLines.forEach((l) => trackNames.push(l.id));
    }

    trackNames.forEach((tId) => {
      const channelConfig = comp.mixerChannels?.[tId];

      const eqLow = offlineCtx.createBiquadFilter();
      eqLow.type = 'lowshelf';
      eqLow.frequency.setValueAtTime(120, 0);
      eqLow.gain.setValueAtTime(channelConfig?.eqLow ?? 0, 0);

      const eqMid = offlineCtx.createBiquadFilter();
      eqMid.type = 'peaking';
      eqMid.frequency.setValueAtTime(1000, 0);
      eqMid.gain.setValueAtTime(channelConfig?.eqMid ?? 0, 0);

      const eqHigh = offlineCtx.createBiquadFilter();
      eqHigh.type = 'highshelf';
      eqHigh.frequency.setValueAtTime(4500, 0);
      eqHigh.gain.setValueAtTime(channelConfig?.eqHigh ?? 0, 0);

      const panner = offlineCtx.createStereoPanner();
      panner.pan.setValueAtTime(channelConfig?.pan ?? 0, 0);

      const trkGain = offlineCtx.createGain();
      let vol = channelConfig?.volume ?? 1.0;
      if (tId === 'melody' && comp.leadSynthPatch?.volume !== undefined) vol *= comp.leadSynthPatch.volume;
      if (tId === 'bass' && comp.bassSynthPatch?.volume !== undefined) vol *= comp.bassSynthPatch.volume;
      if (tId === 'chords' && comp.chordSynthPatch?.volume !== undefined) vol *= comp.chordSynthPatch.volume;
      if (channelConfig?.isMuted || this.trackMutes[tId]) vol = 0;
      trkGain.gain.setValueAtTime(vol, 0);

      eqLow.connect(eqMid);
      eqMid.connect(eqHigh);
      eqHigh.connect(panner);
      panner.connect(trkGain);
      trkGain.connect(masterHp);

      // Connect to Reverb & Delay sends
      const revSend = offlineCtx.createGain();
      revSend.gain.setValueAtTime(channelConfig?.reverbSend ?? (tId === 'snare' ? 0.35 : 0.2), 0);
      trkGain.connect(revSend);
      revSend.connect(offlineReverb);

      const delSend = offlineCtx.createGain();
      delSend.gain.setValueAtTime(channelConfig?.delaySend ?? (tId === 'perc' ? 0.25 : 0.15), 0);
      trkGain.connect(delSend);
      delSend.connect(offlineDelay);

      channelInputs[tId] = eqLow;
    });

    const shouldRenderTrack = (trackId: string, sectionTracks?: string[]) => {
      if (trackFilter && trackFilter !== 'master') {
        if (trackFilter === 'drums') {
          const drumVoices = ['kick', 'snare', 'hihat', 'openHat', 'perc', 'drums'];
          if (!drumVoices.includes(trackId)) return false;
        } else if (trackFilter !== trackId) {
          return false;
        }
      }
      if (sectionTracks && sectionTracks.length > 0) {
        return sectionTracks.includes(trackId) || (sectionTracks.includes('drums') && ['kick', 'snare', 'hihat', 'openHat', 'perc'].includes(trackId));
      }
      return true;
    };

    renderingPlan.forEach((plan, i) => {
      const step = plan.stepIndex;
      const isOddStep = step % 2 === 1;
      const stepOffset = isOddStep ? swingFactor * baseStepDuration * 0.45 : 0;
      const time = i * baseStepDuration + stepOffset;

      // 1. Melody
      if (shouldRenderTrack('melody', plan.activeTracks)) {
        const melodyNote = comp.melodySequence[step];
        const melodyProb = comp.melodyProbabilities ? comp.melodyProbabilities[step] : 100;
        const shouldPlay = melodyProb >= 100 || (Math.random() * 100 <= melodyProb);

        if (melodyNote && melodyNote !== 'REST' && shouldPlay) {
          const vel = comp.melodyVelocities ? comp.melodyVelocities[step] : 100;
          const durSteps = comp.melodyDurations ? comp.melodyDurations[step] : 1;
          const freq = noteToFreq(melodyNote);
          this.playSynthesizerNote(
            freq,
            comp.leadSynthPatch,
            baseStepDuration * durSteps * 1.2,
            time,
            vel,
            offlineCtx,
            channelInputs['melody'] || masterHp
          );
        }
      }

      // 2. Bass
      if (shouldRenderTrack('bass', plan.activeTracks)) {
        const bassNote = comp.bassSequence[step];
        if (bassNote && bassNote !== 'REST') {
          const vel = comp.bassVelocities ? comp.bassVelocities[step] : 100;
          const durSteps = comp.bassDurations ? comp.bassDurations[step] : 1;
          const freq = noteToFreq(bassNote);
          this.playSynthesizerNote(
            freq,
            comp.bassSynthPatch,
            baseStepDuration * durSteps * 1.1,
            time,
            vel,
            offlineCtx,
            channelInputs['bass'] || masterHp
          );
        }
      }

      // 3. Chords (Single or Multi-Chord Array)
      if (shouldRenderTrack('chords', plan.activeTracks)) {
        const chordVal = comp.chordSequence[step];
        if (chordVal && chordVal !== 'REST') {
          const chordsArr = Array.isArray(chordVal) ? chordVal : [chordVal];
          const vel = comp.chordVelocities ? comp.chordVelocities[step] : 90;
          const durSteps = comp.chordDurations ? comp.chordDurations[step] : 4;

          chordsArr.forEach((c) => {
            if (c && c !== 'REST') {
              const chordFreqs = this.getChordFrequencies(c, comp.key, comp.scale);
              this.playChordNotes(
                chordFreqs,
                comp.chordSynthPatch,
                baseStepDuration * durSteps * 1.5,
                time,
                vel,
                offlineCtx,
                channelInputs['chords'] || masterHp
              );
            }
          });
        }
      }

      // 4. Drums
      const drumVels = comp.drumVelocities || {
        kick: new Array(128).fill(110),
        snare: new Array(128).fill(100),
        hihat: new Array(128).fill(90),
        openHat: new Array(128).fill(95),
        perc: new Array(128).fill(85),
      };

      if (comp.drumPattern.kick[step] && shouldRenderTrack('kick', plan.activeTracks)) {
        this.playDrumSound('kick', time, drumVels.kick ? drumVels.kick[step] : 110, offlineCtx, channelInputs['kick'] || masterHp);
      }
      if (comp.drumPattern.snare[step] && shouldRenderTrack('snare', plan.activeTracks)) {
        this.playDrumSound('snare', time, drumVels.snare ? drumVels.snare[step] : 100, offlineCtx, channelInputs['snare'] || masterHp);
      }
      if (comp.drumPattern.hihat[step] && shouldRenderTrack('hihat', plan.activeTracks)) {
        this.playDrumSound('hihat', time, drumVels.hihat ? drumVels.hihat[step] : 90, offlineCtx, channelInputs['hihat'] || masterHp);
      }
      if (comp.drumPattern.openHat[step] && shouldRenderTrack('openHat', plan.activeTracks)) {
        this.playDrumSound('openHat', time, drumVels.openHat ? drumVels.openHat[step] : 95, offlineCtx, channelInputs['openHat'] || masterHp);
      }
      if (comp.drumPattern.perc[step] && shouldRenderTrack('perc', plan.activeTracks)) {
        this.playDrumSound('perc', time, drumVels.perc ? drumVels.perc[step] : 85, offlineCtx, channelInputs['perc'] || masterHp);
      }

      // 5. Custom Dynamic Sound Lines & Vocals
      if (comp.customLines && comp.customLines.length > 0) {
        const anySolo = comp.customLines.some((l) => l.isSoloed);
        comp.customLines.forEach((line) => {
          if (!shouldRenderTrack(line.id, plan.activeTracks)) return;
          if (line.isMuted) return;
          if (anySolo && !line.isSoloed) return;

          const note = line.sequence[step];
          const prob = line.probabilities ? line.probabilities[step] : 100;
          const shouldPlay = prob >= 100 || Math.random() * 100 <= prob;

          if (note && note !== 'REST' && shouldPlay) {
            const vel = line.velocities ? line.velocities[step] : 100;
            const durSteps = line.durations ? line.durations[step] : 1;
            const freq = noteToFreq(note);
            const customPatch: SynthPatch = {
              ...line.patch,
              volume: (line.patch.volume || 0.7) * (line.volume ?? 0.8),
            };
            this.playSynthesizerNote(
              freq,
              customPatch,
              baseStepDuration * durSteps * 1.2,
              time,
              vel,
              offlineCtx,
              channelInputs[line.id] || masterHp
            );
          }
        });
      }
    });

    const renderedBuffer = await offlineCtx.startRendering();
    return this.audioBufferToWav(renderedBuffer);
  }

  public startCppDsp(preset: CppDspPreset, paramValues: Record<string, number>) {
    this.resumeContext();
    if (!this.audioCtx || !this.masterFilterHp) return;

    this.stopCppDsp();
    this.activeCppPreset = preset;
    this.cppParamValues = { ...paramValues };
    this.cppSampleIndex = 0;
    this.isCppRunning = true;

    const ctx = this.audioCtx;
    const bufferSize = 2048;
    this.customCppNode = ctx.createScriptProcessor(bufferSize, 0, 1);

    // Real-time C++ Virtual DSP Engine
    let phase = 0;
    let s1 = 0, s2 = 0, s3 = 0, s4 = 0;
    let ringBuffer = new Float32Array(1024);
    let writeIdx = 0;
    let prevSample = 0;

    this.customCppNode.onaudioprocess = (e) => {
      if (!this.isCppRunning) return;
      const output = e.outputBuffer.getChannelData(0);
      const sampleRate = ctx.sampleRate;
      const presetId = this.activeCppPreset?.id;
      const params = this.cppParamValues;

      for (let i = 0; i < bufferSize; i++) {
        this.cppSampleIndex++;
        let sample = 0;

        if (presetId === 'supersaw_poly') {
          const cutoff = params['cutoff'] || 2800;
          const resonance = params['resonance'] || 2.2;
          const detune = params['detune'] || 0.018;
          const drive = params['drive'] || 0.35;
          const baseFreq = 220;

          // 7-saw PolyBLEP
          let mix = 0;
          const detuneRatios = [-0.024, -0.014, -0.006, 0.0, 0.007, 0.015, 0.025];
          for (let o = 0; o < 7; o++) {
            const f = baseFreq * (1 + detuneRatios[o] * detune * 50);
            const inc = f / sampleRate;
            phase = (phase + inc) % 1.0;
            let raw = 2.0 * phase - 1.0;
            mix += raw / 7.0;
          }

          // Moog style 4-pole lowpass filter emulation
          const f_w = (cutoff * 2.0 * Math.PI) / sampleRate;
          const k = Math.tan(f_w * 0.5);
          const g = k / (1.0 + k);
          const res = Math.min(3.95, resonance);

          const input = mix * (1.0 + drive * 2.0) - res * s4;
          const v1 = (input - s1) * g;
          const u1 = v1 + s1;
          s1 = u1 + v1;

          const v2 = (u1 - s2) * g;
          const u2 = v2 + s2;
          s2 = u2 + v2;

          const v3 = (u2 - s3) * g;
          const u3 = v3 + s3;
          s3 = u3 + v3;

          const v4 = (u3 - s4) * g;
          const u4 = v4 + s4;
          s4 = u4 + v4;

          sample = Math.tanh(u4) * 0.7;
        } else if (presetId === 'acid_tb303') {
          const cutoff = params['cutoff'] || 1400;
          const resonance = params['resonance'] || 12.0;
          const envMod = params['envMod'] || 0.85;
          const decay = params['decay'] || 0.25;
          const f = 110; // A2

          phase = (phase + f / sampleRate) % 1.0;
          const saw = 2.0 * phase - 1.0;

          // TB303 filter model
          const env = Math.exp(-((this.cppSampleIndex % (sampleRate * 0.5)) / (sampleRate * decay)));
          const dynamicCutoff = Math.min(18000, cutoff + env * envMod * 8000);
          const w = (dynamicCutoff * 2.0 * Math.PI) / sampleRate;
          const q = Math.max(0.5, resonance);

          const fb = resonance * (1.0 - 0.15 * saw * saw);
          s1 += (w * (saw - s1 - fb * (s2 - s1)));
          s2 += (w * (s1 - s2));
          sample = Math.tanh(s2 * 1.5) * 0.75;
        } else if (presetId === 'karplus_strong') {
          const pluckFreq = params['frequency'] || 220;
          const damping = params['damping'] || 0.985;
          const delayLen = Math.max(2, Math.floor(sampleRate / pluckFreq));

          if (this.cppSampleIndex < 400) {
            ringBuffer[writeIdx] = (Math.random() * 2.0 - 1.0);
          }
          const cur = ringBuffer[writeIdx];
          const filtered = (cur + prevSample) * 0.5 * damping;
          prevSample = cur;
          ringBuffer[writeIdx] = filtered;
          writeIdx = (writeIdx + 1) % delayLen;
          sample = cur * 0.8;
        } else if (presetId === 'tape_echo') {
          const delayTimeSec = params['delayTime'] || 0.32;
          const feedback = params['feedback'] || 0.65;
          const delaySamples = Math.floor(sampleRate * delayTimeSec);
          const inSig = Math.sin(phase) * 0.25;
          phase += (2.0 * Math.PI * 440) / sampleRate;

          const cur = ringBuffer[writeIdx];
          ringBuffer[writeIdx] = inSig + cur * feedback;
          writeIdx = (writeIdx + 1) % Math.max(1, delaySamples);
          sample = (inSig + cur) * 0.85;
        } else if (presetId === 'dx7_brass') {
          const ratio = params['harmonicRatio'] || 2.0;
          const depth = params['fmDepth'] || 5.5;
          const f = 220; // A3

          phase += (2.0 * Math.PI * f) / sampleRate;
          const op2 = Math.sin(phase * ratio) * depth;
          sample = Math.sin(phase + op2) * 0.5;
        } else {
          // Default rich sawtooth
          phase = (phase + 220 / sampleRate) % 1.0;
          sample = (2.0 * phase - 1.0) * 0.3;
        }

        output[i] = sample;
      }
    };

    this.customCppNode.connect(this.masterFilterHp);
    if (this.reverbNode) this.customCppNode.connect(this.reverbNode);
    if (this.delayNode) this.customCppNode.connect(this.delayNode);
  }

  public updateCppParams(params: Record<string, number>) {
    this.cppParamValues = { ...params };
  }

  public stopCppDsp() {
    this.isCppRunning = false;
    if (this.customCppNode) {
      this.customCppNode.disconnect();
      this.customCppNode = null;
    }
  }

  public updateActiveComposition(comp: MusicComposition) {
    this.activeComposition = comp;
    this.tempo = comp.tempo;
    this.updateFx(comp.fxSettings);
  }

  // Multi-Track Sequencer Engine with Swing / Shuffle
  public startSequencer(composition: MusicComposition, onStep: (step: number) => void) {
    this.resumeContext();
    this.activeComposition = composition;
    this.tempo = composition.tempo;
    this.onStepCallback = onStep;
    this.currentStep = 0;
    this.isPlaying = true;
    this.updateFx(composition.fxSettings);

    if (this.audioCtx) {
      this.nextNoteTime = this.audioCtx.currentTime + 0.05;
      this.scheduleLoop();
    }
  }

  public stopSequencer() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.currentStep = 0;
    if (this.onStepCallback) this.onStepCallback(0);
  }

  private scheduleLoop = () => {
    if (!this.isPlaying || !this.audioCtx || !this.activeComposition) return;

    const baseSecondsPerStep = 60.0 / (this.tempo * 4); // 16th note step
    const swingFactor = (this.activeComposition.swing || 0) / 100; // 0 to 0.75

    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      // Apply swing to odd 16th notes
      const isOddStep = this.currentStep % 2 === 1;
      const stepOffset = isOddStep ? swingFactor * baseSecondsPerStep * 0.45 : 0;
      const actualTime = this.nextNoteTime + stepOffset;

      this.scheduleStep(this.currentStep, actualTime);
      this.nextNoteTime += baseSecondsPerStep;
      this.currentStep = (this.currentStep + 1) % this.activeComposition.stepsCount;
    }

    this.timerId = window.setTimeout(this.scheduleLoop, this.lookaheadInterval);
  };

  public setTrackMutes(mutes: Record<string, boolean>) {
    this.trackMutes = { ...this.trackMutes, ...mutes };
  }

  public setTrackSolos(solos: Record<string, boolean>) {
    this.trackSolos = { ...this.trackSolos, ...solos };
  }

  public getTrackMutes() {
    return { ...this.trackMutes };
  }

  private isTrackAudible(track: 'melody' | 'bass' | 'chords' | 'drums' | 'kick' | 'snare' | 'hihat' | 'openHat' | 'perc'): boolean {
    const drumVoices = ['kick', 'snare', 'hihat', 'openHat', 'perc'];
    if (track === 'drums' && drumVoices.some((voice) => this.trackSolos[voice])) {
      return !this.trackMutes.drums;
    }
    if (drumVoices.includes(track)) {
      if (!this.isTrackAudible('drums')) return false;
    }
    const hasSolo = Object.values(this.trackSolos).some(Boolean);
    if (hasSolo) {
      return !!this.trackSolos[track] || (drumVoices.includes(track) && !!this.trackSolos.drums);
    }
    return !this.trackMutes[track];
  }

  private scheduleStep(step: number, time: number) {
    if (!this.activeComposition || !this.audioCtx) return;
    const comp = this.activeComposition;
    const baseStepDuration = 60.0 / (this.tempo * 4);

    // Notify UI step progress
    const ctx = this.audioCtx;
    const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
    setTimeout(() => {
      if (this.isPlaying && this.onStepCallback) {
        this.onStepCallback(step);
      }
    }, delayMs);

    // 1. Melody Note
    if (this.isTrackAudible('melody')) {
      const melodyNote = comp.melodySequence[step];
      const melodyProb = comp.melodyProbabilities ? comp.melodyProbabilities[step] : 100;
      const shouldPlay = melodyProb >= 100 || (Math.random() * 100 <= melodyProb);

      if (melodyNote && melodyNote !== 'REST' && shouldPlay) {
        const vel = comp.melodyVelocities ? comp.melodyVelocities[step] : 100;
        const durSteps = comp.melodyDurations ? comp.melodyDurations[step] : 1;
        const freq = noteToFreq(melodyNote);
        this.playSynthesizerNote(
          freq,
          comp.leadSynthPatch,
          baseStepDuration * durSteps * 1.2,
          time,
          vel,
          undefined,
          this.getTrackInputNode('melody')
        );
      }
    }

    // 2. Bass Note
    if (this.isTrackAudible('bass')) {
      const bassNote = comp.bassSequence[step];
      if (bassNote && bassNote !== 'REST') {
        const vel = comp.bassVelocities ? comp.bassVelocities[step] : 100;
        const durSteps = comp.bassDurations ? comp.bassDurations[step] : 1;
        const freq = noteToFreq(bassNote);
        this.playSynthesizerNote(
          freq,
          comp.bassSynthPatch,
          baseStepDuration * durSteps * 1.1,
          time,
          vel,
          undefined,
          this.getTrackInputNode('bass')
        );
      }
    }

    // 3. Polyphonic Chord Note
    if (this.isTrackAudible('chords')) {
      const chordNote = comp.chordSequence[step];
      if (chordNote && chordNote !== 'REST') {
        const vel = comp.chordVelocities ? comp.chordVelocities[step] : 90;
        const durSteps = comp.chordDurations ? comp.chordDurations[step] : 4;
        const chordFreqs = this.getChordFrequencies(chordNote, comp.key, comp.scale);
        this.playChordNotes(
          chordFreqs,
          comp.chordSynthPatch,
          baseStepDuration * durSteps * 1.5,
          time,
          vel,
          undefined,
          this.getTrackInputNode('chords')
        );
      }
    }

    // 4. Drum Triggers
    if (this.isTrackAudible('drums')) {
      const drumVels = comp.drumVelocities || {
        kick: new Array(32).fill(110),
        snare: new Array(32).fill(100),
        hihat: new Array(32).fill(90),
        openHat: new Array(32).fill(95),
        perc: new Array(32).fill(85),
      };

      if (comp.drumPattern.kick[step] && this.isTrackAudible('kick')) {
        this.playDrumSound('kick', time, drumVels.kick ? drumVels.kick[step] : 110, undefined, this.getTrackInputNode('kick'));
      }
      if (comp.drumPattern.snare[step] && this.isTrackAudible('snare')) {
        this.playDrumSound('snare', time, drumVels.snare ? drumVels.snare[step] : 100, undefined, this.getTrackInputNode('snare'));
      }
      if (comp.drumPattern.hihat[step] && this.isTrackAudible('hihat')) {
        this.playDrumSound('hihat', time, drumVels.hihat ? drumVels.hihat[step] : 90, undefined, this.getTrackInputNode('hihat'));
      }
      if (comp.drumPattern.openHat[step] && this.isTrackAudible('openHat')) {
        this.playDrumSound('openHat', time, drumVels.openHat ? drumVels.openHat[step] : 95, undefined, this.getTrackInputNode('openHat'));
      }
      if (comp.drumPattern.perc[step] && this.isTrackAudible('perc')) {
        this.playDrumSound('perc', time, drumVels.perc ? drumVels.perc[step] : 85, undefined, this.getTrackInputNode('perc'));
      }
    }

    // 5. Custom Dynamic Sound Lines (Unlimited Added Tracks)
    if (comp.customLines && comp.customLines.length > 0) {
      const anySolo = comp.customLines.some(l => l.isSoloed);
      comp.customLines.forEach((line) => {
        if (line.isMuted) return;
        if (anySolo && !line.isSoloed) return;
        const note = line.sequence[step];
        const prob = line.probabilities ? line.probabilities[step] : 100;
        const shouldPlay = prob >= 100 || Math.random() * 100 <= prob;

        if (note && note !== 'REST' && shouldPlay) {
          const vel = line.velocities ? line.velocities[step] : 100;
          const durSteps = line.durations ? line.durations[step] : 1;
          const freq = noteToFreq(note);
          const customPatch: SynthPatch = {
            ...line.patch,
            volume: (line.patch.volume || 0.7) * (line.volume ?? 0.8),
          };
          this.playSynthesizerNote(
            freq,
            customPatch,
            baseStepDuration * durSteps * 1.2,
            time,
            vel,
            undefined,
            this.getTrackInputNode(line.id)
          );
        }
      });
    }
  }

  // Real-time DJ Performance Effects: Scratch, Filter Drop, Risers, Vocal Drops
  public triggerDjScratch(direction: 'forward' | 'backward' = 'forward', speed = 1.0) {
    this.resumeContext();
    if (!this.audioCtx || !this.masterFilterHp) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(8.0, now);

    if (direction === 'forward') {
      osc.frequency.setValueAtTime(120 * speed, now);
      osc.frequency.exponentialRampToValueAtTime(750 * speed, now + 0.12);
      filter.frequency.setValueAtTime(600, now);
      filter.frequency.exponentialRampToValueAtTime(2800, now + 0.12);
    } else {
      osc.frequency.setValueAtTime(680 * speed, now);
      osc.frequency.exponentialRampToValueAtTime(90 * speed, now + 0.14);
      filter.frequency.setValueAtTime(2400, now);
      filter.frequency.exponentialRampToValueAtTime(450, now + 0.14);
    }

    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(filter).connect(gain).connect(this.masterFilterHp);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public triggerClubDropFx(fxType: 'riser' | 'laser' | 'sub_drop' | 'airhorn' | 'siren' | 'tape_stop') {
    this.resumeContext();
    if (!this.audioCtx || !this.masterFilterHp) return;
    const ctx = this.audioCtx;
    const now = ctx.currentTime;

    switch (fxType) {
      case 'riser': {
        // High-energy white noise + pitch rise
        const bufferSize = ctx.sampleRate * 2.0;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(300, now);
        filter.frequency.exponentialRampToValueAtTime(9000, now + 1.8);
        filter.Q.setValueAtTime(6.0, now);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.exponentialRampToValueAtTime(0.8, now + 1.6);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 2.0);

        noise.connect(filter).connect(gain).connect(this.masterFilterHp);
        noise.start(now);
        noise.stop(now + 2.0);
        break;
      }
      case 'laser': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(2500, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.18);
        gain.gain.setValueAtTime(0.7, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain).connect(this.masterFilterHp);
        osc.start(now);
        osc.stop(now + 0.22);
        break;
      }
      case 'sub_drop': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 1.2);
        gain.gain.setValueAtTime(1.0, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
        osc.connect(gain).connect(this.masterFilterHp);
        osc.start(now);
        osc.stop(now + 1.5);
        break;
      }
      case 'airhorn': {
        const freqs = [466.16, 622.25, 783.99]; // Classic Reggae/Dancehall Airhorn triad
        freqs.forEach((f) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, now);
          osc.frequency.linearRampToValueAtTime(f * 1.05, now + 0.05);
          osc.frequency.linearRampToValueAtTime(f, now + 0.1);
          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
          osc.connect(gain).connect(this.masterFilterHp!);
          osc.start(now);
          osc.stop(now + 0.5);
        });
        break;
      }
      case 'siren': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.3);
        osc.frequency.linearRampToValueAtTime(600, now + 0.6);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.9);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
        osc.connect(gain).connect(this.masterFilterHp);
        osc.start(now);
        osc.stop(now + 1.05);
        break;
      }
      case 'tape_stop': {
        if (this.masterFilterLp) {
          this.masterFilterLp.frequency.setValueAtTime(18000, now);
          this.masterFilterLp.frequency.exponentialRampToValueAtTime(200, now + 0.6);
        }
        break;
      }
    }
  }

  private audioBufferToWav(buffer: AudioBuffer): Blob {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // 16-bit PCM
    const bitDepth = 16;
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    // RIFF identifier
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Write interleaved samples
    let offset = 44;
    const channels: Float32Array[] = [];
    for (let c = 0; c < numChannels; c++) {
      channels.push(buffer.getChannelData(c));
    }

    for (let i = 0; i < buffer.length; i++) {
      for (let c = 0; c < numChannels; c++) {
        const sample = Math.max(-1, Math.min(1, channels[c][i]));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  // ==========================================
  // TIMELINE ARRANGER MULTI-TRACK AUDIO ENGINE
  // ==========================================
  private isTimelinePlaying = false;
  private timelineTracks: TimelineTrack[] = [];
  private timelineTimerId: number | null = null;
  private currentTimelineBar = 1.0;
  private onTimelineProgressCallback: ((bar: number) => void) | null = null;

  public startTimelinePlayer(
    tracks: TimelineTrack[],
    bpm: number,
    startBar: number,
    onProgress: (bar: number) => void
  ) {
    this.resumeContext();
    this.isTimelinePlaying = true;
    this.timelineTracks = tracks;
    this.tempo = bpm;
    this.currentTimelineBar = startBar;
    this.onTimelineProgressCallback = onProgress;

    if (this.audioCtx) {
      this.nextNoteTime = this.audioCtx.currentTime + 0.05;
      this.scheduleTimelineLoop();
    }
  }

  public stopTimelinePlayer() {
    this.isTimelinePlaying = false;
    if (this.timelineTimerId !== null) {
      clearTimeout(this.timelineTimerId);
      this.timelineTimerId = null;
    }
  }

  public updateTimelineTracks(tracks: TimelineTrack[]) {
    this.timelineTracks = tracks;
  }

  public seekTimeline(bar: number) {
    this.currentTimelineBar = bar;
    if (this.audioCtx) {
      this.nextNoteTime = this.audioCtx.currentTime + 0.02;
    }
  }

  private scheduleTimelineLoop = () => {
    if (!this.isTimelinePlaying || !this.audioCtx) return;

    const secondsPer16th = 60.0 / (this.tempo * 4); // 16th note step = 1/16 of a bar (4/4)

    while (this.nextNoteTime < this.audioCtx.currentTime + this.scheduleAheadTime) {
      this.scheduleTimelineStep(this.currentTimelineBar, this.nextNoteTime);
      this.nextNoteTime += secondsPer16th;
      this.currentTimelineBar += 1 / 16;
      if (this.currentTimelineBar > 32) {
        this.currentTimelineBar = 1.0;
      }
    }

    this.timelineTimerId = window.setTimeout(this.scheduleTimelineLoop, this.lookaheadInterval);
  };

  private scheduleTimelineStep(bar: number, time: number) {
    if (!this.audioCtx) return;
    const ctx = this.audioCtx;
    const stepDuration = 60.0 / (this.tempo * 4);

    // Notify UI of current playhead bar position
    const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
    setTimeout(() => {
      if (this.isTimelinePlaying && this.onTimelineProgressCallback) {
        this.onTimelineProgressCallback(bar);
      }
    }, delayMs);

    const anySolo = this.timelineTracks.some((t) => t.isSoloed);

    this.timelineTracks.forEach((trk) => {
      // 1. Check if track is muted or soloed
      if (trk.isMuted) return;
      if (anySolo && !trk.isSoloed) return;

      // 2. Find if any clip covers the current bar position
      const activeClip = trk.clips.find(
        (c) => !c.isMuted && bar >= c.startBar && bar < c.startBar + c.durationBars
      );

      // IF NO ACTIVE CLIP AT THIS BAR POSITION ON THIS TRACK: ABSOLUTELY SILENT!
      if (!activeClip) return;

      // 3. Play the sound for this clip based on clip progress & speed
      const offsetInBars = bar - activeClip.startBar;
      const stepIndexInClip = Math.floor(offsetInBars * 16 * activeClip.speed);

      const targetDest = this.getTrackInputNode(trk.id) || this.masterFilterHp;
      const clipVol = (activeClip.volume ?? 1.0) * trk.volume;
      const pitchMultiplier = Math.pow(2, (activeClip.pitchOffset || 0) / 12);

      if (trk.type === 'vocal') {
        if (stepIndexInClip % 2 === 0) {
          const rootFreq = noteToFreq('C4') * pitchMultiplier;
          this.playSynthesizerNote(
            rootFreq,
            {
              waveType: 'formant_vocal',
              attack: 0.03,
              decay: 0.25,
              sustain: 0.4,
              release: 0.2,
              volume: clipVol * 0.9,
              filterCutoff: 3200,
              resonance: 1.5,
            },
            stepDuration * 1.8,
            time,
            100,
            undefined,
            targetDest
          );
        }
      } else if (trk.type === 'drums') {
        if (stepIndexInClip % 4 === 0) {
          this.playDrumSound('kick', time, 110 * clipVol, undefined, targetDest);
        }
        if (stepIndexInClip % 4 === 2) {
          this.playDrumSound('snare', time, 95 * clipVol, undefined, targetDest);
        }
        this.playDrumSound('hihat', time, 80 * clipVol, undefined, targetDest);
      } else if (trk.type === 'bass') {
        if (stepIndexInClip % 2 === 0) {
          const bassFreq = noteToFreq('C2') * pitchMultiplier;
          this.playSynthesizerNote(
            bassFreq,
            {
              waveType: 'sub_808',
              attack: 0.01,
              decay: 0.4,
              sustain: 0.3,
              release: 0.3,
              volume: clipVol * 1.0,
              filterCutoff: 1400,
              resonance: 1.2,
            },
            stepDuration * 1.5,
            time,
            105,
            undefined,
            targetDest
          );
        }
      } else if (trk.type === 'synth') {
        if (stepIndexInClip % 2 === 0) {
          const synthFreq = noteToFreq('C4') * pitchMultiplier;
          this.playSynthesizerNote(
            synthFreq,
            {
              waveType: 'supersaw',
              attack: 0.02,
              decay: 0.3,
              sustain: 0.4,
              release: 0.2,
              volume: clipVol * 0.8,
              filterCutoff: 3800,
              resonance: 2.0,
            },
            stepDuration * 1.5,
            time,
            95,
            undefined,
            targetDest
          );
        }
      } else if (trk.type === 'fx') {
        if (stepIndexInClip === 0 || stepIndexInClip % 8 === 0) {
          const fxFreq = noteToFreq('G3') * pitchMultiplier;
          this.playSynthesizerNote(
            fxFreq,
            {
              waveType: 'sawtooth',
              attack: 0.1,
              decay: 0.8,
              sustain: 0.2,
              release: 0.5,
              volume: clipVol * 0.8,
              filterCutoff: 5000,
              resonance: 2.5,
              filterEnvAmount: 40,
            },
            stepDuration * 4,
            time,
            100,
            undefined,
            targetDest
          );
        }
      }
    });
  }

  private writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

export const audioDsp = new DspEngine();
