import { useState, useRef, useEffect } from 'react';
import { useVoiceSearch } from '../hooks/useVoiceSearch';
import { useLanguage } from '../context/LanguageContext';
import './VoiceSearchButton.css';

/**
 * Reusable, accessible Voice Search Button for Discover Egypt.
 * Provides live speech recognition, Material Symbols icons, animated radar ring,
 * and localized status popovers for Arabic (ar-EG) and English (en-US).
 *
 * @param {object} props
 * @param {function} props.onTranscript - Called when speech is recognized
 * @param {function} [props.onInterimTranscript] - Optional callback for live speech preview
 * @param {string} [props.className] - Optional extra class names
 * @param {string} [props.size] - Size variant ('sm' | 'default' | 'lg')
 * @param {React.RefObject} [props.inputRef] - Search input ref to focus after voice capture
 * @param {boolean} [props.showLiveStatus] - Whether to display floating feedback popover
 */
export default function VoiceSearchButton({
  onTranscript,
  onInterimTranscript,
  className = '',
  size = 'default',
  inputRef = null,
  showLiveStatus = true,
}) {
  const { isArabic, t } = useLanguage();
  const [dismissedStatus, setDismissedStatus] = useState(null);
  const containerRef = useRef(null);

  const {
    isSupported,
    isListening,
    isProcessing,
    status,
    transcript,
    interimTranscript,
    errorMessage,
    startListening,
    stopListening,
    cancelListening,
  } = useVoiceSearch({
    onTranscript: (finalText) => {
      if (onTranscript) {
        onTranscript(finalText);
      }
      if (inputRef && inputRef.current) {
        inputRef.current.focus();
      }
    },
    onInterimTranscript,
  });

  // Handle clicking outside to dismiss the status popover
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (!isListening) {
          setDismissedStatus(status);
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isListening, status]);

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isListening) {
      stopListening();
    } else {
      setDismissedStatus(null);
      startListening();
      if (inputRef && inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const getButtonTitle = () => {
    if (!isSupported) return t('voiceSearch.unsupported');
    if (isListening) return t('voiceSearch.buttonListening');
    if (isProcessing) return t('voiceSearch.processing');
    return isArabic
      ? t('voiceSearch.speakArabicPrompt')
      : t('voiceSearch.speakEnglishPrompt');
  };

  const getStatusText = () => {
    if (errorMessage) return errorMessage;
    if (status === 'listening') return t('voiceSearch.listening');
    if (status === 'processing') return t('voiceSearch.processing');
    if (status === 'success') return t('voiceSearch.success', { transcript });
    if (status === 'no-speech') return t('voiceSearch.noSpeech');
    if (status === 'denied') return t('voiceSearch.denied');
    if (status === 'unsupported') return t('voiceSearch.unsupported');
    if (status === 'network') return t('voiceSearch.networkError');
    if (status === 'audio-capture') return t('voiceSearch.audioCaptureError');
    if (status === 'language-not-supported') return t('voiceSearch.languageNotSupported');
    if (status === 'cancelled') return t('voiceSearch.cancelled');
    if (status === 'error') return t('voiceSearch.error');
    return '';
  };

  const quickSuggestions = isArabic
    ? ['أهرامات الجيزة', 'الأقصر', 'خان الخليلي', 'الإسكندرية', 'أسوان']
    : ['Giza Pyramids', 'Luxor', 'Khan El Khalili', 'Alexandria', 'Aswan'];

  const handleSelectSuggestion = (suggestion) => {
    if (onTranscript) {
      onTranscript(suggestion);
    }
    setDismissedStatus(status);
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleRetry = (e) => {
    e.preventDefault();
    e.stopPropagation();
    startListening();
  };

  const isErrorState =
    status === 'error' ||
    status === 'network' ||
    status === 'denied' ||
    status === 'audio-capture' ||
    status === 'language-not-supported' ||
    status === 'unsupported' ||
    status === 'no-speech';

  const showPopover = showLiveStatus && dismissedStatus !== status && status !== 'idle';

  return (
    <div
      ref={containerRef}
      className={`voice-search-container ${className}`}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <button
        type="button"
        onClick={handleToggle}
        className={`voice-search-btn ${isListening ? 'is-listening' : ''} ${
          isProcessing ? 'is-processing' : ''
        } ${status === 'denied' ? 'is-denied' : ''} ${
          !isSupported ? 'is-unsupported' : ''
        }`}
        aria-label={getButtonTitle()}
        aria-pressed={isListening}
        title={getButtonTitle()}
        data-testid="voice-search-trigger"
      >
        <span
          className={`material-symbols-outlined ${
            isProcessing ? 'voice-icon-spin' : ''
          }`}
          style={{ fontSize: size === 'sm' ? '18px' : '22px' }}
        >
          {!isSupported || status === 'denied'
            ? 'mic_off'
            : isProcessing
            ? 'sync'
            : 'mic'}
        </span>
      </button>

      {/* Accessible Live Announcement Region for Screen Readers */}
      <div
        role="status"
        aria-live="polite"
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {getStatusText()}
      </div>

      {/* Live Floating Status Popover */}
      {showPopover && (
        <div
          className="voice-search-status-popover"
          role="dialog"
          aria-label={t('voiceSearch.buttonLabel')}
        >
          <div className="voice-status-header">
            <span className="voice-status-title">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {isListening
                  ? 'record_voice_over'
                  : isProcessing
                  ? 'sync'
                  : isErrorState
                  ? 'warning'
                  : 'info'}
              </span>
              <span>
                {isListening
                  ? isArabic
                    ? 'البحث الصوتي مفعّل'
                    : 'Voice Search Active'
                  : isErrorState
                  ? isArabic
                    ? 'تنبيه البحث الصوتي'
                    : 'Voice Search Notice'
                  : t('voiceSearch.buttonLabel')}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                if (isListening) cancelListening();
                else setDismissedStatus(status);
              }}
              className="voice-status-close-btn"
              aria-label={t('voiceSearch.cancelled')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                close
              </span>
            </button>
          </div>

          <div
            className={`voice-status-body ${
              isErrorState ? 'voice-status-error' : ''
            }`}
          >
            {isErrorState && (
              <span
                className="material-symbols-outlined"
                style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}
              >
                error_outline
              </span>
            )}
            <span style={{ flex: 1 }}>{getStatusText()}</span>
          </div>

          {interimTranscript && isListening && (
            <div className="voice-status-interim">
              "{interimTranscript}"
            </div>
          )}

          {/* Retry Button on transient failure */}
          {isErrorState && isSupported && (
            <div className="voice-status-actions">
              <button
                type="button"
                onClick={handleRetry}
                className="voice-status-retry-btn"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                  refresh
                </span>
                <span>{t('voiceSearch.retry')}</span>
              </button>
            </div>
          )}

          {/* Quick Suggestions Helper */}
          {isErrorState && (
            <div className="voice-status-suggestions">
              <div className="voice-suggestions-label">
                {t('voiceSearch.quickSuggestions')}
              </div>
              <div className="voice-suggestions-chips">
                {quickSuggestions.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleSelectSuggestion(name)}
                    className="voice-chip-btn"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
