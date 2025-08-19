// User Behavior Tracking Components
// Comprehensive tracking of user interactions and engagement patterns

import React, { useEffect, useRef } from 'react';
import { useAnalytics } from '../../services/analyticsService';

// Heat map tracking for click and hover patterns
// interface HeatMapData {
//   x: number;
//   y: number;
//   intensity: number;
//   timestamp: Date;
//   elementSelector: string;
//   elementText?: string;
// }

interface ScrollTrackingData {
  maxScrollDepth: number;
  scrollEvents: Array<{
    depth: number;
    timestamp: Date;
    direction: 'up' | 'down';
  }>;
  timeOnPage: number;
  engagementScore: number;
}

// Props for behavior tracking components
interface BehaviorTrackerProps {
  trackClicks?: boolean;
  trackHovers?: boolean;
  trackScroll?: boolean;
  trackFormInteractions?: boolean;
  trackKeyboard?: boolean;
  trackMouse?: boolean;
  sampleRate?: number; // 0-1, for performance optimization
  children: React.ReactNode;
}

interface ClickTrackerProps {
  elementId?: string;
  category?: string;
  trackDoubleClick?: boolean;
  trackRightClick?: boolean;
  children: React.ReactNode;
}

interface FormTrackerProps {
  formId: string;
  trackFieldFocus?: boolean;
  trackFieldBlur?: boolean;
  trackFieldChanges?: boolean;
  trackValidationErrors?: boolean;
  trackSubmissionAttempts?: boolean;
  children: React.ReactNode;
}

interface ScrollTrackerProps {
  elementId?: string;
  trackScrollDepth?: boolean;
  trackScrollSpeed?: boolean;
  trackScrollDirection?: boolean;
  depthThresholds?: number[]; // [25, 50, 75, 100] percentages
  children: React.ReactNode;
}

