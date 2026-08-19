

/**
 * DeckEngine – manages a single deck's audio playback, cue points, warping and effect routing.
 * It creates an `AudioWorkletNode` for the track source (with optional time‑stretch) and a chain
 * of `AudioWorkletNode`s representing the FX rack. The final output is connected to a `GainNode`
 * that will be fed into the cross‑fader.
 */
export class DeckEngine {
  private context: AudioContext;
  private sourceNode: AudioWorkletNode | null = null;
  private gainNode: GainNode;
  private fxChain: AudioWorkletNode[] = [];
  private isPlaying = false;
  private playbackStartTime = 0; // AudioContext.currentTime at start
  private pausedAt = 0; // seconds
  private buffer: AudioBuffer | null = null;

  constructor(context: AudioContext) {
    this.context = context;
    this.gainNode = new GainNode(this.context, { gain: 1 });
    // Initially connect to destination; will be re‑routed by CrossFaderEngine later.
    this.gainNode.connect(this.context.destination);
  }

  /** Load an AudioBuffer (decoded) into the deck */
  async loadBuffer(arrayBuffer: ArrayBuffer) {
    this.buffer = await this.context.decodeAudioData(arrayBuffer.slice(0));
    await this.setupSource();
  }

  /** Internal: create the source node (AudioWorklet) with optional stretching */
  private async setupSource() {
    if (!this.buffer) return;
    // Load a simple track processor that supports start/stop/seek.
    await this.context.audioWorklet.addModule('/audio/trackProcessor.js');
    this.sourceNode = new AudioWorkletNode(this.context, 'track-processor', {
      processorOptions: { buffer: this.buffer, stretchRatio: 1 },
    });
    this.rewireChain();
  }

  /** Add an FX Worklet to the chain (order matters) */
  async addEffect(moduleUrl: string, nodeName: string, options?: any) {
    await this.context.audioWorklet.addModule(moduleUrl);
    const fxNode = new AudioWorkletNode(this.context, nodeName, { processorOptions: options });
    this.fxChain.push(fxNode);
    this.rewireChain();
  }

  private rewireChain() {
    // Disconnect previous connections
    if (this.sourceNode) this.sourceNode.disconnect();
    this.fxChain.forEach((fx) => fx.disconnect());
    // Connect source -> FX chain -> gain
    let previous: AudioNode = this.sourceNode as AudioNode;
    this.fxChain.forEach((fx) => {
      previous.connect(fx);
      previous = fx;
    });
    previous.connect(this.gainNode);
  }

  /** Playback controls */
  play() {
    if (!this.sourceNode || this.isPlaying) return;
    const offset = this.pausedAt;
    // @ts-ignore – custom message to the worklet processor
    (this.sourceNode as any).port.postMessage({ command: 'start', offset });
    this.playbackStartTime = this.context.currentTime - offset;
    this.isPlaying = true;
  }

  pause() {
    if (!this.isPlaying || !this.sourceNode) return;
    // @ts-ignore – custom message to the worklet processor
    (this.sourceNode as any).port.postMessage({ command: 'pause' });
    this.pausedAt = this.context.currentTime - this.playbackStartTime;
    this.isPlaying = false;
  }

  stop() {
    if (!this.sourceNode) return;
    // @ts-ignore – custom message to the worklet processor
    (this.sourceNode as any).port.postMessage({ command: 'stop' });
    this.pausedAt = 0;
    this.isPlaying = false;
  }

  /** Set deck volume (0‑1) */
  setVolume(value: number) {
    this.gainNode.gain.setValueAtTime(value, this.context.currentTime);
  }

  /** Set deck pan (-1‑1) */
  setPan(value: number) {
    const panner = this.context.createStereoPanner();
    panner.pan.setValueAtTime(value, this.context.currentTime);
    this.gainNode.disconnect();
    this.gainNode.connect(panner).connect(this.context.destination);
  }

  /** Seek to a particular time (in seconds) */
  seek(seconds: number) {
    this.pausedAt = seconds;
    if (this.isPlaying) {
      this.pause();
      this.play();
    }
  }

  /** Retrieve current playback position */
  getCurrentTime(): number {
    return this.isPlaying ? this.context.currentTime - this.playbackStartTime : this.pausedAt;
  }

  /** Expose the final output node for cross‑fader routing */
  get output(): GainNode {
    return this.gainNode;
  }
}
