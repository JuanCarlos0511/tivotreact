import { useContext, useEffect, useRef } from 'react';
import { TelemetryContext } from '../context/TelemetryContext';
import type { ErrorCategory, AiHintType } from '../../../types/telemetry';
import { IdleDetector } from '../../../services/telemetry/idleDetector';

export function useTelemetry() {
  const context = useContext(TelemetryContext);
  
  if (!context) {
    throw new Error('useTelemetry must be used within a TelemetryProvider');
  }

  const { recordEvent, session, isPracticeMode, showSurvey, evaluateHintEffectiveness, recordHintRequest, isResearcherPanelOpen, openResearcher } = context;

  // Set up idle detector for active level tracking
  const activeLevelRef = useRef<number | null>(null);
  const idleDetectorRef = useRef<IdleDetector | null>(null);

  useEffect(() => {
    if (!isPracticeMode) {
      idleDetectorRef.current = new IdleDetector(45000, (idleTimeMs) => {
        if (activeLevelRef.current !== null) {
          recordEvent('IDLE_PERIOD_DETECTED', activeLevelRef.current, { idle_time_ms: idleTimeMs });
        }
      });
      idleDetectorRef.current.start();
    }

    return () => {
      if (idleDetectorRef.current) {
        idleDetectorRef.current.stop();
      }
    };
  }, [isPracticeMode, recordEvent]);

  return {
    session,
    isPracticeMode,
    
    recordLevelStart: (levelId: number) => {
      activeLevelRef.current = levelId;
      if (idleDetectorRef.current) idleDetectorRef.current.reset();
      recordEvent('LEVEL_START', levelId);
    },
    
    recordLevelComplete: (levelId: number, attemptNumber: number, activeTimeMs: number) => {
      activeLevelRef.current = null;
      recordEvent('LEVEL_COMPLETE', levelId, { attempt_number: attemptNumber, active_time_ms: activeTimeMs });
    },
    
    recordCodeExecution: (levelId: number, attemptNumber: number, isSuccess: boolean, errorCategory?: ErrorCategory, errorSnippet?: string) => {
      if (idleDetectorRef.current) idleDetectorRef.current.reset();
      recordEvent('CODE_EXECUTION_ATTEMPT', levelId, {
        attempt_number: attemptNumber,
        is_success: isSuccess,
        ...(errorCategory !== undefined ? { error_category: errorCategory } : {}),
        ...(errorSnippet !== undefined ? { error_message_snippet: errorSnippet } : {}),
      });
    },
    
    recordError: (levelId: number, errorCategory: ErrorCategory, errorSnippet?: string) => {
      recordEvent('ERROR_ENCOUNTERED', levelId, {
        error_category: errorCategory,
        ...(errorSnippet !== undefined ? { error_message_snippet: errorSnippet } : {}),
      });
    },
    
    recordAiHintRequested: (levelId: number, hintType: AiHintType) => {
      if (idleDetectorRef.current) idleDetectorRef.current.reset();
      recordHintRequest(levelId, hintType);
    },
    
    recordIdlePeriod: (levelId: number, idleTimeMs: number) => {
      recordEvent('IDLE_PERIOD_DETECTED', levelId, { idle_time_ms: idleTimeMs });
    },
    
    showSurvey,
    evaluateHintEffectiveness,
    isResearcherPanelOpen,
    openResearcher
  };
}