// Main behavior tracker wrapper component
export const BehaviorTracker: React.FC<BehaviorTrackerProps> = ({
  trackClicks = true,
  trackHovers = true,
  sampleRate = 1.0,
  children
}) => {
  const analytics = useAnalytics();
  const containerRef = useRef<HTMLDivElement>(null);
  // const [heatMapData, setHeatMapData] = useState<HeatMapData[]>([]);
  // const mouseTrackingRef = useRef<{ x: number; y: number; timestamp: Date }[]>([]); // Disabled for now

  // Sampling check - only track for a percentage of users
  const shouldTrack = useRef(Math.random() < sampleRate);

  useEffect(() => {
    if (!shouldTrack.current) return;

    const container = containerRef.current;
    if (!container) return;

    const handlers: Array<{ element: Element | Document | Window; event: string; handler: EventListener }> = [];

    // Click tracking
    if (trackClicks) {
      const clickHandler = (event: Event) => {
        const mouseEvent = event as MouseEvent;
        const target = mouseEvent.target as HTMLElement;
        
        analytics.trackEvent('user_click', {
          x: mouseEvent.clientX,
          y: mouseEvent.clientY,
          element: target.tagName,
          elementId: target.id,
          elementClass: target.className,
          elementText: target.textContent?.slice(0, 100),
          selector: generateSelector(target),
          timestamp: new Date(),
          button: mouseEvent.button // 0: left, 1: middle, 2: right
        });

        // Update heat map data
        // setHeatMapData(prev => [
        //   ...prev.slice(-500), // Keep last 500 clicks
        //   {
        //     x: mouseEvent.clientX,
        //     y: mouseEvent.clientY,
        //     intensity: 1,
        //     timestamp: new Date(),
        //     elementSelector: generateSelector(target),
        //     elementText: target.textContent?.slice(0, 50)
        //   }
        // ]);
      };
      
      container.addEventListener('click', clickHandler, { passive: true });
      handlers.push({ element: container, event: 'click', handler: clickHandler });
    }

    // Hover tracking
    if (trackHovers) {
      let hoverStartTime: number;
      let currentTarget: HTMLElement | null = null;

      const mouseEnterHandler = (event: Event) => {
        const target = event.target as HTMLElement;
        currentTarget = target;
        hoverStartTime = Date.now();
      };

      const mouseLeaveHandler = (_event: Event) => {
        if (currentTarget && hoverStartTime) {
          const hoverDuration = Date.now() - hoverStartTime;
          if (hoverDuration > 100) { // Only track hovers longer than 100ms
            analytics.trackEvent('user_hover', {
              element: currentTarget.tagName,
              elementId: currentTarget.id,
              elementClass: currentTarget.className,
              selector: generateSelector(currentTarget),
              duration: hoverDuration
            });
          }
        }
        currentTarget = null;
      };

      container.addEventListener('mouseenter', mouseEnterHandler, { passive: true });
      container.addEventListener('mouseleave', mouseLeaveHandler, { passive: true });
      handlers.push(
        { element: container, event: 'mouseenter', handler: mouseEnterHandler },
        { element: container, event: 'mouseleave', handler: mouseLeaveHandler }
      );
    }

    // Mouse movement tracking (disabled for now)
    // Uncomment the following to enable mouse movement tracking:
    /*
    let lastMouseTrack = 0;
    const mouseMoveHandler = (event: Event) => {
      const mouseEvent = event as MouseEvent;
      const now = Date.now();
      
      // Sample mouse movements (every 100ms max)
      if (now - lastMouseTrack > 100) {
        mouseTrackingRef.current.push({
          x: mouseEvent.clientX,
          y: mouseEvent.clientY,
          timestamp: new Date()
        });
        
        // Keep only recent movements to prevent memory leaks
        if (mouseTrackingRef.current.length > 1000) {
          mouseTrackingRef.current = mouseTrackingRef.current.slice(-500);
        }
        
        lastMouseTrack = now;
      }
    };

    container.addEventListener('mousemove', mouseMoveHandler, { passive: true });
    handlers.push({ element: container, event: 'mousemove', handler: mouseMoveHandler });
    */

    // Keyboard tracking (disabled for now)
    // Uncomment the following to enable keyboard tracking:
    /*
    const keyHandler = (event: Event) => {
      const keyEvent = event as KeyboardEvent;
      
      // Don't track sensitive keys or inputs
      const target = keyEvent.target as HTMLElement;
      const isPasswordField = target.getAttribute('type') === 'password';
      const isSensitiveInput = target.tagName === 'INPUT' && 
        ['password', 'credit-card-number', 'cc-number'].includes(target.getAttribute('autocomplete') || '');
      
      if (!isPasswordField && !isSensitiveInput) {
        analytics.trackEvent('keyboard_interaction', {
          key: keyEvent.code,
          ctrlKey: keyEvent.ctrlKey,
          altKey: keyEvent.altKey,
          shiftKey: keyEvent.shiftKey,
          metaKey: keyEvent.metaKey,
          target: target.tagName,
          targetId: target.id
        });
      }
    };

    document.addEventListener('keydown', keyHandler, { passive: true });
    handlers.push({ element: document, event: 'keydown', handler: keyHandler });
    */

    // Cleanup
    return () => {
      handlers.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
    };
  }, [trackClicks, trackHovers, analytics]);

  // Periodically flush mouse movement data
  // useEffect(() => {
  //   // if (!trackMouse || !shouldTrack.current) return;
  //   return; // Temporarily disabled

  //   const flushInterval = setInterval(() => {
  //     if (mouseTrackingRef.current.length > 0) {
  //       analytics.trackEvent('mouse_movement_batch', {
  //         movements: mouseTrackingRef.current.slice(),
  //         startTime: mouseTrackingRef.current[0]?.timestamp,
  //         endTime: mouseTrackingRef.current[mouseTrackingRef.current.length - 1]?.timestamp,
  //         count: mouseTrackingRef.current.length
  //       });
  //       mouseTrackingRef.current = [];
  //     }
  //   }, 30000); // Flush every 30 seconds

  //   return () => clearInterval(flushInterval);
  // }, [analytics]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {children}
    </div>
  );
};

