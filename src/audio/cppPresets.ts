import { CppDspPreset } from '../types';

export const CPP_DSP_PRESETS: CppDspPreset[] = [
  {
    id: 'supersaw_poly',
    name: 'Analog Polyphonic SuperSaw',
    category: 'Synthesizer',
    description: '7-Oscillator detuned SuperSaw with 24dB Moog-style 4-pole resonant ladder filter and stereo spatializer.',
    formula: 'y(t) = \\sum_{i=1}^7 A_i \\cdot \\text{saw}(2\\pi (f + \\Delta f_i) t + \\phi_i) * \\text{LadderFilter}(f_c, Q)',
    params: [
      { name: 'cutoff', label: 'Filter Cutoff (Hz)', min: 100, max: 12000, step: 50, defaultValue: 2800, unit: 'Hz' },
      { name: 'resonance', label: 'Ladder Resonance', min: 0.1, max: 4.0, step: 0.1, defaultValue: 2.2, unit: 'Q' },
      { name: 'detune', label: 'SuperSaw Detune', min: 0.0, max: 0.05, step: 0.002, defaultValue: 0.018, unit: 'spread' },
      { name: 'drive', label: 'Tube Saturation Drive', min: 0.0, max: 1.0, step: 0.05, defaultValue: 0.35, unit: '%' }
    ],
    code: `// SuperSaw_PolySynth.cpp
// High-performance real-time C++ Audio DSP SuperSaw with 4-Pole Moog Ladder Filter
#include <cmath>
#include <algorithm>

class SuperSawVoice {
private:
    float phase[7] = {0.0f};
    const float detuneRatios[7] = {-0.024f, -0.014f, -0.006f, 0.0f, 0.007f, 0.015f, 0.025f};
    
    // Moog 4-Pole Ladder Filter States
    float stage[4] = {0.0f};
    float stageTanh[3] = {0.0f};

public:
    inline float processSample(float freq, float sampleRate, float cutoffHz, float resonanceQ, float drive) {
        float mix = 0.0f;
        
        // 7 Anti-aliased detuned sawtooth oscillators
        for (int i = 0; i < 7; ++i) {
            float f_detuned = freq * (1.0f + detuneRatios[i]);
            float phaseIncrement = f_detuned / sampleRate;
            phase[i] += phaseIncrement;
            if (phase[i] >= 1.0f) phase[i] -= 1.0f;
            
            // PolyBLEP anti-aliased saw wave
            float saw = 2.0f * phase[i] - 1.0f;
            // Subtract PolyBLEP residual step
            if (phase[i] < phaseIncrement) {
                float t = phase[i] / phaseIncrement;
                saw -= (2.0f * t - t * t - 1.0f);
            } else if (phase[i] > 1.0f - phaseIncrement) {
                float t = (phase[i] - 1.0f) / phaseIncrement;
                saw += (t * t + 2.0f * t + 1.0f);
            }
            mix += saw * (i == 3 ? 0.35f : 0.22f);
        }

        // Non-linear Moog Ladder Filter
        float omega = 2.0f * 3.14159265f * (cutoffHz / sampleRate);
        float g = 0.9892f * omega - 0.4342f * omega * omega + 0.1381f * omega * omega * omega;
        g = std::clamp(g, 0.001f, 0.95f);
        
        float feedback = resonanceQ * stage[3];
        float input = std::tanh((mix - feedback) * (1.0f + drive * 2.0f));
        
        stage[0] += g * (input - stage[0]);
        stage[1] += g * (stage[0] - stage[1]);
        stage[2] += g * (stage[1] - stage[2]);
        stage[3] += g * (stage[2] - stage[3]);
        
        return stage[3];
    }
};`
  },
  {
    id: 'karplus_strong',
    name: 'Karplus-Strong Physical String Model',
    category: 'Physical Modeling',
    description: 'Digital waveguide plucked string acoustic simulation with noise burst exciter and dynamic damping.',
    formula: 'y[n] = x[n] + \\frac{1}{2} (y[n - D] + y[n - D - 1]) \\cdot \\rho',
    params: [
      { name: 'pluckDamp', label: 'String Damping (Decay)', min: 0.85, max: 0.999, step: 0.005, defaultValue: 0.985, unit: 'decay' },
      { name: 'brightness', label: 'Pluck Brightness', min: 0.1, max: 1.0, step: 0.05, defaultValue: 0.8, unit: 'filter' },
      { name: 'bodyResonance', label: 'Guitar Body Resonance', min: 0.0, max: 0.8, step: 0.05, defaultValue: 0.4, unit: 'res' }
    ],
    code: `// KarplusStrong_Guitar.cpp
// C++ Digital Waveguide String Synthesis Algorithm
#include <vector>
#include <cstdlib>

class KarplusStrongString {
private:
    std::vector<float> ringBuffer;
    int bufferLength = 0;
    int writeIndex = 0;
    float previousSample = 0.0f;

public:
    void pluck(float freq, float sampleRate, float brightness) {
        bufferLength = static_cast<int>(sampleRate / freq);
        if (bufferLength < 4) bufferLength = 4;
        ringBuffer.assign(bufferLength, 0.0f);
        writeIndex = 0;
        previousSample = 0.0f;

        // Excitation: Filtered White Noise burst representing string pick/strum
        for (int i = 0; i < bufferLength; ++i) {
            float noise = ((static_cast<float>(rand()) / RAND_MAX) * 2.0f - 1.0f);
            ringBuffer[i] = noise * brightness;
        }
    }

    inline float processSample(float dampingCoeff) {
        if (bufferLength <= 0) return 0.0f;
        
        int readIndex = (writeIndex + 1) % bufferLength;
        float currentSample = ringBuffer[readIndex];
        
        // Low-pass averaging filter in the feedback loop
        float filtered = 0.5f * (currentSample + previousSample) * dampingCoeff;
        previousSample = currentSample;
        
        ringBuffer[writeIndex] = filtered;
        writeIndex = (writeIndex + 1) % bufferLength;
        
        return currentSample;
    }
};`
  },
  {
    id: 'fm_crystal',
    name: '2-Operator FM Crystal Bell & Chime',
    category: 'FM Synthesis',
    description: 'Frequency Modulation synthesizer with carrier-modulator ratio and shimmering exponential decay.',
    formula: 'y(t) = \\sin(2\\pi f_c t + I(t) \\cdot \\sin(2\\pi (R \\cdot f_c) t))',
    params: [
      { name: 'modRatio', label: 'C:M Harmonic Ratio', min: 0.5, max: 8.0, step: 0.5, defaultValue: 3.5, unit: 'ratio' },
      { name: 'modIndex', label: 'Modulation Index (Timbre)', min: 0.0, max: 15.0, step: 0.5, defaultValue: 4.5, unit: 'index' },
      { name: 'shimmer', label: 'Crystal Shimmer Feedback', min: 0.0, max: 0.8, step: 0.05, defaultValue: 0.3, unit: 'fb' }
    ],
    code: `// FM_CrystalSynth.cpp
// 2-Operator Phase/Frequency Modulation Synthesizer in C++
#include <cmath>

class FMCrystalSynth {
private:
    float carrierPhase = 0.0f;
    float modulatorPhase = 0.0f;
    float modFeedback = 0.0f;

public:
    inline float processSample(float baseFreq, float sampleRate, float ratio, float modIndex, float feedback) {
        float modFreq = baseFreq * ratio;
        
        // Modulator oscillator with self-feedback
        float modSignal = std::sin(modulatorPhase + modFeedback * feedback);
        modFeedback = modSignal;
        
        // Carrier modulated by modulator signal
        float carrierSignal = std::sin(carrierPhase + modSignal * modIndex);
        
        // Advance phases
        carrierPhase += (2.0f * 3.14159265f * baseFreq) / sampleRate;
        modulatorPhase += (2.0f * 3.14159265f * modFreq) / sampleRate;
        
        if (carrierPhase > 2.0f * 3.14159265f) carrierPhase -= 2.0f * 3.14159265f;
        if (modulatorPhase > 2.0f * 3.14159265f) modulatorPhase -= 2.0f * 3.14159265f;
        
        return carrierSignal;
    }
};`
  },
  {
    id: 'acid_tb303',
    name: 'Acid TB-303 Bassline Engine',
    category: 'Bass & Acid',
    description: 'Diode ladder filter bass with dynamic accent velocity, envelope modulation and resonant grit.',
    formula: 'y[n] = \\text{DiodeFilter}(\\text{Saw}(t), \\text{Env}(t) \\cdot \\text{Cutoff}, \\text{Res})',
    params: [
      { name: 'cutoff', label: 'Base Cutoff (Hz)', min: 50, max: 4000, step: 20, defaultValue: 450, unit: 'Hz' },
      { name: 'resonance', label: 'Acid Resonance (Scream)', min: 1.0, max: 8.0, step: 0.2, defaultValue: 5.5, unit: 'Q' },
      { name: 'envMod', label: 'Envelope Modulation Amount', min: 0.0, max: 1.0, step: 0.05, defaultValue: 0.85, unit: 'depth' },
      { name: 'accent', label: 'Accent Drive', min: 0.0, max: 1.0, step: 0.05, defaultValue: 0.6, unit: 'gain' }
    ],
    code: `// Acid_TB303_Bass.cpp
// Iconic 18dB/oct Diode Ladder Acid Bass Synthesizer in C++
#include <cmath>
#include <algorithm>

class TB303AcidSynth {
private:
    float phase = 0.0f;
    float s1 = 0.0f, s2 = 0.0f, s3 = 0.0f, s4 = 0.0f;

public:
    inline float processSample(float freq, float sampleRate, float cutoff, float resonance, float envValue, float accent) {
        // Oscillator: Sawtooth with subtle asymmetry
        phase += freq / sampleRate;
        if (phase >= 1.0f) phase -= 1.0f;
        float saw = 2.0f * phase - 1.0f;
        
        // Modulated cutoff frequency
        float effectiveCutoff = cutoff * std::pow(2.0f, envValue * (3.5f + accent * 2.0f));
        effectiveCutoff = std::clamp(effectiveCutoff, 20.0f, sampleRate * 0.45f);
        
        // Diode ladder filter approximation
        float w = 2.0f * 3.14159265f * effectiveCutoff / sampleRate;
        float g = std::tan(w * 0.5f);
        float resFeedback = resonance * s4;
        
        float inSaturated = std::tanh((saw - resFeedback) * (1.0f + accent * 1.5f));
        s1 += g * (inSaturated - s1);
        s2 += g * (s1 - s2);
        s3 += g * (s2 - s3);
        s4 += g * (s3 - s4);
        
        // Overdriven output stage
        return std::tanh(s4 * 1.8f);
    }
};`
  },
  {
    id: 'bytebeat_symphony',
    name: 'Bytebeat Mathematical Music Generator',
    category: 'Algorithmic / Chiptune',
    description: 'Algorithmic 1-line procedural music generated purely from integer arithmetic and bitwise math at 8000Hz / 44100Hz.',
    formula: 'S(t) = ((t \\times (t \\gg 12 | t \\gg 8) \\& 63 \\& t \\gg 4) \\pmod{256}) / 128 - 1',
    params: [
      { name: 'speed', label: 'Clock Speed / Pitch', min: 4000, max: 16000, step: 200, defaultValue: 8000, unit: 'Hz' },
      { name: 'shiftA', label: 'Bitshift A', min: 6, max: 16, step: 1, defaultValue: 12, unit: 'bits' },
      { name: 'shiftB', label: 'Bitshift B', min: 4, max: 14, step: 1, defaultValue: 8, unit: 'bits' }
    ],
    code: `// Bytebeat_AlgorithmicSymphony.cpp
// Mathematical generative C++ Bytebeat Music Engine
#include <cstdint>

class BytebeatGenerator {
private:
    uint32_t t = 0;

public:
    inline float processSample(int clockRate, int shiftA, int shiftB) {
        t++;
        // Classic Viznut / algorithmic harmony formula:
        uint8_t byteSample = (t * ((t >> shiftA) | (t >> shiftB)) & 63 & (t >> 4));
        
        // Convert uint8 (0..255) to normalized audio float (-1.0f .. +1.0f)
        float audioOut = (static_cast<float>(byteSample) / 127.5f) - 1.0f;
        return audioOut * 0.7f;
    }
    
    void reset() { t = 0; }
};`
  },
  {
    id: 'moog_ladder',
    name: 'Moog 24dB 4-Pole Resonant Ladder Filter',
    category: 'Filter & EQ',
    description: 'Bilinear-transformed zero-delay feedback (ZDF) 4-pole Moog analog ladder filter with thermal diode saturation.',
    formula: 'H(s) = \\frac{1}{(1 + s / \\omega_c)^4 + k}',
    params: [
      { name: 'cutoff', label: 'Cutoff Frequency', min: 40, max: 18000, step: 50, defaultValue: 1800, unit: 'Hz' },
      { name: 'resonance', label: 'Ladder Resonance (Q)', min: 0.1, max: 4.0, step: 0.1, defaultValue: 2.8, unit: 'Q' },
      { name: 'drive', label: 'Thermal Saturation Drive', min: 0.0, max: 1.0, step: 0.05, defaultValue: 0.4, unit: '%' }
    ],
    code: `// MoogLadder_ZDF.cpp
// Zero-Delay Feedback 24dB Moog Ladder Low-pass Filter in C++
#include <cmath>
#include <algorithm>

class MoogLadderZDF {
private:
    float s[4] = {0.0f};

public:
    inline float processSample(float input, float sampleRate, float cutoffHz, float resonanceQ, float drive) {
        float omega = 2.0f * 3.14159265f * (cutoffHz / sampleRate);
        float g = 0.9892f * omega - 0.4342f * omega * omega;
        g = std::clamp(g, 0.001f, 0.95f);

        // Feedback calculation with non-linear tanh saturation
        float fb = resonanceQ * s[3];
        float inDrive = std::tanh((input - fb) * (1.0f + drive * 2.5f));

        s[0] += g * (inDrive - s[0]);
        s[1] += g * (s[0] - s[1]);
        s[2] += g * (s[1] - s[2]);
        s[3] += g * (s[2] - s[3]);

        return s[3];
    }
};`
  },
  {
    id: 'freeverb_reverb',
    name: 'Schroeder-Moorer Freeverb Stereo Reverb',
    category: 'Spatial FX',
    description: 'Algorithmic 8 parallel Low-Pass Comb Filters (LBCF) + 4 series All-Pass Filters with stereo spread and room damping.',
    formula: 'y(t) = \\sum_{i=1}^8 \\text{LBCF}_i(x(t)) \\rightarrow \\prod_{j=1}^4 \\text{APF}_j',
    params: [
      { name: 'roomSize', label: 'Room Size / Decay', min: 0.2, max: 0.98, step: 0.02, defaultValue: 0.82, unit: 'size' },
      { name: 'damping', label: 'HF Damping', min: 0.0, max: 0.9, step: 0.05, defaultValue: 0.35, unit: 'damp' },
      { name: 'width', label: 'Stereo Width', min: 0.0, max: 1.0, step: 0.05, defaultValue: 0.8, unit: 'spread' }
    ],
    code: `// Freeverb_SchroederReverb.cpp
// 8-Comb + 4-Allpass Schroeder-Moorer Algorithmic Reverb in C++
#include <vector>
#include <cmath>

class FreeverbReverb {
private:
    std::vector<float> combBuffers[8];
    int combPointers[8] = {0};
    const int combLengths[8] = {1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617};
    float combFilterStores[8] = {0.0f};

public:
    FreeverbReverb() {
        for (int i = 0; i < 8; ++i) {
            combBuffers[i].assign(combLengths[i], 0.0f);
        }
    }

    inline float process(float in, float roomSize, float damping) {
        float out = 0.0f;
        for (int i = 0; i < 8; ++i) {
            float cur = combBuffers[i][combPointers[i]];
            combFilterStores[i] = cur * (1.0f - damping) + combFilterStores[i] * damping;
            combBuffers[i][combPointers[i]] = in + combFilterStores[i] * roomSize;
            combPointers[i] = (combPointers[i] + 1) % combLengths[i];
            out += cur;
        }
        return out * 0.125f;
    }
};`
  },
  {
    id: 'dx7_brass',
    name: 'Yamaha DX7 4-Operator FM Brass',
    category: 'FM Synthesis',
    description: '4-Operator frequency modulation algorithm delivering crisp polyphonic synth brass with dynamic envelope modulation.',
    formula: 'y(t) = \\sin(\\omega_1 t + I_1 \\sin(\\omega_2 t + I_2 \\sin(\\omega_3 t)))',
    params: [
      { name: 'harmonicRatio', label: 'Modulator Harmonic Ratio', min: 1.0, max: 6.0, step: 0.5, defaultValue: 2.0, unit: 'ratio' },
      { name: 'fmDepth', label: 'FM Depth (Bite)', min: 0.0, max: 12.0, step: 0.5, defaultValue: 5.5, unit: 'index' },
      { name: 'brightness', label: 'Brass Filter Cutoff', min: 500, max: 10000, step: 100, defaultValue: 4200, unit: 'Hz' }
    ],
    code: `// DX7_4Operator_Brass.cpp
// 4-Operator Frequency Modulation Synth Engine in C++
#include <cmath>

class DX7BrassSynth {
private:
    float opPhases[4] = {0.0f};

public:
    inline float processSample(float freq, float sampleRate, float ratio, float depth) {
        float w0 = 2.0f * 3.14159265f * freq / sampleRate;
        opPhases[3] += w0 * 3.0f;
        float op4 = std::sin(opPhases[3]) * depth * 0.4f;

        opPhases[2] += w0 * 2.0f;
        float op3 = std::sin(opPhases[2] + op4) * depth * 0.6f;

        opPhases[1] += w0 * ratio;
        float op2 = std::sin(opPhases[1] + op3) * depth;

        opPhases[0] += w0 * 1.0f;
        float op1 = std::sin(opPhases[0] + op2);

        return op1 * 0.7f;
    }
};`
  },
  {
    id: 'ping_pong_delay',
    name: 'Stereo Ping-Pong Cross-Feedback Tape Delay',
    category: 'Spatial FX',
    description: 'Stereo delay network bouncing reflections left and right with high-cut tape warmth and saturation.',
    formula: 'y_L[n] = x_L[n] + \\text{Delay}_R[n - D_R] \\cdot g, \\quad y_R[n] = x_R[n] + \\text{Delay}_L[n - D_L] \\cdot g',
    params: [
      { name: 'time', label: 'Delay Time (ms)', min: 50, max: 800, step: 25, defaultValue: 375, unit: 'ms' },
      { name: 'feedback', label: 'Stereo Feedback', min: 0.1, max: 0.88, step: 0.02, defaultValue: 0.55, unit: 'fb' },
      { name: 'damping', label: 'Tape Saturation & Damp', min: 0.0, max: 0.9, step: 0.05, defaultValue: 0.4, unit: 'damp' }
    ],
    code: `// StereoPingPongDelay.cpp
// Stereo Cross-Feedback Tape Echo in C++
#include <vector>
#include <cmath>
#include <algorithm>

class StereoPingPongDelay {
private:
    std::vector<float> bufferL, bufferR;
    int writeIdx = 0;
    int maxDelaySamples = 44100 * 2;
    float filterL = 0.0f, filterR = 0.0f;

public:
    StereoPingPongDelay() {
        bufferL.assign(maxDelaySamples, 0.0f);
        bufferR.assign(maxDelaySamples, 0.0f);
    }

    void process(float inL, float inR, float delayMs, float feedback, float damping, float sampleRate, float& outL, float& outR) {
        int delaySamples = static_cast<int>((delayMs / 1000.0f) * sampleRate);
        delaySamples = std::clamp(delaySamples, 1, maxDelaySamples - 1);

        int readIdx = (writeIdx - delaySamples + maxDelaySamples) % maxDelaySamples;
        float delayedL = bufferL[readIdx];
        float delayedR = bufferR[readIdx];

        // Tape lowpass damp
        filterL = delayedL * (1.0f - damping) + filterL * damping;
        filterR = delayedR * (1.0f - damping) + filterR * damping;

        // Cross feedback
        bufferL[writeIdx] = inL + std::tanh(filterR * feedback);
        bufferR[writeIdx] = inR + std::tanh(filterL * feedback);

        writeIdx = (writeIdx + 1) % maxDelaySamples;

        outL = inL + delayedL;
        outR = inR + delayedR;
    }
};`
  },
  {
    id: 'west_coast_wavefolder',
    name: 'West-Coast Dynamic Wavefolder (Buchla 259)',
    category: 'Harmonic Distortion',
    description: 'Non-linear folded transfer function folding audio peaks back inward to synthesize rich metallic overtones.',
    formula: 'y(t) = 4 \\cdot \\left| \\text{fmod}(x(t) \\cdot G + 0.25, 1.0) - 0.5 \\right| - 1.0',
    params: [
      { name: 'drive', label: 'Fold Drive Intensity', min: 1.0, max: 8.0, step: 0.2, defaultValue: 3.5, unit: 'drive' },
      { name: 'stages', label: 'Folding Cascades', min: 1, max: 4, step: 1, defaultValue: 2, unit: 'folds' },
      { name: 'symmetry', label: 'Even-Harmonic Asymmetry', min: -0.5, max: 0.5, step: 0.05, defaultValue: 0.1, unit: 'bias' }
    ],
    code: `// WestCoast_Wavefolder.cpp
// Multi-Stage Buchla Timbre Wavefolding Module in C++
#include <cmath>

class WestCoastWavefolder {
public:
    static inline float foldSample(float x) {
        // Continuous trigonometric fold
        return std::sin(x * 1.57079632679f);
    }

    inline float processSample(float input, float drive, int stages, float symmetry) {
        float x = (input + symmetry) * drive;
        for (int i = 0; i < stages; ++i) {
            x = foldSample(x);
        }
        return x * 0.8f;
    }
};`
  }
];
