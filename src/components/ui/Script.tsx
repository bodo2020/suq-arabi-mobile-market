
import React, { useEffect, useState } from 'react';

interface ScriptProps {
  src: string;
  async?: boolean;
  defer?: boolean;
  onLoad?: () => void;
}

const Script: React.FC<ScriptProps> = ({ src, async = true, defer = true, onLoad }) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Create a global script loading registry to avoid duplicates
    if (!window.scriptRegistry) {
      window.scriptRegistry = new Map();
    }

    // Check if script is already loaded or loading
    if (window.scriptRegistry.has(src)) {
      // If script is already loaded, call onLoad
      if (window.scriptRegistry.get(src) === 'loaded') {
        setLoaded(true);
        if (onLoad) onLoad();
      } else {
        // Script is loading, add a listener for when it's done
        const eventName = `script-loaded-${src}`;
        const handleScriptLoad = () => {
          setLoaded(true);
          if (onLoad) onLoad();
        };
        
        window.addEventListener(eventName, handleScriptLoad);
        
        // Return cleanup function to remove listener
        return () => {
          window.removeEventListener(eventName, handleScriptLoad);
        };
      }
      return;
    }

    // Mark script as loading
    window.scriptRegistry.set(src, 'loading');

    // Create script element
    const script = document.createElement('script');
    script.src = src;
    script.async = async;
    script.defer = defer;
    
    // Event listener for when script loads
    const handleLoad = () => {
      setLoaded(true);
      window.scriptRegistry.set(src, 'loaded');
      
      // Dispatch event to notify other instances
      const loadEvent = new CustomEvent(`script-loaded-${src}`);
      window.dispatchEvent(loadEvent);
      
      if (onLoad) onLoad();
    };
    
    script.addEventListener('load', handleLoad);
    
    // Append script to document head
    document.head.appendChild(script);
    
    // Cleanup function
    return () => {
      // Don't remove the script on component unmount as other components may need it
      // But we should clean up our event listener
      script.removeEventListener('load', handleLoad);
    };
  }, [src, async, defer, onLoad]);

  return null; // This component doesn't render anything
};

// Add script registry to window type
declare global {
  interface Window {
    scriptRegistry?: Map<string, string>;
  }
}

export default Script;
