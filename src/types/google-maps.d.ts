
/// <reference types="google.maps" />

// Declare the global google namespace
declare global {
  interface Window {
    google: typeof google;
  }
}

export {};
