import { useCallback, useContext, useEffect, useRef } from 'react';
import type { AiHintType, ErrorCategory } from '../../../types/telemetry';
import { IdleDetector } from '../../../services/telemetry/idleDetector';
import { TelemetryContext } from '../context/TelemetryContext';

export function useTelemetry() {
  const context = useContext(TelemetryContext);
  if (!context) throw new Error('useTelemetry must be used within a TelemetryProvider');

  const { recordEvent, session, isPracticeMode, showSurvey, recordHintRequest, consumeHintEffectiveness, isResearcherPanelOpen, openResearcher } = context;
  const activeLevelRef = useRef<number | null>(null);
  const idleDetectorRef = useRef<IdleDetector | null>(null);

  useEffect(() => {
    if (isPracticeMode) return;
    const detector = new IdleDetector(45_000, (idleTimeMs) => {
      if (activeLevelRef.current !== null) {
        recordEvent('idle_detected', activeLevelRef.current, { idle_time_ms: idleTimeMs });
      }
    });
    idleDetectorRef.current = detector;
    detector.start();
    return () => detector.stop();
  }, [isPracticeMode, recordEvent]);

  const recordLevelStart = useCallback((levelId: number) => {
    activeLevelRef.current = levelId;
    idleDetectorRef.current?.reset();
    recordEvent('level_started', levelId);
  }, [recordEvent]);

  const recordLevelComplete = useCallback((levelId: number, attemptNumber: number, activeTimeMs: number) => {
    activeLevelRef.current = null;
    recordEvent('level_completed', levelId, { attempt_number: attemptNumber, active_time_ms: activeTimeMs });
  }, [recordEvent]);

  const recordCodeExecution = useCallback((
    levelId: number,
    attemptNumber: number,
    isSuccess: boolean,
    errorCategory?: ErrorCategory,
    errorSnippet?: string,
    codeSnapshot?: string,
  ) => {
    idleDetectorRef.current?.reset();
    const hintEffect = consumeHintEffectiveness(levelId, isSuccess);
    recordEvent(errorCategory === 'SYNTAX_ERROR' ? 'syntax_error' : 'code_run', levelId, {
      attempt_number: attemptNumber,
      is_success: isSuccess,
      ...hintEffect,
      ...(errorCategory ? { error_category: errorCategory } : {}),
      ...(errorSnippet ? { error_message_snippet: errorSnippet } : {}),
      ...(codeSnapshot ? { payload: { code: codeSnapshot } } : {}),
    });
  }, [consumeHintEffectiveness, recordEvent]);

  const recordError = useCallback((levelId: number, errorCategory: ErrorCategory, errorSnippet?: string) => {
    recordEvent(errorCategory === 'SYNTAX_ERROR' ? 'syntax_error' : 'code_run', levelId, {
      is_success: false,
      error_category: errorCategory,
      ...(errorSnippet ? { error_message_snippet: errorSnippet } : {}),
    });
  }, [recordEvent]);

  const recordAiHintRequested = useCallback((levelId: number, hintType: AiHintType) => {
    idleDetectorRef.current?.reset();
    recordHintRequest(levelId, hintType);
  }, [recordHintRequest]);

  const recordIdlePeriod = useCallback((levelId: number, idleTimeMs: number) => {
    recordEvent('idle_detected', levelId, { idle_time_ms: idleTimeMs });
  }, [recordEvent]);

  return {
    session,
    isPracticeMode,
    recordLevelStart,
    recordLevelComplete,
    recordCodeExecution,
    recordError,
    recordAiHintRequested,
    recordIdlePeriod,
    showSurvey,
    isResearcherPanelOpen,
    openResearcher,
  };
}
