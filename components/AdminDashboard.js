"use client";
import { supabase } from "@/lib/client";
import { useState, useEffect } from "react";

export default function AdminDashboard() {
  const [teams, setTeams] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);

  useEffect(() => {
    fetchTeams();
    subscribeToUpdates();

    return () => {
      supabase.removeAllChannels();
    };
  }, []);

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('score', { ascending: false });
    
    if (error) console.error('Error fetching teams:', error);
    else setTeams(data);
  };

  const subscribeToUpdates = () => {
    const subscription = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          console.log('team update')
          setTeams(currentTeams => {
            const updatedTeams = [...currentTeams];
            const index = updatedTeams.findIndex(team => team.id === payload.new.id);
            if (index !== -1) {
              updatedTeams[index] = payload.new;
            } else {
              updatedTeams.push(payload.new);
            }
            return updatedTeams.sort((a, b) => b.score - a.score);
          });
        } else if (payload.eventType === 'INSERT') {
          setTeams(currentTeams => [...currentTeams, payload.new].sort((a, b) => b.score - a.score));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_sessions' }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          setCurrentSession(payload.new);
        }
      })
      .subscribe();

      return () => {
        supabase.removeSubscription(subscription);
      };
  };


  
  const startNewSession = async () => {
    const { data, error } = await supabase
      .from('quiz_sessions')
      .insert({ status: 'active', start_time: new Date().toISOString() })
      .single();

    if (error) console.error('Error starting new session:', error);
    else setCurrentSession(data);
  };

  const endCurrentSession = async () => {
    if (!currentSession) return;

    const { error } = await supabase
      .from('quiz_sessions')
      .update({ status: 'completed', end_time: new Date().toISOString() })
      .eq('id', currentSession.id);

    if (error) console.error('Error ending session:', error);
    else setCurrentSession(null);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>
      <div className="mb-4">
        {currentSession ? (
          <button
            onClick={endCurrentSession}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            End Current Session
          </button>
        ) : (
          <button
            onClick={startNewSession}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          >
            Start New Session
          </button>
        )}
      </div>
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-left">Team</th>
            <th className="text-left">Score</th>
            <th className="text-left">Players</th>
          </tr>
        </thead>
        <tbody>
          {teams.map(team => (
            <tr key={team.id}>
              <td>{team.name}</td>
              <td>{team.score}</td>
              <td>{team.player_count || 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}