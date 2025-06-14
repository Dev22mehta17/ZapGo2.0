import { useLoadScript } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '../config/googleMaps';

// Define libraries outside of the hook to prevent recreation
const libraries = ['places'];

let isLoaded = false;
let loadError = null;
let googleMapsInstance = null;

export const useGoogleMaps = () => {
  const { isLoaded: scriptLoaded, loadError: scriptError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
    version: 'weekly',
  });

  if (scriptLoaded && !isLoaded) {
    isLoaded = true;
    googleMapsInstance = window.google;
  }

  if (scriptError && !loadError) {
    loadError = scriptError;
  }

  return {
    isLoaded,
    loadError,
    google: googleMapsInstance,
  };
}; 