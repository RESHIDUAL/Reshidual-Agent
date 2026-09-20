import { useState, useRef, useCallback, useEffect } from 'react';

export type AssistantState = 'idle' | 'waiting_hotword' | 'recording_query' | 'submitting';

interface UseVoiceAssistantOptions {
  onTranscription: (text: string) => void;
  autoRestart?: boolean;
}

function playTone(freqs: number[], durations: number[], type: OscillatorType = 'sine') {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    let startTime = ctx.currentTime;
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.08, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durations[idx]);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + durations[idx]);
      startTime += durations[idx] * 0.75;
    });
  } catch (err) {
    console.warn('Audio tone error:', err);
  }
}

export function useVoiceAssistant({ onTranscription, autoRestart = true }: UseVoiceAssistantOptions) {
  const [isActive, setIsActive] = useState(false);
  const [state, setState] = useState<AssistantState>('idle');
  const [queryText, setQueryText] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isActiveRef = useRef(false);
  const stateRef = useRef<AssistantState>('idle');
  const accumulatedTextRef = useRef('');

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const updateAudioLevels = useCallback(() => {
    if (!analyserRef.current || !isActiveRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    setAudioLevel(Math.min(1, avg / 96));

    animFrameRef.current = requestAnimationFrame(updateAudioLevels);
  }, []);

  const triggerSubmission = useCallback((finalText: string) => {
    const cleaned = finalText
      .replace(/^[,:\s\.\?!]+|[,:\s\.\?!]+$/g, '')
      .replace(/\bhello\b/gi, '')
      .replace(/\b(?:now\s+start|no\s+start|know\s+start|now\s+started)\b/gi, '')
      .trim();

    if (!cleaned) {
      setState('waiting_hotword');
      accumulatedTextRef.current = '';
      setQueryText('');
      return;
    }

    setState('submitting');
    setQueryText(cleaned);
    playTone([783.99, 1046.50], [0.09, 0.18]);

    setTimeout(() => {
      onTranscription(cleaned);
      accumulatedTextRef.current = '';
      setQueryText('');
      if (isActiveRef.current && autoRestart) {
        setState('waiting_hotword');
      } else {
        setState('idle');
        setIsActive(false);
      }
    }, 450);
  }, [onTranscription, autoRestart]);

  const processTranscript = useCallback((transcript: string) => {
    const lower = transcript.toLowerCase();
    const currentAssistantState = stateRef.current;

    const hasHello = /\bhello\b/i.test(lower);
    const hasEndWord = /\b(?:now\s+start|no\s+start|know\s+start|now\s+started)\b/i.test(lower);

    if (currentAssistantState === 'waiting_hotword') {
      if (hasHello) {
        playTone([523.25, 659.25, 783.99], [0.08, 0.08, 0.12]);
        setState('recording_query');

        if (hasEndWord) {
          const match = transcript.match(/\bhello\b[\s,:]*(.*?)[\s,:]*\b(?:now\s+start|no\s+start|know\s+start|now\s+started)\b/i);
          if (match && match[1]?.trim()) {
            triggerSubmission(match[1].trim());
            return;
          }
        }

        const afterHello = transcript.split(/\bhello\b/i).pop()?.trim() || '';
        accumulatedTextRef.current = afterHello;
        setQueryText(afterHello);
      }
    } else if (currentAssistantState === 'recording_query') {
      if (hasEndWord) {
        let candidate = '';
        const match = transcript.match(/\bhello\b[\s,:]*(.*?)[\s,:]*\b(?:now\s+start|no\s+start|know\s+start|now\s+started)\b/i);
        if (match && match[1]?.trim()) {
          candidate = match[1].trim();
        } else {
          const parts = transcript.split(/\b(?:now\s+start|no\s+start|know\s+start|now\s+started)\b/i);
          candidate = parts[0].replace(/\bhello\b/gi, '').trim();
        }
        triggerSubmission(candidate);
      } else {
        const afterHello = transcript.split(/\bhello\b/i).pop()?.trim() || transcript;
        accumulatedTextRef.current = afterHello;
        setQueryText(afterHello);
      }
    }
  }, [triggerSubmission]);

  const startAssistant = useCallback(async () => {
    try {
      setErrorMessage(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (!SpeechRecognition) {
        setErrorMessage('Speech recognition is not supported in this environment');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let full = '';
        for (let i = 0; i < event.results.length; i++) {
          full += event.results[i][0].transcript + ' ';
        }
        processTranscript(full.trim());
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.warn('SpeechRecognition error:', event.error);
        }
      };

      recognition.onend = () => {
        if (isActiveRef.current) {
          try {
            recognition.start();
          } catch (e) {
            console.warn('Recognition restart error:', e);
          }
        }
      };

      recognition.start();
      recognitionRef.current = recognition;

      setIsActive(true);
      setState('waiting_hotword');
      accumulatedTextRef.current = '';
      setQueryText('');

      updateAudioLevels();
    } catch (err: any) {
      console.error('Failed to start voice assistant:', err);
      setErrorMessage(err?.message || 'Failed to access microphone');
    }
  }, [processTranscript, updateAudioLevels]);

  const stopAssistant = useCallback(() => {
    setIsActive(false);
    setState('idle');
    accumulatedTextRef.current = '';
    setQueryText('');
    setAudioLevel(0);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Recognition stop error:', e);
      }
      recognitionRef.current = null;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  }, []);

  const manualSubmit = useCallback(() => {
    if (accumulatedTextRef.current.trim()) {
      triggerSubmission(accumulatedTextRef.current.trim());
    } else {
      stopAssistant();
    }
  }, [triggerSubmission, stopAssistant]);

  useEffect(() => {
    return () => {
      stopAssistant();
    };
  }, [stopAssistant]);

  return {
    isActive,
    state,
    queryText,
    audioLevel,
    errorMessage,
    startAssistant,
    stopAssistant,
    manualSubmit
  };
}
