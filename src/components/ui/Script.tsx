
import React, { useEffect, useState, useRef } from 'react';

// Extend Window interface to include our scriptRegistry property
declare global {
  interface Window {
    scriptRegistry?: Map<string, string>;
  }
}

interface ScriptProps {
  src: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * A component to safely load external scripts
 */
const Script: React.FC<ScriptProps> = ({ src, onLoad, onError }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);
  const scriptIdRef = useRef(`script-${src.replace(/[^\w]/g, '_')}-${Math.random().toString(36).substring(2, 9)}`);
  const scriptLoadEventName = useRef(`scriptLoaded_${src.replace(/[^\w]/g, '_')}`);
  const cleanupFunctionsRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    // Set flag for component mounted state
    isMountedRef.current = true;
    
    // Skip if src is empty or invalid
    if (!src) {
      console.error("Invalid script source provided");
      return;
    }

    // Create script registry if it doesn't exist to track loaded scripts
    if (!window.scriptRegistry) {
      window.scriptRegistry = new Map();
    }
    
    const scriptId = scriptIdRef.current;
    
    // Check if script is already loaded
    if (window.scriptRegistry.has(src)) {
      const status = window.scriptRegistry.get(src);
      
      if (status === 'loaded') {
        console.log(`Script ${src} is already loaded.`);
        if (isMountedRef.current) {
          setLoaded(true);
          onLoad?.();
        }
        return;
      } else if (status === 'loading') {
        console.log(`Script ${src} is already being loaded.`);
        // Add event listener to document for this specific script load
        const handleExistingScriptLoad = () => {
          if (isMountedRef.current) {
            setLoaded(true);
            onLoad?.();
          }
        };
        
        document.addEventListener(scriptLoadEventName.current, handleExistingScriptLoad);
        cleanupFunctionsRef.current.push(() => {
          document.removeEventListener(scriptLoadEventName.current, handleExistingScriptLoad);
        });
        
        return;
      }
    }
    
    // Mark this script as loading
    window.scriptRegistry.set(src, 'loading');
    
    // Check for existing script element by ID first 
    let existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
    
    // If not found by ID, try by src (fallback)
    if (!existingScript) {
      existingScript = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement | null;
    }
    
    if (existingScript) {
      // Script tag exists but might still be loading
      
      if (existingScript.hasAttribute('data-loaded')) {
        // Script is already fully loaded
        window.scriptRegistry.set(src, 'loaded');
        if (isMountedRef.current) {
          setLoaded(true);
          onLoad?.();
        }
        return;
      }
      
      // Script exists but still loading, add event listeners
      const handleLoad = () => {
        if (!isMountedRef.current) return;
        
        existingScript?.setAttribute('data-loaded', 'true');
        window.scriptRegistry.set(src, 'loaded');
        setLoaded(true);
        onLoad?.();
        
        // Dispatch custom event to notify other instances
        document.dispatchEvent(new CustomEvent(scriptLoadEventName.current));
      };

      const handleError = (e: Event | string) => {
        if (!isMountedRef.current) return;
        
        const errorInstance = e instanceof Error ? e : new Error(`Failed to load script: ${src}`);
        setError(errorInstance);
        window.scriptRegistry.delete(src);
        onError?.(errorInstance);
      };
      
      existingScript.addEventListener('load', handleLoad);
      existingScript.addEventListener('error', handleError as EventListener);
      
      cleanupFunctionsRef.current.push(() => {
        existingScript?.removeEventListener('load', handleLoad);
        existingScript?.removeEventListener('error', handleError as EventListener);
      });
      
      return;
    }
    
    // Create and add new script element
    try {
      const script = document.createElement('script');
      script.src = src;
      script.id = scriptId; // Add an ID to identify this script
      script.async = true;
      
      const handleLoad = () => {
        if (!isMountedRef.current) return;
        
        console.log(`Script ${src} loaded successfully`);
        script.setAttribute('data-loaded', 'true');
        window.scriptRegistry.set(src, 'loaded');
        setLoaded(true);
        onLoad?.();
        
        // Dispatch custom event to notify other instances
        document.dispatchEvent(new CustomEvent(scriptLoadEventName.current));
      };

      const handleError = (e: Event | string) => {
        if (!isMountedRef.current) return;
        
        const errorInstance = e instanceof Error ? e : new Error(`Failed to load script: ${src}`);
        console.error(`Error loading script ${src}:`, errorInstance);
        setError(errorInstance);
        window.scriptRegistry.delete(src);
        onError?.(errorInstance);
      };

      script.addEventListener('load', handleLoad);
      script.addEventListener('error', handleError as EventListener);

      // Append to head for better performance
      document.head.appendChild(script);

      cleanupFunctionsRef.current.push(() => {
        script.removeEventListener('load', handleLoad);
        script.removeEventListener('error', handleError as EventListener);
      });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(`Error creating script: ${src}`);
      console.error(err);
      if (isMountedRef.current) {
        setError(err);
        onError?.(err);
      }
    }
    
    // Cleanup function
    return () => {
      isMountedRef.current = false;
      
      // Execute all cleanup functions
      cleanupFunctionsRef.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (e) {
          console.error("Cleanup error:", e);
        }
      });
      cleanupFunctionsRef.current = [];
      
      // NOTE: We don't remove the script tag from DOM on unmount
      // as it might be used by other components
    };
  }, [src, onLoad, onError]);

  return null;
};

export default Script;
