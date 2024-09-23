"use client";
import { supabase } from "@/lib/client";
import { useState, useEffect } from "react";

export default function AdminDashboard() {
  const [teams, setTeams] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);

  useEffect(() => {
    fetchTeams();
    subscribeToSessionUpdates();
  }, []);

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .order("score", { ascending: false });

    if (error) console.error("Error fetching teams:", error);
    else setTeams(data);
  };

  const subscribeToSessionUpdates = () => {
    const subscription = supabase
      .channel("quiz_sessions")
      .on("INSERT", (payload) => {
        setCurrentSession(payload.new);
      })
      .on("UPDATE", (payload) => {
        setCurrentSession(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeSubscription(subscription);
    };
  };

  const startNewSession = async () => {
    const { data, error } = await supabase
      .from("quiz_sessions")
      .insert({ status: "active", start_time: new Date().toISOString() })
      .single();

    if (error) console.error("Error starting new session:", error);
    else setCurrentSession(data);
  };

  const endCurrentSession = async () => {
    if (!currentSession) return;

    const { error } = await supabase
      .from("quiz_sessions")
      .update({ status: "completed", end_time: new Date().toISOString() })
      .eq("id", currentSession.id);

    if (error) console.error("Error ending session:", error);
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
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
            <tr key={team.id}>
              <td>{team.name}</td>
              <td>{team.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