// Specific click tracking component
export const ClickTracker: React.FC<ClickTrackerProps> = ({
  elementId,
  category = 'general',
  trackDoubleClick = false,
  trackRightClick = false,
  children
}) => {
  const analytics = useAnalytics();
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handlers: Array<{ event: string; handler: EventListener }> = [];

    // Single click
    const clickHandler = (event: Event) => {
      const mouseEvent = event as MouseEvent;
      analytics.trackEvent('element_click', {
        elementId: elementId || element.id,
        category,
        x: mouseEvent.clientX,
        y: mouseEvent.clientY,
        button: mouseEvent.button,
        timestamp: new Date()
      });

      analytics.trackFeatureUsage('click_tracking', 'click', {
        elementId: elementId || element.id,
        category
      });
    };

    element.addEventListener('click', clickHandler, { passive: true });
    handlers.push({ event: 'click', handler: clickHandler });

    // Double click
    if (trackDoubleClick) {
      const doubleClickHandler = (event: Event) => {
        const mouseEvent = event as MouseEvent;
        analytics.trackEvent('element_double_click', {
          elementId: elementId || element.id,
          category,
          x: mouseEvent.clientX,
          y: mouseEvent.clientY
        });
      };

      element.addEventListener('dblclick', doubleClickHandler, { passive: true });
      handlers.push({ event: 'dblclick', handler: doubleClickHandler });
    }

    // Right click
    if (trackRightClick) {
      const contextMenuHandler = (event: Event) => {
        const mouseEvent = event as MouseEvent;
        analytics.trackEvent('element_right_click', {
          elementId: elementId || element.id,
          category,
          x: mouseEvent.clientX,
          y: mouseEvent.clientY
        });
      };

      element.addEventListener('contextmenu', contextMenuHandler, { passive: true });
      handlers.push({ event: 'contextmenu', handler: contextMenuHandler });
    }

    return () => {
      handlers.forEach(({ event, handler }) => {
        element.removeEventListener(event, handler);
      });
    };
  }, [elementId, category, trackDoubleClick, trackRightClick, analytics]);

  return <div ref={elementRef}>{children}</div>;
};

