import React, { useEffect, useState } from 'react';
import { Mic, X } from 'lucide-react';

interface VocalPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (sampleUrl: string) => void;
}

// Simple list of vocal sample URLs (public/vocals folder)
const vocalSamples = [
  '/vocals/sample1.wav',
  '/vocals/sample2.wav',
];

export const VocalPickerModal: React.FC<VocalPickerModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [selected, setSelected] = useState<string>('');

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-xl p-6 w-96 shadow-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Choose a Vocal Sample</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-2 mb-4">
          {vocalSamples.map((url) => (
            <button
              key={url}
              onClick={() => setSelected(url)}
              className={`w-full text-left px-3 py-2 rounded ${selected === url ? 'bg-sky-600/30 text-sky-200' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'} `}
            >
              {url.split('/').pop()}
            </button>
          ))}
        </div>
        {/* Placeholder for live mic recording */}
        <div className="flex items-center gap-2 p-2 border border-slate-700 rounded bg-slate-800">
          <Mic className="w-5 h-5 text-sky-400" />
          <span className="text-slate-400 text-sm">Record from microphone (future)</span>
        </div>
        <div className="flex justify-end mt-4 space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected}
            className="px-3 py-1 text-sm rounded bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50"
          >
            Use Sample
          </button>
        </div>
      </div>
    </div>
  );
};
