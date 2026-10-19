import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';

/**
 * Returns the browser's native SpeechRecognition constructor if available.
 * Supports standard and webkit prefixed implementations.
 */
export function getSpeechRecognitionConstructor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

/**
 * Checks whether the current browser environment supports the Web Speech API.
 */
export function isVoiceSearchSupported() {
  return Boolean(getSpeechRecognitionConstructor());
}

/**
 * Headless custom hook for managing voice search sessions in Discover Egypt.
 * Supports Egyptian Arabic (ar-EG with ar-SA fallback) and English (en-US with en fallback).
 *
 * @param {object} options
 * @param {function} [options.onTranscript] - Called with final recognized transcript
 * @param {function} [options.onInterimTranscript] - Called with live partial transcript
 * @param {function} [options.onError] - Called when a recognition error occurs
 */
export function useVoiceSearch({ onTranscript, onInterimTranscript, onError } = {}) {
  const { isArabic, t } = useLanguage();
  const [status, setStatus] = useState('idle'); // idle | listening | processing | success | no-speech | denied | unsupported | network | audio-capture | error | cancelled
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);
  const isStartingRef = useRef(false);
  const statusTimerRef = useRef(null);
  const fallbackAttemptedRef = useRef(false);
  const startListeningRef = useRef(null);

  // Clear transient status message after timeout
  const scheduleStatusReset = useCallback((delayMs = 4500) => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => {
      setStatus((prev) => (prev === 'listening' || prev === 'processing' ? prev : 'idle'));
      setErrorMessage('');
    }, delayMs);
  }, []);

  const stopListening = useCallback(() => {
    isStartingRef.current = false;
    if (recognitionRef.current && isListeningRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('SpeechRecognition stop notice:', err);
      }
    }
  }, []);

  const cancelListening = useCallback(() => {
    isStartingRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (err) {
        console.warn('SpeechRecognition abort notice:', err);
      }
    }
    isListeningRef.current = false;
    setStatus('cancelled');
    setInterimTranscript('');
    scheduleStatusReset(2500);
  }, [scheduleStatusReset]);

  const resetState = useCallback(() => {
    isStartingRef.current = false;
    if (recognitionRef.current && isListeningRef.current) {
      cancelListening();
    }
    setStatus('idle');
    setTranscript('');
    setInterimTranscript('');
    setErrorMessage('');
    fallbackAttemptedRef.current = false;
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
  }, [cancelListening]);

  const startListening = useCallback((isRetry = false) => {
    const SpeechRecognition = getSpeechRecognitionConstructor();

    if (!SpeechRecognition) {
      setStatus('unsupported');
      const msg = t('voiceSearch.unsupported');
      setErrorMessage(msg);
      if (onError) onError('unsupported', msg);
      scheduleStatusReset(5000);
      return;
    }

    // Prevent concurrent initialization
    if (isStartingRef.current) {
      return;
    }

    if (isListeningRef.current && recognitionRef.current) {
      stopListening();
      return;
    }

    isStartingRef.current = true;

    if (!isRetry) {
      fallbackAttemptedRef.current = false;
    }

    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    setStatus('listening');
    setTranscript('');
    setInterimTranscript('');
    setErrorMessage('');

    // Abort and release any dangling instance before creating new session
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // Privacy & Specification constraints: Never continuously record
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Primary language tag with regional fallback
      if (isArabic) {
        recognition.lang = fallbackAttemptedRef.current ? 'ar' : 'ar-EG';
      } else {
        recognition.lang = fallbackAttemptedRef.current ? 'en' : 'en-US';
      }

      recognition.onstart = () => {
        isStartingRef.current = false;
        isListeningRef.current = true;
        setStatus('listening');
      };

      recognition.onspeechstart = () => {
        setStatus('listening');
      };

      recognition.onspeechend = () => {
        setStatus('processing');
      };

      recognition.onresult = (event) => {
        let finalOutput = '';
        let interimOutput = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript || '';
          if (result.isFinal) {
            finalOutput += text;
          } else {
            interimOutput += text;
          }
        }

        if (interimOutput) {
          setInterimTranscript(interimOutput);
          if (onInterimTranscript) onInterimTranscript(interimOutput);
        }

        if (finalOutput) {
          const cleanFinal = finalOutput.trim();
          setTranscript(cleanFinal);
          setInterimTranscript('');
          setStatus('success');
          if (onTranscript) onTranscript(cleanFinal);
          scheduleStatusReset(3500);
        }
      };

      recognition.onerror = (event) => {
        isStartingRef.current = false;
        isListeningRef.current = false;
        console.warn('SpeechRecognition error:', event.error);

        // If dialect tag caused language-not-supported or network, try regional fallback once
        if (
          !fallbackAttemptedRef.current &&
          (event.error === 'language-not-supported' || event.error === 'network')
        ) {
          fallbackAttemptedRef.current = true;
          console.info('Retrying speech recognition with broader locale tag...');
          setTimeout(() => {
            if (startListeningRef.current) {
              startListeningRef.current(true);
            }
          }, 150);
          return;
        }

        let errType;
        let msg;

        switch (event.error) {
          case 'not-allowed':
          case 'service-not-allowed':
            errType = 'denied';
            msg = t('voiceSearch.denied');
            break;
          case 'audio-capture':
            errType = 'audio-capture';
            msg = t('voiceSearch.audioCaptureError');
            break;
          case 'network':
            errType = 'network';
            msg = t('voiceSearch.networkError');
            break;
          case 'language-not-supported':
            errType = 'language-not-supported';
            msg = t('voiceSearch.languageNotSupported');
            break;
          case 'no-speech':
            errType = 'no-speech';
            msg = t('voiceSearch.noSpeech');
            break;
          case 'aborted':
            errType = 'cancelled';
            msg = t('voiceSearch.cancelled');
            break;
          default:
            errType = 'error';
            msg = t('voiceSearch.error');
            break;
        }

        setStatus(errType);
        setErrorMessage(msg);
        if (onError) onError(errType, msg);
        scheduleStatusReset(5000);
      };

      recognition.onend = () => {
        isStartingRef.current = false;
        isListeningRef.current = false;
        recognitionRef.current = null;
        setStatus((prev) => {
          if (prev === 'listening' || prev === 'processing') {
            return 'idle';
          }
          return prev;
        });
      };

      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      isStartingRef.current = false;
      isListeningRef.current = false;
      setStatus('error');
      const msg = t('voiceSearch.error');
      setErrorMessage(msg);
      if (onError) onError('error', msg);
      scheduleStatusReset(5000);
    }
  }, [isArabic, t, onTranscript, onInterimTranscript, onError, scheduleStatusReset, stopListening]);

  useEffect(() => {
    startListeningRef.current = startListening;
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, []);

  return {
    isSupported: isVoiceSearchSupported(),
    isListening: status === 'listening',
    isProcessing: status === 'processing',
    status,
    transcript,
    interimTranscript,
    errorMessage,
    startListening,
    stopListening,
    cancelListening,
    resetState,
  };
}
