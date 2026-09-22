import { useState, useRef, useEffect, useCallback } from 'react';

// Declarations for browser SpeechRecognition
interface SpeechRecognitionResultAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultItem {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionResultAlternative;
  [index: number]: SpeechRecognitionResultAlternative;
}

interface SpeechRecognitionResultListItems {
  length: number;
  item(index: number): SpeechRecognitionResultItem;
  [index: number]: SpeechRecognitionResultItem;
}

interface IWebSpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultListItems;
}

interface IWebSpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface IWebSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: IWebSpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: IWebSpeechRecognition, ev: IWebSpeechRecognitionEvent) => any) | null;
  onerror: ((this: IWebSpeechRecognition, ev: IWebSpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: IWebSpeechRecognition, ev: Event) => any) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: {
      new (): IWebSpeechRecognition;
    };
    webkitSpeechRecognition?: {
      new (): IWebSpeechRecognition;
    };
  }
}

export interface UseWebSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (finalTranscript: string, interimTranscript: string) => void;
  onError?: (errorMsg: string) => void;
}

export interface UseWebSpeechRecognitionResult {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  resetTranscript: () => void;
  clearError: () => void;
}

export function useWebSpeechRecognition(
  options: UseWebSpeechRecognitionOptions = {}
): UseWebSpeechRecognitionResult {
  const {
    lang = 'en-US',
    continuous = true,
    interimResults = true,
    onResult,
    onError,
  } = options;

  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<IWebSpeechRecognition | null>(null);
  const isManuallyStoppedRef = useRef<boolean>(false);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(Boolean(SpeechRecognitionClass));
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  const stopListening = useCallback(() => {
    isManuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignored if already stopped
      }
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const startListening = useCallback(() => {
    clearError();
    setTranscript('');
    setInterimTranscript('');
    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      const msg = 'Web Speech API is not supported in this browser. Please use Chrome, Edge, or Safari.';
      setError(msg);
      onErrorRef.current?.(msg);
      return;
    }

    try {
      // Abort previous instance if any
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognitionClass();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = lang;
      recognition.maxAlternatives = 1;

      isManuallyStoppedRef.current = false;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: IWebSpeechRecognitionEvent) => {
        let currentFinal = '';
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript || '';
          if (result.isFinal) {
            currentFinal += text;
          } else {
            currentInterim += text;
          }
        }

        if (currentFinal) {
          setTranscript((prev) => {
            const separator = prev && !prev.endsWith(' ') ? ' ' : '';
            const updated = prev + separator + currentFinal.trim();
            onResultRef.current?.(updated, currentInterim);
            return updated;
          });
        } else {
          onResultRef.current?.(transcript, currentInterim);
        }

        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: IWebSpeechRecognitionErrorEvent) => {
        let msg = '';
        switch (event.error) {
          case 'not-allowed':
          case 'permission-denied':
            msg = 'Microphone permission denied. Please allow microphone access in browser permissions.';
            break;
          case 'no-speech':
            // Frequent in continuous mode when silent, don't crash
            return;
          case 'audio-capture':
            msg = 'No microphone was detected. Please verify your audio hardware.';
            break;
          case 'network':
            msg = 'Network communication error during speech recognition.';
            break;
          case 'aborted':
            return;
          default:
            msg = `Speech recognition error: ${event.error}`;
        }

        setError(msg);
        onErrorRef.current?.(msg);
      };

      recognition.onend = () => {
        if (!isManuallyStoppedRef.current && continuous && isListening) {
          // In some browsers continuous listening stops on silence; restart unless stopped manually
          try {
            recognition.start();
            return;
          } catch {
            // ignore
          }
        }
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to initiate Web Speech API recognition:', err);
      const msg = err?.message || 'Failed to initialize speech recognition.';
      setError(msg);
      onErrorRef.current?.(msg);
      setIsListening(false);
    }
  }, [clearError, continuous, interimResults, lang, isListening, transcript]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
    clearError,
  };
}
