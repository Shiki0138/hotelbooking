import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

interface Match {
  id: string;
  hotel_id: string;
  hotel_name: string;
  match_score: number;
  match_details: {
    location: number;
    price: number;
    amenities: number;
    roomType: number;
  };
  created_at: string;
  user_viewed: boolean;
  user_action: string | null;
}

export const MatchHistory: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      const response = await fetch('/api/user-matching/matches?limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMatches(data.matches);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast.error('Failed to load match history');
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = async (matchId: string) => {
    try {
      const response = await fetch(`/api/user-matching/matches/${matchId}/view`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        setMatches(matches.map(m => 
          m.id === matchId ? { ...m, user_viewed: true } : m
        ));
      }
    } catch (error) {
      console.error('Error marking match as viewed:', error);
    }
  };

  const updateAction = async (matchId: string, action: string) => {
    try {
      const response = await fetch(`/api/user-matching/matches/${matchId}/action`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action })
      });
      
      if (response.ok) {
        setMatches(matches.map(m => 
          m.id === matchId ? { ...m, user_action: action } : m
        ));
        toast.success(`Hotel ${action}`);
      }
    } catch (error) {
      console.error('Error updating match action:', error);
      toast.error('Failed to update action');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getActionBadge = (action: string | null) => {
    const badges: { [key: string]: string } = {
      saved: 'bg-blue-100 text-blue-800',
      booked: 'bg-green-100 text-green-800',
      dismissed: 'bg-red-100 text-red-800',
      viewed: 'bg-gray-100 text-gray-800'
    };
    
    if (!action) return null;
    
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${badges[action] || ''}`}>
        {action}
      </span>
    );
  };

  if (loading) return <div className="p-4">Loading matches...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Your Hotel Matches</h2>
      
      {matches.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No matches found yet. Update your preferences to start receiving personalized hotel recommendations.
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <div
              key={match.id}
              className={`p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow ${
                !match.user_viewed ? 'border-l-4 border-blue-500' : ''
              }`}
              onClick={() => !match.user_viewed && markAsViewed(match.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {match.hotel_name}
                    {!match.user_viewed && (
                      <span className="ml-2 text-sm text-blue-600">New</span>
                    )}
                  </h3>
                  
                  <div className="mt-2 flex items-center space-x-4">
                    <span className={`font-bold ${getScoreColor(match.match_score)}`}>
                      {match.match_score}% Match
                    </span>
                    <span className="text-sm text-gray-500">
                      {format(new Date(match.created_at), 'MMM dd, yyyy HH:mm')}
                    </span>
                    {getActionBadge(match.user_action)}
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-600">
                    <div className="flex space-x-4">
                      <span>Location: {match.match_details.location}%</span>
                      <span>Price: {match.match_details.price}%</span>
                      <span>Amenities: {match.match_details.amenities}%</span>
                      <span>Room: {match.match_details.roomType}%</span>
                    </div>
                  </div>
                </div>
                
                <div className="ml-4 flex space-x-2">
                  {!match.user_action && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateAction(match.id, 'saved');
                        }}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateAction(match.id, 'dismissed');
                        }}
                        className="px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                      >
                        Dismiss
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};