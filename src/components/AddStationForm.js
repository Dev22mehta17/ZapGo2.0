import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';

const AddStationForm = ({ stationToEdit, onSuccess, onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    location: { address: '', lat: null, lng: null },
    totalSlots: '',
    availableSlots: '',
    pricePerHour: '',
    status: 'available', // available, busy, offline
    amenities: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (stationToEdit) {
      setFormData({
        name: stationToEdit.name || '',
        location: stationToEdit.location || { address: '', lat: null, lng: null },
        totalSlots: stationToEdit.totalSlots || '',
        availableSlots: stationToEdit.availableSlots ?? '',
        pricePerHour: stationToEdit.pricePerHour || '',
        status: stationToEdit.status || 'available',
        amenities: Array.isArray(stationToEdit.amenities) ? stationToEdit.amenities.join(', ') : ''
      });
    } else {
      // Reset form when adding new
      setFormData({
        name: '',
        location: { address: '', lat: null, lng: null },
        totalSlots: '',
        availableSlots: '',
        pricePerHour: '',
        status: 'available',
        amenities: ''
      });
    }
  }, [stationToEdit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'address') {
      setFormData(prev => ({ ...prev, location: { ...prev.location, address: value } }));
    } else if (name === 'totalSlots' || name === 'availableSlots' || name === 'pricePerHour') {
      setFormData(prev => ({...prev, [name]: value === '' ? '' : Number(value) }));
    } 
    else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (parseInt(formData.availableSlots) > parseInt(formData.totalSlots)) {
        toast.error('Available slots cannot be greater than total slots.');
        setLoading(false);
        return;
    }

    const dataToSave = {
      ...formData,
      managerId: user.uid,
      amenities: formData.amenities.split(',').map(item => item.trim()),
      updatedAt: serverTimestamp()
    };

    // Remove empty fields from location
    if (!dataToSave.location.lat || !dataToSave.location.lng) {
        // Here you might want to geocode the address to get lat/lng
        // For now, we'll just remove the incomplete location
        delete dataToSave.location;
    }

    try {
      if (stationToEdit) {
        // Update existing station
        const stationRef = doc(db, 'stations', stationToEdit.id);
        await updateDoc(stationRef, dataToSave);
        toast.success('Station updated successfully!');
      } else {
        // Add new station
        dataToSave.createdAt = serverTimestamp();
        await addDoc(collection(db, 'stations'), dataToSave);
        toast.success('Station added successfully!');
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving station:', error);
      toast.error('Failed to save station.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {stationToEdit ? 'Edit Station' : 'Add New Station'}
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Station Name</label>
                <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
            
            <div className="md:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">Address</label>
                <input type="text" name="address" id="address" value={formData.location.address} onChange={handleChange} required className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>

            <div>
                <label htmlFor="totalSlots" className="block text-sm font-medium text-gray-700">Total Slots</label>
                <input type="number" name="totalSlots" id="totalSlots" value={formData.totalSlots} onChange={handleChange} required min="0" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
            
            <div>
                <label htmlFor="availableSlots" className="block text-sm font-medium text-gray-700">Available Slots</label>
                <input type="number" name="availableSlots" id="availableSlots" value={formData.availableSlots} onChange={handleChange} required min="0" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
            
            <div>
                <label htmlFor="pricePerHour" className="block text-sm font-medium text-gray-700">Price per Hour ($)</label>
                <input type="number" name="pricePerHour" id="pricePerHour" value={formData.pricePerHour} onChange={handleChange} required min="0" step="0.01" className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>
            
            <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                <select name="status" id="status" value={formData.status} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md">
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="offline">Offline</option>
                </select>
            </div>
            
            <div className="md:col-span-2">
                <label htmlFor="amenities" className="block text-sm font-medium text-gray-700">Amenities (comma-separated)</label>
                <input type="text" name="amenities" id="amenities" value={formData.amenities} onChange={handleChange} className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500" />
            </div>

            <div className="md:col-span-2 flex justify-end space-x-3 pt-4">
                <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                    Cancel
                </button>
                <button type="submit" disabled={loading} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-400">
                    {loading ? 'Saving...' : (stationToEdit ? 'Save Changes' : 'Add Station')}
                </button>
            </div>
        </form>
    </div>
  );
};

export default AddStationForm; 