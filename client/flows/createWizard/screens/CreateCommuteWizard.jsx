import { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { VIBE_PRESETS } from '../../../data/vibes';
import { fetchWizardRecommendations, buildWizardPlaylist } from '../../../services/wizardApi';
import { useCommute } from '../../../context/CommuteContext';
import '../../../styles/CreateWizard.css';

const DURATION_OPTIONS = [10, 15, 20, 30, 45, 60];

function StepHeader({ stepIndex, onStepChange, canGoBack, canGoForward }) {
  const steps = ['Commute', 'Vibe', 'Topics', 'Summary'];
  return (
    <div className="wizard-stepper-container">
      <button
        type="button"
        className="stepper-nav-btn stepper-nav-prev"
        onClick={() => onStepChange(stepIndex - 1)}
        disabled={!canGoBack}
        aria-label="Previous step"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      
      <div className="wizard-stepper">
        {steps.map((label, index) => {
          // Only show current step on mobile (CSS will handle this)
          return (
            <div
              key={label}
              className={`wizard-step ${index === stepIndex ? 'active' : ''} ${index < stepIndex ? 'completed' : ''}`}
              data-current={index === stepIndex}
            >
              <span className="wizard-step-number">Step {index + 1}</span>
              <span className="wizard-step-label">{label}</span>
            </div>
          );
        })}
      </div>
      
      <button
        type="button"
        className="stepper-nav-btn stepper-nav-next"
        onClick={() => onStepChange(stepIndex + 1)}
        disabled={!canGoForward}
        aria-label="Next step"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}

function CommuteStep({ minutes, setMinutes, onNext }) {
  const handleSelect = useCallback((option) => {
    setMinutes(option);
  }, [setMinutes]);

  return (
    <div className="wizard-card">
      <h2>How long is your commute?</h2>
      <p className="wizard-subtitle">Pick a duration so we can tailor the playlist length.</p>

      <div className="duration-options">
        {DURATION_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={`chip ${minutes === option ? 'selected' : ''}`}
            onClick={() => handleSelect(option)}
          >
            {option} min
          </button>
        ))}
      </div>

      <label className="range-label">
        <span>{minutes} minutes</span>
        <input
          type="range"
          min="5"
          max="90"
          value={minutes}
          onChange={(event) => setMinutes(Number(event.target.value))}
        />
      </label>
    </div>
  );
}

