import { useRef } from 'react';
import { Autocomplete } from '@react-google-maps/api';
import { useGoogleMaps } from '../hooks/useGoogleMaps';

const SearchBar = ({ onPlaceSelected, placeholder }) => {
  const { isLoaded, loadError } = useGoogleMaps();
  const autocompleteRef = useRef(null);

  const handlePlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      onPlaceSelected(place);
    }
  };

  if (loadError) {
    return (
      <div className="text-red-600">
        Error loading Google Maps: {loadError.message}
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoaded && (
        <Autocomplete
          onLoad={(ref) => (autocompleteRef.current = ref)}
          onPlaceChanged={handlePlaceChanged}
        >
          <input
            type="text"
            placeholder={placeholder || "Search for a location..."}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </Autocomplete>
      )}
      {!isLoaded && (
        <input
          type="text"
          placeholder={placeholder || "Search for a location..."}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
          disabled
        />
      )}
    </div>
  );
};

export default SearchBar; 