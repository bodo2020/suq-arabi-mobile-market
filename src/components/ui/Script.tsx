import React, { useEffect } from 'react';

interface ScriptProps {
  src: string;
  async?: boolean;
  defer?: boolean;
  onLoad?: () => void;
}

// Global script registry
if (typeof window !== 'undefined') {
  window.scriptRegistry = window.scriptRegistry || new Map<string, string>();
}

const Script: React.FC<ScriptProps> = ({ src, async = true, defer = true, onLoad }) => {
  useEffect(() => {
    // Function to handle script loaded event
    const handleScriptLoad = () => {
      if (onLoad) onLoad();
    };

    // Check if script is already in the document
    const existingScript = document.querySelector(`script[src="${src}"]`);
    
    // If script is already loaded and in registry
    if (window.scriptRegistry && window.scriptRegistry.has(src) && window.scriptRegistry.get(src) === 'loaded') {
      handleScriptLoad();
      return;
    }
    
    // If script element exists but not in our registry
    if (existingScript && window.scriptRegistry) {
      window.scriptRegistry.set(src, 'loaded');
      handleScriptLoad();
      return;
    }

    // If script is currently loading according to registry
    if (window.scriptRegistry && window.scriptRegistry.has(src) && window.scriptRegistry.get(src) === 'loading') {
      const eventName = `script-loaded-${src}`;
      window.addEventListener(eventName, handleScriptLoad, { once: true });
      
      return () => {
        window.removeEventListener(eventName, handleScriptLoad);
      };
    }

    // Otherwise, create and append script
    if (window.scriptRegistry) {
      window.scriptRegistry.set(src, 'loading');
    }
    
    const script = document.createElement('script');
    script.src = src;
    script.async = async;
    script.defer = defer;
    
    const loadHandler = () => {
      if (window.scriptRegistry) {
        window.scriptRegistry.set(src, 'loaded');
      }
      
      // Notify other instances
      const loadEvent = new CustomEvent(`script-loaded-${src}`);
      window.dispatchEvent(loadEvent);
      
      handleScriptLoad();
    };
    
    script.addEventListener('load', loadHandler);
    
    // Add script to document
    document.head.appendChild(script);
    
    // Cleanup function
    return () => {
      // Don't remove the script from DOM as it may be used by other components
      script.removeEventListener('load', loadHandler);
    };
  }, [src, async, defer, onLoad]);

  return null;
};

// Add script registry to window type
declare global {
  interface Window {
    scriptRegistry: Map<string, string>;
  }
}

export default Script;