function VibeStep({ vibeKey, onSelectVibe, onNext }) {
  const handleSelect = useCallback((key) => {
    onSelectVibe(key);
  }, [onSelectVibe]);

  return (
    <div className="wizard-card">
      <h2>What vibe are you feeling?</h2>
      <p className="wizard-subtitle">We use this to shape topics and difficulty that match your energy.</p>

      <div className="vibe-grid">
        {VIBE_PRESETS.map((vibe) => (
          <button
            key={vibe.key}
            type="button"
            className={`vibe-card ${vibeKey === vibe.key ? 'selected' : ''}`}
            onClick={() => handleSelect(vibe.key)}
          >
            <div className="vibe-title">{vibe.title}</div>
            <div className="vibe-tagline">{vibe.tagline}</div>
            <p className="vibe-description">{vibe.description}</p>
            <div className="vibe-suggestions">
              {vibe.suggestedTopics.slice(0, 3).map((topic) => (
                <span key={topic} className="chip small">{topic}</span>
              ))}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function TopicStep({
  topic,
  recommendations,
  recommendLoading,
  recommendError,
  refreshRecommendations,
  onNext,
  onTopicChange,
  onSuggestionSelect,
  hasDisplayedSuggestions
}) {
  const suggestions = recommendations?.suggestions ?? [];
  const hasSuggestions = suggestions.length > 0;

  return (
    <div className="wizard-card">
      <div className="topic-header">
        <div>
          <h2>Let&apos;s pick today&apos;s focus</h2>
          <p className="wizard-subtitle">Choose a topic or explore suggestions tuned to your vibe.</p>
        </div>
        <button
          type="button"
          className="ghost-pill"
          onClick={() => refreshRecommendations('')}
          disabled={recommendLoading}
        >
          {recommendLoading ? 'Fetching…' : hasDisplayedSuggestions ? 'Refresh suggestions' : 'Get suggestions'}
        </button>
      </div>

      <label className="text-input">
        <span>Topic</span>
        <input
          type="text"
          value={topic}
          onChange={(event) => onTopicChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              refreshRecommendations(event.currentTarget.value);
            }
          }}
        />
      </label>

      <div className="suggestions-block">
        <div className="suggestions-header">
          <h3>Suggested for you</h3>
        </div>

        {recommendError && <div className="error-banner">{recommendError}</div>}

        {!hasDisplayedSuggestions && !recommendLoading && !recommendError && (
          <div className="empty-state">Tap “Get suggestions” to pull topics tuned to your vibe, or type your own above.</div>
        )}

        {hasDisplayedSuggestions && !recommendLoading && !hasSuggestions && !recommendError && (
          <div className="empty-state">We didn&apos;t spot any standouts yet. Try a new topic or refresh.</div>
        )}

        {recommendLoading && (
          <div className="empty-state">Gathering suggestions…</div>
        )}

        {hasSuggestions && (
          <div className="suggestion-grid">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.topic}
                type="button"
                className={`suggestion-card ${topic.toLowerCase() === suggestion.topic.toLowerCase() ? 'selected' : ''}`}
                onClick={() => onSuggestionSelect(suggestion.topic)}
              >
                <div className="suggestion-topic">{suggestion.topic}</div>
                <div className="suggestion-reason">{suggestion.reason}</div>
                {suggestion.vibeMatched && <span className="badge">Matches your vibe</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryStep({
  commuteMinutes,
  vibe,
  topic,
  recommendations,
  setStepIndex,
  previewVideos
}) {
  return (
    <div className="wizard-card">
      <h2>Ready to roll?</h2>
      <p className="wizard-subtitle">We&apos;ll build a playlist that fits your commute and mood.</p>

      <div className="summary-grid">
        <div className="summary-item">
          <span className="summary-label">Commute</span>
          <span className="summary-value">{commuteMinutes} minutes</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Vibe</span>
          <span className="summary-value">{vibe.title}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Topic</span>
          <span className="summary-value">{topic}</span>
        </div>
      </div>

      <button type="button" className="link-btn" onClick={() => setStepIndex(2)}>
        ← Adjust topic or vibe
      </button>
    </div>
  );
}

function CreateCommuteWizard() {
  const navigate = useNavigate();
  const { topicsLearned } = useCommute();

  const [stepIndex, setStepIndex] = useState(0);
  const [commuteMinutes, setCommuteMinutes] = useState(20);
  const [vibeKey, setVibeKey] = useState(VIBE_PRESETS[0].key);
  const [topic, setTopic] = useState('');

  const [recommendations, setRecommendations] = useState(null);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendError, setRecommendError] = useState('');
  const [hasFetchedVibeSuggestions, setHasFetchedVibeSuggestions] = useState(false);
  const [hasDisplayedSuggestions, setHasDisplayedSuggestions] = useState(false);

  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const userId = 'demoUser';

  const vibePreset = useMemo(() => VIBE_PRESETS.find((v) => v.key === vibeKey) ?? VIBE_PRESETS[0], [vibeKey]);

  const effectiveDifficulty = useMemo(() => {
    return recommendations?.suggestedDifficulty ?? vibePreset.defaultDifficulty;
  }, [recommendations, vibePreset]);

  const canProceed = useMemo(() => {
    switch (stepIndex) {
      case 0:
        return commuteMinutes >= 5;
      case 1:
        return Boolean(vibeKey);
      case 2:
        return topic.trim().length > 0;
      default:
        return true;
    }
  }, [stepIndex, commuteMinutes, vibeKey, topic]);

  const handleNext = () => {
    if (!canProceed) return;
    setSubmitError('');
    setStepIndex((prev) => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleVibeSelect = useCallback((key) => {
    setVibeKey(key);
    setHasFetchedVibeSuggestions(false);
    setHasDisplayedSuggestions(false);
    setRecommendations(null);
    setRecommendError('');
  }, []);

  const handleTopicInputChange = useCallback((value) => {
    setTopic(value);
    setHasDisplayedSuggestions(false);
    setRecommendations(null);
    setRecommendError('');
  }, []);

  const handleSuggestionSelect = useCallback((selectedTopic) => {
    setTopic(selectedTopic);
    setHasFetchedVibeSuggestions(true);
    setHasDisplayedSuggestions(true);
    setRecommendations((prev) => (prev ? { ...prev, suggestions: prev.suggestions ?? [] } : prev));
    setRecommendError('');
  }, []);

  const loadRecommendations = useCallback(async (overrideTopic) => {
    const sourceTopic = typeof overrideTopic === 'string' ? overrideTopic : topic;
    const trimmedTopic = sourceTopic.trim();
    const requestTopic = trimmedTopic.length > 0 ? trimmedTopic : undefined;
    const refreshNonce = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    setHasFetchedVibeSuggestions(true);
    setRecommendLoading(true);
    setRecommendError('');
    setRecommendations(null);

    try {
      const { payload } = await fetchWizardRecommendations({
        userId,
        commuteDurationSec: commuteMinutes * 60,
        vibe: vibeKey,
        topic: requestTopic,
        topicsLearned,
        refreshNonce
      });
      const normalizedPayload = payload?.payload ?? payload;
      setRecommendations(normalizedPayload ?? { suggestions: [] });
      if ((normalizedPayload?.suggestions?.length ?? 0) > 0) {
        setHasDisplayedSuggestions(true);
      }
    } catch (error) {
      console.error('Suggestion fetch error', error);
      setRecommendError(error.message || 'Failed to load suggestions');
    } finally {
      setRecommendLoading(false);
    }
  }, [userId, commuteMinutes, vibeKey, topicsLearned, topic]);

  useEffect(() => {
    if (!hasFetchedVibeSuggestions) {
      loadRecommendations('');
    }
  }, [hasFetchedVibeSuggestions, loadRecommendations]);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const previewVideos = recommendations?.previewVideos ?? [];

      const { status, payload } = await buildWizardPlaylist({
        userId,
        topic,
        commuteDurationSec: commuteMinutes * 60,
        vibe: vibeKey,
        previewVideos
      });

      const playlistPayload = payload?.payload ?? payload;

      if (status === 204 || !playlistPayload?.playlist) {
        setSubmitError('We could not build a playlist for that combo. Try another topic or vibe.');
        setStepIndex(2);
        return;
      }

      navigate('/playlist', {
        state: {
          playlist: playlistPayload.playlist,
          context: {
            topic,
            duration: commuteMinutes * 60,
            vibe: playlistPayload.playlistContext?.vibe ?? vibeKey,
            difficulty: playlistPayload.playlistContext?.difficulty ?? effectiveDifficulty,
            masteryScore: playlistPayload.playlistContext?.masteryScore ?? 0
          }
        }
      });
    } catch (error) {
      console.error('Wizard submit error', error);
      setSubmitError(error.message || 'Failed to create playlist. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="wizard-shell">
      <header className="wizard-top-bar">
        <div className="wizard-top-copy">
          <h1>Playlist Wizard</h1>
          <p>Tell us how you&apos;re feeling and we&apos;ll craft the perfect learning ride.</p>
        </div>
        <button type="button" className="home-link" onClick={() => navigate('/home')} aria-label="Go to Home">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 22V12H15V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </header>

      <div className="wizard-page">
        <StepHeader 
          stepIndex={stepIndex} 
          onStepChange={setStepIndex}
          canGoBack={stepIndex > 0 && !submitting}
          canGoForward={stepIndex < 3 && canProceed && !submitting}
        />

        <div className="wizard-content">
          {stepIndex === 0 && (
            <CommuteStep 
              minutes={commuteMinutes} 
              setMinutes={setCommuteMinutes} 
              onNext={handleNext}
            />
          )}

          {stepIndex === 1 && (
            <VibeStep 
              vibeKey={vibeKey} 
              onSelectVibe={handleVibeSelect} 
              onNext={handleNext}
            />
          )}

          {stepIndex === 2 && (
            <TopicStep
              topic={topic}
              recommendations={recommendations}
              recommendLoading={recommendLoading}
              recommendError={recommendError}
              refreshRecommendations={loadRecommendations}
              onNext={handleNext}
              onTopicChange={handleTopicInputChange}
              onSuggestionSelect={handleSuggestionSelect}
              hasDisplayedSuggestions={hasDisplayedSuggestions}
            />
          )}

          {stepIndex === 3 && (
            <SummaryStep
              commuteMinutes={commuteMinutes}
              vibe={vibePreset}
              topic={topic}
              recommendations={recommendations}
              setStepIndex={setStepIndex}
              previewVideos={recommendations?.previewVideos ?? []}
            />
          )}
        </div>

        {submitError && stepIndex === 3 && (
          <div className="error-banner">
            <p>{submitError}</p>
          </div>
        )}
      </div>

      {/* Global navigation at the bottom */}
      <div className="wizard-navigation">
        {stepIndex > 0 && (
          <button 
            type="button" 
            className="btn-back"
            onClick={handleBack}
            disabled={stepIndex === 0 || submitting}
          >
            Back
          </button>
        )}
        
        {stepIndex < 3 ? (
          <button 
            type="button" 
            className="btn-next"
            onClick={handleNext} 
            disabled={!canProceed || submitting}
          >
            {stepIndex === 2 ? 'Review' : 'Next'}
          </button>
        ) : (
          <button
            type="button"
            className="btn-next"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Creating Playlist...' : 'Create Playlist'}
          </button>
        )}
      </div>
    </div>
  );
}

export default CreateCommuteWizard;
