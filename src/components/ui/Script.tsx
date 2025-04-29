
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
    // Check if script already exists
    const existingScript = document.querySelector(`script[src="${src}"]`);
    
    if (existingScript) {
      // Script exists, consider it loaded
      setLoaded(true);
      if (onLoad) onLoad();
      return;
    }

    // Create script element
    const script = document.createElement('script');
    script.src = src;
    script.async = async;
    script.defer = defer;
    
    // Event listener for when script loads
    script.addEventListener('load', () => {
      setLoaded(true);
      if (onLoad) onLoad();
    });
    
    // Append script to document head
    document.head.appendChild(script);
    
    // Cleanup function
    return () => {
      // Don't remove the script on component unmount, as other components might need it
    };
  }, [src, async, defer, onLoad]);

  return null; // This component doesn't render anything
};

export default Script;
