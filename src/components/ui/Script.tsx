
import React, { useEffect, useState } from 'react';

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

  useEffect(() => {
    // Skip if src is empty or invalid
    if (!src) {
      console.error("Invalid script source provided");
      return;
    }

    // Create script registry if it doesn't exist to track loaded scripts
    if (!window.scriptRegistry) {
      window.scriptRegistry = new Map();
    }
    
    // Check if script is already loaded
    if (window.scriptRegistry.has(src)) {
      const status = window.scriptRegistry.get(src);
      
      if (status === 'loaded') {
        console.log(`Script ${src} is already loaded.`);
        setLoaded(true);
        onLoad?.();
        return;
      } else if (status === 'loading') {
        console.log(`Script ${src} is already being loaded.`);
        // Add event listener to document for this specific script load
        const handleExistingScriptLoad = (e: Event) => {
          if (e instanceof CustomEvent && e.detail === src) {
            setLoaded(true);
            onLoad?.();
            document.removeEventListener('scriptLoaded', handleExistingScriptLoad);
          }
        };
        
        document.addEventListener('scriptLoaded', handleExistingScriptLoad);
        return () => {
          document.removeEventListener('scriptLoaded', handleExistingScriptLoad);
        };
      }
    }
    
    // Mark this script as loading
    window.scriptRegistry.set(src, 'loading');
    
    // Find if script already exists in DOM
    const existingScript = document.querySelector(`script[src="${src}"]`) as HTMLScriptElement;
    
    if (existingScript) {
      // Script tag exists but might still be loading
      if (existingScript.hasAttribute('data-loaded')) {
        // Script is already fully loaded
        window.scriptRegistry.set(src, 'loaded');
        setLoaded(true);
        onLoad?.();
        return;
      }
      
      // Script exists but still loading, add event listeners
      const handleLoad = () => {
        existingScript.setAttribute('data-loaded', 'true');
        window.scriptRegistry.set(src, 'loaded');
        setLoaded(true);
        onLoad?.();
        
        // Dispatch custom event to notify other instances
        document.dispatchEvent(new CustomEvent('scriptLoaded', { detail: src }));
      };

      const handleError = (e: Event | string) => {
        const errorInstance = e instanceof Error ? e : new Error(`Failed to load script: ${src}`);
        setError(errorInstance);
        window.scriptRegistry.delete(src);
        onError?.(errorInstance);
      };
      
      existingScript.addEventListener('load', handleLoad);
      existingScript.addEventListener('error', handleError as EventListener);
      
      return () => {
        existingScript.removeEventListener('load', handleLoad);
        existingScript.removeEventListener('error', handleError as EventListener);
      };
    }
    
    // Create and add new script element
    try {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      
      const handleLoad = () => {
        console.log(`Script ${src} loaded successfully`);
        script.setAttribute('data-loaded', 'true');
        window.scriptRegistry.set(src, 'loaded');
        setLoaded(true);
        onLoad?.();
        
        // Dispatch custom event to notify other instances
        document.dispatchEvent(new CustomEvent('scriptLoaded', { detail: src }));
      };

      const handleError = (e: Event | string) => {
        const errorInstance = e instanceof Error ? e : new Error(`Failed to load script: ${src}`);
        console.error(`Error loading script ${src}:`, errorInstance);
        setError(errorInstance);
        window.scriptRegistry.delete(src);
        onError?.(errorInstance);
      };

      script.addEventListener('load', handleLoad);
      script.addEventListener('error', handleError as EventListener);

      // Append to head instead of body for better performance and to avoid DOM issues
      document.head.appendChild(script);

      return () => {
        script.removeEventListener('load', handleLoad);
        script.removeEventListener('error', handleError as EventListener);
        // Don't remove the script from DOM on unmount as it might be used by other components
      };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(`Error creating script: ${src}`);
      console.error(err);
      setError(err);
      onError?.(err);
      return;
    }
  }, [src, onLoad, onError]);

  return null;
};

export default Script;
