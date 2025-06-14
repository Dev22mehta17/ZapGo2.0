import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';

const AddStationForm = ({ existingStation, onSuccess }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: existingStation?.name || '',
    address: existingStation?.address || '',
    totalPorts: existingStation?.totalPorts || 1,
    pricePerHour: existingStation?.pricePerHour || 0,
    status: existingStation?.status || 'active',
    description: existingStation?.description || '',
    latitude: existingStation?.latitude || 0,
    longitude: existingStation?.longitude || 0,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'totalPorts' || name === 'pricePerHour' || name === 'latitude' || name === 'longitude' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Ensure all required fields are present and correct
      const stationData = {
        managerId: user.uid,
        name: formData.name || '',
        address: formData.address || '',
        totalPorts: Number(formData.totalPorts) || 0,
        pricePerHour: Number(formData.pricePerHour) || 0,
        status: formData.status || 'active',
        description: formData.description || '',
        latitude: Number(formData.latitude) || 0,
        longitude: Number(formData.longitude) || 0,
        updatedAt: new Date().toISOString(),
      };
      if (!existingStation) {
        stationData.createdAt = new Date().toISOString();
      }
      // Log the data for debugging
      console.log('Saving station:', stationData);
      if (existingStation) {
        await updateDoc(doc(db, 'stations', existingStation.id), stationData);
        toast.success('Station updated successfully');
      } else {
        await addDoc(collection(db, 'stations'), stationData);
        toast.success('Station added successfully');
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving station:', error);
      toast.error('Error saving station: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Station Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700">
            Address
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="totalPorts" className="block text-sm font-medium text-gray-700">
            Total Ports
          </label>
          <input
            type="number"
            id="totalPorts"
            name="totalPorts"
            min="1"
            value={formData.totalPorts}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="pricePerHour" className="block text-sm font-medium text-gray-700">
            Price per Hour ($)
          </label>
          <input
            type="number"
            id="pricePerHour"
            name="pricePerHour"
            min="0"
            step="0.01"
            value={formData.pricePerHour}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="active">Active</option>
            <option value="maintenance">Maintenance</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="3"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">
            Latitude
          </label>
          <input
            type="number"
            id="latitude"
            name="latitude"
            value={formData.latitude}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">
            Longitude
          </label>
          <input
            type="number"
            id="longitude"
            name="longitude"
            value={formData.longitude}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => onSuccess()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Saving...' : existingStation ? 'Update Station' : 'Add Station'}
        </button>
      </div>
    </form>
  );
};

export default AddStationForm; 