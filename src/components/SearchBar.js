import { useRef } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { useGoogleMaps } from '../hooks/useGoogleMaps';

const SearchBar = ({ onPlaceSelected, placeholder, selectedPlace }) => {
  const { isLoaded, loadError } = useGoogleMaps();
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      onPlaceSelected(place);
    }
  };
  
  const handleInput = (e) => {
    // This is a workaround to allow clearing the input
    if (e.target.value === '') {
      onPlaceSelected(null);
    }
  };

  if (loadError) {
    return (
      <div className="text-red-600">
        Error loading Google Maps: {loadError.message}
      </div>
    );
  }
  
  const value = selectedPlace ? selectedPlace.formatted_address : '';

  return (
    <div className="relative">
      {isLoaded && (
        <Autocomplete
          onLoad={(ref) => (autocompleteRef.current = ref)}
          onPlaceChanged={handlePlaceChanged}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder || "Search for a location..."}
            defaultValue={value}
            onInput={handleInput}
            className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none"
          />
        </Autocomplete>
      )}
      {!isLoaded && (
        <input
          type="text"
          placeholder={placeholder || "Search for a location..."}
          className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white placeholder-slate-400"
          disabled
        />
      )}
    </div>
  );
};

export default SearchBar; 