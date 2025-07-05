import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface UserPreference {
  preferred_locations: string[];
  preferred_prefectures: string[];
  budget_min: number | null;
  budget_max: number | null;
  date_flexibility: {
    flexible: boolean;
    preferred_days: string[];
    avoid_days: string[];
    advance_days: number;
  };
  room_preferences: {
    types: string[];
    amenities: string[];
    min_size: number | null;
  };
  notification_settings: {
    channels: string[];
    frequency: string;
    quiet_hours: {
      start: string;
      end: string;
    };
    match_threshold: number;
  };
  auto_match_enabled: boolean;
  match_priority: string;
}

const PREFECTURES = [
  'tokyo', 'osaka', 'kyoto', 'fukuoka', 'hokkaido', 
  'kanagawa', 'aichi', 'hyogo', 'chiba', 'saitama'
];

const ROOM_TYPES = ['single', 'double', 'twin', 'suite', 'deluxe'];
const AMENITIES = ['wifi', 'parking', 'breakfast', 'gym', 'pool', 'spa', 'restaurant', 'bar'];
const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const PreferenceSettings: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<UserPreference>({
    preferred_locations: [],
    preferred_prefectures: [],
    budget_min: null,
    budget_max: null,
    date_flexibility: {
      flexible: true,
      preferred_days: ['friday', 'saturday'],
      avoid_days: [],
      advance_days: 7
    },
    room_preferences: {
      types: ['single', 'double', 'twin'],
      amenities: [],
      min_size: null
    },
    notification_settings: {
      channels: ['email'],
      frequency: 'immediate',
      quiet_hours: {
        start: '22:00',
        end: '08:00'
      },
      match_threshold: 80
    },
    auto_match_enabled: true,
    match_priority: 'balanced'
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/user-matching/preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      toast.error('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/user-matching/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(preferences)
      });
      
      if (response.ok) {
        toast.success('Preferences saved successfully');
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const toggleArrayItem = (array: string[], item: string): string[] => {
    return array.includes(item) 
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  if (loading) return <div className="p-4">Loading preferences...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Hotel Matching Preferences</h2>

      {/* Location Preferences */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Location Preferences</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Preferred Prefectures</label>
          <div className="grid grid-cols-3 gap-2">
            {PREFECTURES.map(prefecture => (
              <label key={prefecture} className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.preferred_prefectures.includes(prefecture)}
                  onChange={() => setPreferences({
                    ...preferences,
                    preferred_prefectures: toggleArrayItem(preferences.preferred_prefectures, prefecture)
                  })}
                  className="mr-2"
                />
                <span className="capitalize">{prefecture}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Budget Preferences */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Budget Range</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Minimum Budget (¥)</label>
            <input
              type="number"
              value={preferences.budget_min || ''}
              onChange={(e) => setPreferences({
                ...preferences,
                budget_min: e.target.value ? parseInt(e.target.value) : null
              })}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="5000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Maximum Budget (¥)</label>
            <input
              type="number"
              value={preferences.budget_max || ''}
              onChange={(e) => setPreferences({
                ...preferences,
                budget_max: e.target.value ? parseInt(e.target.value) : null
              })}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="30000"
            />
          </div>
        </div>
      </div>

      {/* Room Preferences */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Room Preferences</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Room Types</label>
          <div className="flex flex-wrap gap-2">
            {ROOM_TYPES.map(type => (
              <label key={type} className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.room_preferences.types.includes(type)}
                  onChange={() => setPreferences({
                    ...preferences,
                    room_preferences: {
                      ...preferences.room_preferences,
                      types: toggleArrayItem(preferences.room_preferences.types, type)
                    }
                  })}
                  className="mr-2"
                />
                <span className="capitalize">{type}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Amenities</label>
          <div className="grid grid-cols-3 gap-2">
            {AMENITIES.map(amenity => (
              <label key={amenity} className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.room_preferences.amenities.includes(amenity)}
                  onChange={() => setPreferences({
                    ...preferences,
                    room_preferences: {
                      ...preferences.room_preferences,
                      amenities: toggleArrayItem(preferences.room_preferences.amenities, amenity)
                    }
                  })}
                  className="mr-2"
                />
                <span className="capitalize">{amenity}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Matching Settings */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Matching Settings</h3>
        
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={preferences.auto_match_enabled}
              onChange={(e) => setPreferences({
                ...preferences,
                auto_match_enabled: e.target.checked
              })}
              className="mr-2"
            />
            <span>Enable automatic matching</span>
          </label>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Match Priority</label>
          <select
            value={preferences.match_priority}
            onChange={(e) => setPreferences({
              ...preferences,
              match_priority: e.target.value
            })}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="balanced">Balanced</option>
            <option value="price">Price Priority</option>
            <option value="location">Location Priority</option>
            <option value="availability">Availability Priority</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            Match Threshold ({preferences.notification_settings.match_threshold}%)
          </label>
          <input
            type="range"
            min="50"
            max="100"
            step="5"
            value={preferences.notification_settings.match_threshold}
            onChange={(e) => setPreferences({
              ...preferences,
              notification_settings: {
                ...preferences.notification_settings,
                match_threshold: parseInt(e.target.value)
              }
            })}
            className="w-full"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={savePreferences}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
};