import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, AlertCircle } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { parseSpokenNumber, parseSpokenText } from '../lib/speechParser';
import { triggerDriverHaptic } from '../lib/formatters';

interface VoiceInputFieldProps {
  label: string;
  value: string | number;
  onChange: (val: any) => void;
  type?: 'text' | 'number';
  placeholder?: string;
  required?: boolean;
  helpText?: string;
  error?: string | null;
  min?: number;
  step?: string;
  inputMode?: 'text' | 'numeric' | 'decimal';
  fontMono?: boolean;
  icon?: React.ReactNode;
  quickAddChips?: number[];
}

export const VoiceInputField: React.FC<VoiceInputFieldProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  helpText,
  error,
  min,
  step,
  inputMode,
  fontMono = false,
  icon,
  quickAddChips,
}) => {
  const { language, t } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [speechHint, setSpeechHint] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize SpeechRecognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === 'ta' ? 'ta-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechHint(t.speechListening);
        triggerDriverHaptic([40]);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (type === 'number') {
          const parsed = parseSpokenNumber(transcript);
          if (parsed !== '') {
            onChange(parsed);
          } else {
            setSpeechHint(`Spoken: "${transcript}"`);
          }
        } else {
          const parsed = parseSpokenText(transcript);
          onChange(parsed);
        }
        triggerDriverHaptic([20, 40]);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setSpeechHint(t.speechDenied);
        } else {
          setSpeechHint(`Speech error: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, [language, type, t]);

  const toggleListening = () => {
    triggerDriverHaptic([30]);

    if (!recognitionRef.current) {
      setSpeechHint(t.speechNotSupported);
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {}
      setIsListening(false);
    } else {
      setSpeechHint(null);
      try {
        recognitionRef.current.lang = language === 'ta' ? 'ta-IN' : 'en-IN';
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Speech start error:', err);
      }
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="flex items-center space-x-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
          {icon && <span className="text-sm mr-0.5 inline-flex items-center">{icon}</span>}
          <span>{label}</span>
          {required && <span className="text-[#EF4444]">*</span>}
        </label>
        {isListening && (
          <span className="flex items-center space-x-1.5 text-xs text-[#EF4444] font-bold animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span>
            <span>🎙️ {t.speechListening}</span>
          </span>
        )}
      </div>

      <div className="relative flex items-center">
        <input
          type={type}
          value={value === 0 && type === 'number' ? '0' : value}
          onChange={(e) => {
            const val = e.target.value;
            if (type === 'number') {
              onChange(val === '' ? '' : Number(val));
            } else {
              onChange(val);
            }
          }}
          placeholder={placeholder}
          required={required}
          min={min}
          step={step}
          inputMode={inputMode || (type === 'number' ? 'numeric' : 'text')}
          className={`w-full min-h-[56px] pl-4 pr-16 bg-[#090D16] border ${
            error
              ? 'border-[#EF4444] focus:ring-[#EF4444]'
              : isListening
              ? 'border-[#10B981] ring-2 ring-[#10B981]/30'
              : 'border-[#1E293B] focus:border-[#10B981] focus:ring-[#10B981]'
          } rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 text-base ${
            fontMono ? 'font-mono' : ''
          }`}
        />

        {/* 52px Touch Target Microphone Button with clear bilingual caption */}
        <button
          type="button"
          onClick={toggleListening}
          className={`absolute right-1 w-[52px] h-[50px] rounded-lg flex flex-col items-center justify-center transition active:scale-90 ${
            isListening
              ? 'bg-[#EF4444] text-white shadow-lg shadow-red-900/50 animate-pulse'
              : 'bg-[#1E293B] hover:bg-[#334155] text-slate-300 hover:text-white border border-[#334155]'
          }`}
          title={isListening ? 'Stop listening' : t.speechTapToSpeak}
        >
          {isListening ? (
            <MicOff className="w-5 h-5 text-white animate-spin" />
          ) : (
            <>
              <Mic className="w-4 h-4 text-[#10B981]" />
              <span className="text-[9px] font-bold text-[#10B981] mt-0.5 leading-none">
                {language === 'ta' ? 'பேசுக' : 'Speak'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Quick Denomination Chips for easy one-tap input */}
      {quickAddChips && quickAddChips.length > 0 && (
        <div className="flex items-center space-x-1.5 overflow-x-auto pt-0.5">
          {quickAddChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                triggerDriverHaptic([20]);
                const currentVal = typeof value === 'number' ? value : (Number(value) || 0);
                onChange(currentVal + chip);
              }}
              className="px-2.5 py-1 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] border border-[#1E293B] hover:border-[#10B981]/50 text-xs font-mono font-bold text-emerald-400 active:scale-90 transition shadow-sm"
            >
              +₹{chip}
            </button>
          ))}
          {typeof value === 'number' && value > 0 && (
            <button
              type="button"
              onClick={() => {
                triggerDriverHaptic([20]);
                onChange('');
              }}
              className="px-2 py-1 rounded-lg bg-red-950/40 text-red-400 hover:text-red-200 border border-red-900/50 text-xs font-mono font-bold active:scale-90 transition"
              title="Clear amount"
            >
              ✕ Clear
            </button>
          )}
        </div>
      )}

      {speechHint && !error && (
        <p className="text-[11px] text-[#10B981] font-mono mt-0.5">{speechHint}</p>
      )}

      {error ? (
        <p className="flex items-center text-xs text-[#EF4444] mt-1">
          <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
          <span>{error}</span>
        </p>
      ) : helpText ? (
        <p className="text-[11px] text-slate-400 mt-1">{helpText}</p>
      ) : null}
    </div>
  );
};
