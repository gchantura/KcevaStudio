// Live Microphone / Line-In Audio Recording Engine

export interface RecordedTake {
  id: string;
  name: string;
  blob: Blob;
  buffer: AudioBuffer | null;
  durationSec: number;
  waveformPeaks: number[];
  volume: number;
  pan: number;
  isMuted: boolean;
}

class AudioRecorderManager {
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private takes: RecordedTake[] = [];
  private activeTakeId: string | null = null;
  private isRecording = false;
  private currentBufferSource: AudioBufferSourceNode | null = null;

  public async requestMicAccess(): Promise<boolean> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.audioCtx) {
        this.audioCtx = new AudioCtxClass();
      }

      this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.sourceNode.connect(this.analyser);

      return true;
    } catch (err) {
      console.warn('Microphone access denied or unavailable:', err);
      return false;
    }
  }

  public getInputLevel(): number {
    if (!this.analyser) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    return Math.min(1, avg / 128);
  }

  public startRecording(): boolean {
    if (!this.mediaStream) return false;
    this.recordedChunks = [];

    try {
      this.mediaRecorder = new MediaRecorder(this.mediaStream);
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(50);
      this.isRecording = true;
      return true;
    } catch (err) {
      console.error('Failed to start MediaRecorder:', err);
      return false;
    }
  }

  public async stopRecording(): Promise<RecordedTake | null> {
    if (!this.mediaRecorder || !this.isRecording) return null;

    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = async () => {
        this.isRecording = false;
        const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
        
        try {
          if (!this.audioCtx) {
            const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
            this.audioCtx = new AudioCtxClass();
          }

          const arrayBuffer = await blob.arrayBuffer();
          const audioBuffer = await this.audioCtx.decodeAudioData(arrayBuffer);
          const peaks = this.extractWaveformPeaks(audioBuffer, 60);

          const newTake: RecordedTake = {
            id: `take_${Date.now()}`,
            name: `Vocal / Audio Take ${this.takes.length + 1}`,
            blob,
            buffer: audioBuffer,
            durationSec: audioBuffer.duration,
            waveformPeaks: peaks,
            volume: 0.9,
            pan: 0,
            isMuted: false,
          };

          this.takes.push(newTake);
          this.activeTakeId = newTake.id;
          resolve(newTake);
        } catch (err) {
          console.error('Error decoding recorded audio:', err);
          resolve(null);
        }
      };

      this.mediaRecorder!.stop();
    });
  }

  public playActiveTake(destinationNode: AudioNode, time = 0): boolean {
    const take = this.getActiveTake();
    if (!take || !take.buffer || !this.audioCtx || take.isMuted) return false;

    this.stopPlayback();

    const ctx = this.audioCtx;
    const startTime = time > 0 ? time : ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = take.buffer;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(take.volume, startTime);

    source.connect(gainNode);
    gainNode.connect(destinationNode);

    source.start(startTime);
    this.currentBufferSource = source;
    return true;
  }

  public stopPlayback() {
    if (this.currentBufferSource) {
      try {
        this.currentBufferSource.stop();
      } catch (_) {}
      this.currentBufferSource = null;
    }
  }

  public getActiveTake(): RecordedTake | null {
    if (!this.activeTakeId) return this.takes[0] || null;
    return this.takes.find((t) => t.id === this.activeTakeId) || null;
  }

  public getAllTakes(): RecordedTake[] {
    return [...this.takes];
  }

  public setActiveTake(id: string) {
    this.activeTakeId = id;
  }

  public deleteTake(id: string) {
    this.takes = this.takes.filter((t) => t.id !== id);
    if (this.activeTakeId === id) {
      this.activeTakeId = this.takes[0]?.id || null;
    }
  }

  public updateTakeConfig(id: string, updates: Partial<RecordedTake>) {
    const take = this.takes.find((t) => t.id === id);
    if (take) {
      Object.assign(take, updates);
    }
  }

  public isMicActive(): boolean {
    return this.mediaStream !== null;
  }

  public getIsRecording(): boolean {
    return this.isRecording;
  }

  private extractWaveformPeaks(buffer: AudioBuffer, numBars = 60): number[] {
    const channelData = buffer.getChannelData(0);
    const blockSize = Math.floor(channelData.length / numBars);
    const peaks: number[] = [];

    for (let i = 0; i < numBars; i++) {
      const start = i * blockSize;
      let max = 0;
      for (let j = 0; j < blockSize; j++) {
        const val = Math.abs(channelData[start + j] || 0);
        if (val > max) max = val;
      }
      peaks.push(Math.min(1, max));
    }
    return peaks;
  }
}

export const audioRecorderManager = new AudioRecorderManager();
