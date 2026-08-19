import { DeckEngine } from './DeckEngine';

/**
 * CrossFaderEngine mixes two DeckEngine outputs based on a value (0‑1).
 * It uses an AudioWorkletProcessor called `cross-fader-processor` which applies
 * a linear or exponential cross‑fade curve. The output node can be connected to the
 * master gain of the application.
 */
export class CrossFaderEngine {
  private context: AudioContext;
  private faderNode: AudioWorkletNode | null = null;
  private outputGain: GainNode;

  /** current cross‑fader position (0 = Deck A only, 1 = Deck B only) */
  private position: number = 0.5;

  constructor(context: AudioContext) {
    this.context = context;
    this.outputGain = new GainNode(this.context, { gain: 1 });
    // Load the processor (implemented in /audio/crossFaderProcessor.js)
    this.context.audioWorklet.addModule('/audio/crossFaderProcessor.js').then(() => {
      this.faderNode = new AudioWorkletNode(this.context, 'cross-fader-processor');
      this.faderNode.connect(this.outputGain);
    });
  }

  /** Connect two DeckEngine instances to the cross‑fader */
  connectDecks(deckA: DeckEngine, deckB: DeckEngine) {
    // Ensure the faderNode is ready
    if (!this.faderNode) {
      setTimeout(() => this.connectDecks(deckA, deckB), 50);
      return;
    }
    deckA.output.disconnect();
    deckB.output.disconnect();
    deckA.output.connect(this.faderNode, 0, 0);
    deckB.output.connect(this.faderNode, 0, 1);
  }

  /** Set the cross‑fader position */
  setPosition(value: number) {
    this.position = Math.min(1, Math.max(0, value));
    if (this.faderNode) {
      (this.faderNode as any).port.postMessage({ command: 'setPosition', value: this.position });
    }
  }

  /** Get the current position */
  getPosition(): number {
    return this.position;
  }

  /** Expose the final output node for routing to master bus */
  get output(): GainNode {
    return this.outputGain;
  }
}
