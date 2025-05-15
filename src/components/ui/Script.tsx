
import React, { useEffect, useState } from 'react';

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
    // Check if script is already loaded
    if (window.scriptRegistry?.has(src)) {
      console.log(`Script ${src} is already loaded.`);
      setLoaded(true);
      onLoad?.();
      return;
    }

    // Initialize script registry if it doesn't exist
    if (!window.scriptRegistry) {
      window.scriptRegistry = new Map();
    }
    
    // Mark this script as loading
    window.scriptRegistry.set(src, 'loading');
    
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    
    const handleLoad = () => {
      console.log(`Script ${src} loaded successfully`);
      setLoaded(true);
      window.scriptRegistry?.set(src, 'loaded');
      onLoad?.();
    };

    const handleError = (e: Event | string) => {
      const errorInstance = e instanceof Error ? e : new Error(`Failed to load script: ${src}`);
      console.error(`Error loading script ${src}:`, errorInstance);
      setError(errorInstance);
      window.scriptRegistry?.delete(src); // Remove from registry on error
      onError?.(errorInstance);
    };

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError as EventListener);

    document.body.appendChild(script);

    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError as EventListener);
      
      // Don't remove the script from DOM on unmount as it might be used by other components
      // But we can clean up our event listeners
    };
  }, [src, onLoad, onError]);

  return null;
};

export default Script;
