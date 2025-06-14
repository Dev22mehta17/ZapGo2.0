import { useState } from 'react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';

const SearchBar = ({ onPlaceSelected }) => {
  const [inputValue, setInputValue] = useState('');
  const { isLoaded, loadError, google } = useGoogleMaps();

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim() && google) {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: inputValue }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const place = {
            geometry: {
              location: {
                lat: results[0].geometry.location.lat(),
                lng: results[0].geometry.location.lng()
              }
            },
            formatted_address: results[0].formatted_address
          };
          onPlaceSelected(place);
        }
      });
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
    <form onSubmit={handleSubmit} className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder="Search for a location..."
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        disabled={!isLoaded}
      />
      <button
        type="submit"
        className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!isLoaded}
      >
        Search
      </button>
    </form>
  );
};

export default SearchBar; 