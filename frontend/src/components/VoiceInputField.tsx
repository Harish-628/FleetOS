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
        <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">
          {icon && <span className="text-sm mr-0.5 inline-flex items-center">{icon}</span>}
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>
        {isListening && (
          <span className="flex items-center space-x-1.5 text-xs text-rose-600 dark:text-rose-400 font-bold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-rose-600"></span>
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
          className={`w-full min-h-[50px] pl-3.5 pr-14 bg-white dark:bg-zinc-900 border ${
            error
              ? 'border-rose-500 focus:ring-rose-500 focus:border-rose-500'
              : isListening
              ? 'border-teal-600 dark:border-teal-400 ring-2 ring-teal-600/20'
              : 'border-slate-300 dark:border-zinc-700 focus:border-teal-600 dark:focus:border-teal-500 focus:ring-teal-600 dark:focus:ring-teal-500'
          } rounded-md text-slate-900 dark:text-zinc-50 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 text-base ${
            fontMono ? 'font-mono tabular-nums' : ''
          }`}
        />

        {/* 48px Touch Target Microphone Button with clear bilingual caption */}
        <button
          type="button"
          onClick={toggleListening}
          className={`absolute right-1 w-[46px] h-[42px] rounded-md flex flex-col items-center justify-center transition active:scale-95 ${
            isListening
              ? 'bg-rose-600 text-white shadow-xs animate-pulse'
              : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700'
          }`}
          title={isListening ? 'Stop listening' : t.speechTapToSpeak}
          aria-label={isListening ? 'Stop listening' : t.speechTapToSpeak}
        >
          {isListening ? (
            <MicOff className="w-4 h-4 text-white" />
          ) : (
            <>
              <Mic className="w-4 h-4 text-teal-700 dark:text-teal-400" />
              <span className="text-[9px] font-bold text-teal-700 dark:text-teal-400 mt-0.5 leading-none">
                {language === 'ta' ? 'பேசுக' : 'Speak'}
              </span>
            </>
          )}
        </button>
      </div>

      {/* Quick Denomination Chips for easy one-tap input */}
      {quickAddChips && quickAddChips.length > 0 && (
        <div className="flex items-center space-x-1.5 overflow-x-auto pt-0.5 pb-1">
          {quickAddChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => {
                triggerDriverHaptic([20]);
                const currentVal = typeof value === 'number' ? value : (Number(value) || 0);
                onChange(currentVal + chip);
              }}
              className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 hover:border-teal-600 dark:hover:border-teal-500 text-xs font-mono font-semibold text-teal-800 dark:text-teal-300 tabular-nums active:scale-95 transition"
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
              className="px-2.5 py-1 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/50 text-xs font-mono font-medium active:scale-95 transition"
              title="Clear amount"
            >
              ✕ Clear
            </button>
          )}
        </div>
      )}

      {speechHint && !error && (
        <p className="text-[11px] text-teal-700 dark:text-teal-400 font-mono mt-0.5">{speechHint}</p>
      )}

      {error ? (
        <p className="flex items-center text-xs text-rose-600 dark:text-rose-400 mt-1">
          <AlertCircle className="w-3.5 h-3.5 mr-1 flex-shrink-0" />
          <span>{error}</span>
        </p>
      ) : helpText ? (
        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">{helpText}</p>
      ) : null}
    </div>
  );
};