// Form interaction tracking
export const FormTracker: React.FC<FormTrackerProps> = ({
  formId,
  trackFieldFocus = true,
  trackFieldBlur = true,
  trackFieldChanges = true,
  trackValidationErrors = true,
  trackSubmissionAttempts = true,
  children
}) => {
  const analytics = useAnalytics();
  const formRef = useRef<HTMLDivElement>(null);
  const fieldInteractions = useRef<Map<string, {
    focusTime?: Date;
    changeCount: number;
    errors: string[];
  }>>(new Map());

  useEffect(() => {
    const container = formRef.current;
    if (!container) return;

    const handlers: Array<{ element: Element; event: string; handler: EventListener }> = [];

    // Focus tracking
    if (trackFieldFocus) {
      const focusHandler = (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (isFormField(target)) {
          const fieldName = getFieldName(target);
          
          const interaction = fieldInteractions.current.get(fieldName) || {
            changeCount: 0,
            errors: []
          };
          interaction.focusTime = new Date();
          fieldInteractions.current.set(fieldName, interaction);

          analytics.trackEvent('form_field_focus', {
            formId,
            fieldName,
            fieldType: target.type,
            fieldValue: target.value ? 'has_value' : 'empty'
          });
        }
      };

      container.addEventListener('focusin', focusHandler, { passive: true });
      handlers.push({ element: container, event: 'focusin', handler: focusHandler });
    }

    // Blur tracking
    if (trackFieldBlur) {
      const blurHandler = (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (isFormField(target)) {
          const fieldName = getFieldName(target);
          const interaction = fieldInteractions.current.get(fieldName);
          
          if (interaction?.focusTime) {
            const focusDuration = Date.now() - interaction.focusTime.getTime();
            
            analytics.trackEvent('form_field_blur', {
              formId,
              fieldName,
              fieldType: target.type,
              focusDuration,
              hasValue: !!target.value,
              changeCount: interaction.changeCount
            });
          }
        }
      };

      container.addEventListener('focusout', blurHandler, { passive: true });
      handlers.push({ element: container, event: 'focusout', handler: blurHandler });
    }

    // Change tracking
    if (trackFieldChanges) {
      const changeHandler = (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (isFormField(target)) {
          const fieldName = getFieldName(target);
          const interaction = fieldInteractions.current.get(fieldName) || {
            changeCount: 0,
            errors: []
          };
          
          interaction.changeCount++;
          fieldInteractions.current.set(fieldName, interaction);

          analytics.trackEvent('form_field_change', {
            formId,
            fieldName,
            fieldType: target.type,
            changeCount: interaction.changeCount,
            hasValue: !!target.value
          });
        }
      };

      container.addEventListener('input', changeHandler, { passive: true });
      container.addEventListener('change', changeHandler, { passive: true });
      handlers.push(
        { element: container, event: 'input', handler: changeHandler },
        { element: container, event: 'change', handler: changeHandler }
      );
    }

    // Form submission tracking
    if (trackSubmissionAttempts) {
      const submitHandler = (event: Event) => {
        const form = (event.target as HTMLElement).closest('form');
        if (form) {
          const formData = new FormData(form);
          const fieldCount = Array.from(formData.keys()).length;
          const filledFields = Array.from(formData.values()).filter(value => 
            typeof value === 'string' ? value.trim() : value
          ).length;

          analytics.trackEvent('form_submission_attempt', {
            formId,
            fieldCount,
            filledFields,
            completionRate: fieldCount > 0 ? filledFields / fieldCount : 0,
            interactions: Array.from(fieldInteractions.current.entries()).map(([field, data]) => ({
              field,
              changeCount: data.changeCount,
              errorCount: data.errors.length
            }))
          });
        }
      };

      container.addEventListener('submit', submitHandler, { passive: true });
      handlers.push({ element: container, event: 'submit', handler: submitHandler });
    }

    // Validation error tracking
    if (trackValidationErrors) {
      const errorHandler = (event: Event) => {
        const target = event.target as HTMLInputElement;
        if (isFormField(target) && !target.validity.valid) {
          const fieldName = getFieldName(target);
          const interaction = fieldInteractions.current.get(fieldName) || {
            changeCount: 0,
            errors: []
          };
          
          const errorType = getValidationErrorType(target.validity);
          interaction.errors.push(errorType);
          fieldInteractions.current.set(fieldName, interaction);

          analytics.trackEvent('form_validation_error', {
            formId,
            fieldName,
            fieldType: target.type,
            errorType,
            errorMessage: target.validationMessage
          });
        }
      };

      container.addEventListener('invalid', errorHandler, { passive: true });
      handlers.push({ element: container, event: 'invalid', handler: errorHandler });
    }

    return () => {
      handlers.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
    };
  }, [formId, trackFieldFocus, trackFieldBlur, trackFieldChanges, trackValidationErrors, trackSubmissionAttempts, analytics]);

  return <div ref={formRef}>{children}</div>;
};

