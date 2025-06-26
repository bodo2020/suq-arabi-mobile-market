
import React, { useEffect, useState, useRef } from 'react';

interface ScriptProps {
  src: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

const Script: React.FC<ScriptProps> = ({ src, onLoad, onError }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (!src) {
      console.error("Invalid script source provided");
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      console.log('Google Maps already loaded');
      if (isMountedRef.current) {
        setLoaded(true);
        onLoad?.();
      }
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector(`script[src*="${src}"]`) as HTMLScriptElement | null;
    
    if (existingScript) {
      if (existingScript.hasAttribute('data-loaded')) {
        if (isMountedRef.current) {
          setLoaded(true);
          onLoad?.();
        }
        return;
      }
      
      const handleLoad = () => {
        if (!isMountedRef.current) return;
        existingScript.setAttribute('data-loaded', 'true');
        setLoaded(true);
        onLoad?.();
      };

      const handleError = (e: Event) => {
        if (!isMountedRef.current) return;
        const errorInstance = new Error(`Failed to load script: ${src}`);
        setError(errorInstance);
        onError?.(errorInstance);
      };
      
      existingScript.addEventListener('load', handleLoad);
      existingScript.addEventListener('error', handleError);
      
      return () => {
        existingScript.removeEventListener('load', handleLoad);
        existingScript.removeEventListener('error', handleError);
      };
    }
    
    // Create new script element
    try {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;
      
      const handleLoad = () => {
        if (!isMountedRef.current) return;
        console.log(`Script ${src} loaded successfully`);
        script.setAttribute('data-loaded', 'true');
        setLoaded(true);
        onLoad?.();
      };

      const handleError = () => {
        if (!isMountedRef.current) return;
        const errorInstance = new Error(`Failed to load script: ${src}`);
        console.error(`Error loading script ${src}:`, errorInstance);
        setError(errorInstance);
        onError?.(errorInstance);
      };

      script.addEventListener('load', handleLoad);
      script.addEventListener('error', handleError);

      document.head.appendChild(script);

      return () => {
        isMountedRef.current = false;
        script.removeEventListener('load', handleLoad);
        script.removeEventListener('error', handleError);
      };
    } catch (e) {
      const err = e instanceof Error ? e : new Error(`Error creating script: ${src}`);
      console.error(err);
      if (isMountedRef.current) {
        setError(err);
        onError?.(err);
      }
    }
  }, [src, onLoad, onError]);

  return null;
};

export default Script;