// Scroll behavior tracking
export const ScrollTracker: React.FC<ScrollTrackerProps> = ({
  elementId,
  trackScrollDepth = true,
  trackScrollSpeed = true,
  trackScrollDirection = true,
  depthThresholds = [25, 50, 75, 100],
  children
}) => {
  const analytics = useAnalytics();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollData = useRef<ScrollTrackingData>({
    maxScrollDepth: 0,
    scrollEvents: [],
    timeOnPage: Date.now(),
    engagementScore: 0
  });
  const lastScrollTime = useRef(0);
  const lastScrollY = useRef(0);
  const reachedThresholds = useRef<Set<number>>(new Set());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId: number;

    const scrollHandler = () => {
      rafId = requestAnimationFrame(() => {
        const now = Date.now();
        const scrollY = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        
        const scrollDepth = (scrollY / (scrollHeight - clientHeight)) * 100;
        const scrollSpeed = Math.abs(scrollY - lastScrollY.current) / Math.max(1, now - lastScrollTime.current);
        const scrollDirection = scrollY > lastScrollY.current ? 'down' : 'up';

        // Update scroll data
        scrollData.current.maxScrollDepth = Math.max(scrollData.current.maxScrollDepth, scrollDepth);
        
        if (trackScrollDirection || trackScrollSpeed) {
          scrollData.current.scrollEvents.push({
            depth: scrollDepth,
            timestamp: new Date(),
            direction: scrollDirection
          });
          
          // Keep only recent scroll events to prevent memory issues
          if (scrollData.current.scrollEvents.length > 100) {
            scrollData.current.scrollEvents = scrollData.current.scrollEvents.slice(-50);
          }
        }

        // Track depth milestones
        if (trackScrollDepth) {
          depthThresholds.forEach(threshold => {
            if (scrollDepth >= threshold && !reachedThresholds.current.has(threshold)) {
              reachedThresholds.current.add(threshold);
              
              analytics.trackEvent('scroll_depth_milestone', {
                elementId: elementId || 'page',
                threshold,
                timeToReach: now - scrollData.current.timeOnPage,
                scrollSpeed: scrollSpeed
              });
              
              analytics.trackMetric('scroll.depth_milestone', threshold, 'percent', {
                elementId: elementId || 'page'
              });
            }
          });
        }

        // Track scroll speed
        if (trackScrollSpeed && scrollSpeed > 0) {
          analytics.trackMetric('scroll.speed', scrollSpeed, 'px/ms', {
            direction: scrollDirection,
            depth: scrollDepth.toFixed(1)
          });
        }

        lastScrollTime.current = now;
        lastScrollY.current = scrollY;
      });
    };

    container.addEventListener('scroll', scrollHandler, { passive: true });

    return () => {
      container.removeEventListener('scroll', scrollHandler);
      if (rafId) cancelAnimationFrame(rafId);
      
      // Send final scroll summary
      const timeOnPage = Date.now() - scrollData.current.timeOnPage;
      const engagementScore = calculateEngagementScore(scrollData.current, timeOnPage);
      
      analytics.trackEvent('scroll_session_summary', {
        elementId: elementId || 'page',
        maxScrollDepth: scrollData.current.maxScrollDepth,
        timeOnPage,
        engagementScore,
        scrollEventCount: scrollData.current.scrollEvents.length,
        thresholdsReached: Array.from(reachedThresholds.current)
      });
    };
  }, [elementId, trackScrollDepth, trackScrollSpeed, trackScrollDirection, depthThresholds, analytics]);

  return <div ref={containerRef} style={{ overflowY: 'auto', height: '100%' }}>{children}</div>;
};

// Utility functions
function generateSelector(element: HTMLElement): string {
  if (element.id) return `#${element.id}`;
  if (element.className) return `.${element.className.split(' ').join('.')}`;
  return element.tagName.toLowerCase();
}

function isFormField(element: HTMLElement): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return element instanceof HTMLInputElement || 
         element instanceof HTMLTextAreaElement || 
         element instanceof HTMLSelectElement;
}

function getFieldName(element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  return element.name || element.id || 
    ('placeholder' in element ? element.placeholder : '') || 'unnamed_field';
}

function getValidationErrorType(validity: ValidityState): string {
  if (validity.valueMissing) return 'required';
  if (validity.typeMismatch) return 'type_mismatch';
  if (validity.patternMismatch) return 'pattern_mismatch';
  if (validity.tooLong) return 'too_long';
  if (validity.tooShort) return 'too_short';
  if (validity.rangeUnderflow) return 'range_underflow';
  if (validity.rangeOverflow) return 'range_overflow';
  if (validity.stepMismatch) return 'step_mismatch';
  if (validity.badInput) return 'bad_input';
  return 'unknown';
}

function calculateEngagementScore(data: ScrollTrackingData, timeOnPage: number): number {
  let score = 0;
  
  // Scroll depth contributes to engagement
  score += Math.min(data.maxScrollDepth / 100, 1) * 40;
  
  // Time on page (logarithmic scale)
  const timeScore = Math.log(Math.max(timeOnPage / 1000, 1)) * 10;
  score += Math.min(timeScore, 30);
  
  // Scroll activity
  const scrollActivity = Math.min(data.scrollEvents.length / 20, 1) * 30;
  score += scrollActivity;
  
  return Math.round(score);
}

export default BehaviorTracker;