"use client";
import { supabase } from "@/lib/client";
import { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function AdminDashboard() {
  const [teams, setTeams] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [newSessionStart, setNewSessionStart] = useState(new Date());
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionScores, setSessionScores] = useState({});
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [realtimeSubmissions, setRealtimeSubmissions] = useState([]);

  useEffect(() => {
    fetchTeams();
    fetchSessions();
    fetchCategories();
    subscribeToUpdates();
  }, []);

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .order("score", { ascending: false });

    if (error) console.error("Error fetching teams:", error);
    else setTeams(data);
  };

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from("quiz_sessions")
      .select("*")
      .order("start_time", { ascending: false });

    if (error) console.error("Error fetching sessions:", error);
    else setSessions(data);
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("category");
    if (error) console.error("Error fetching categories:", error);
    else setCategories(data.map((c) => c.category));
  };

  const subscribeToUpdates = () => {
    supabase
      .channel("teams")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams" },
        handleTeamUpdate
      )
      .subscribe();

    supabase
      .channel("submissions")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions" },
        handleSubmissionInsert
      )
      .subscribe();

    return () => {
      supabase.removeAllChannels();
    };
  };

  const handleTeamUpdate = (payload) => {
    console.log("Handle Team Update", payload);
    setTeams((currentTeams) => {
      if (payload.eventType === "DELETE") {
        return currentTeams
          .filter((team) => team.id !== payload.old.id)
          .sort((a, b) => b.score - a.score);
      } else {
        const updatedTeams = currentTeams.filter(
          (team) => team.id !== payload.new.id
        );
        updatedTeams.push(payload.new);
        return updatedTeams.sort((a, b) => b.score - a.score);
      }
    });
  };

  const handleSubmissionInsert = async (payload) => {
    const { session_id, team_id, score } = payload.new;
  
    // Fetch the team data directly from the database
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('name')
      .eq('id', team_id)
      .limit(1)
      .single();
  
    if (teamError) {
      console.error('Error fetching team data:', teamError);
      return;
    }
  
    const teamName = teamData ? teamData.name : 'Unknown Team';
  
    setSessionScores((prevScores) => {
      const updatedScores = { ...prevScores };
      if (!updatedScores[session_id]) {
        updatedScores[session_id] = {};
      }
      updatedScores[session_id][teamName] = 
        (updatedScores[session_id][teamName] || 0) + score;
      return updatedScores;
    });
  
    // Add to real-time submissions
    setRealtimeSubmissions((prev) => [
      ...prev,
      { teamName, score, timestamp: new Date().toLocaleString() },
    ]);
  };

  const createNewSession = async () => {
    if (selectedCategories.length !== 4) {
      alert("Please select exactly 4 categories");
      return;
    }

    const { data, error } = await supabase
      .from("quiz_sessions")
      .insert({
        status: "scheduled",
        start_time: newSessionStart.toISOString(),
        category1: selectedCategories[0],
        category2: selectedCategories[1],
        category3: selectedCategories[2],
        category4: selectedCategories[3],
      })
      .select()
      .limit(1)
      .single();

    if (error) console.error("Error creating new session:", error);
    else {
      setSessions([...sessions, data]);
      setNewSessionStart(new Date());
      setSelectedCategories([]);
    }
  };
  const handleCategoryChange = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : prev.length < 4
        ? [...prev, category]
        : prev
    );
  };

  const startSession = async (sessionId) => {
    const { data, error } = await supabase
      .from("quiz_sessions")
      .update({ status: "active" })
      .eq("id", sessionId)
      .select()
      .single();

    if (error) {
      console.error("Error starting session:", error);
    } else {
      setSessions((prevSessions) =>
        prevSessions.map((session) =>
          session.id === sessionId ? data : session
        )
      );
      setRealtimeSubmissions([]); // Clear previous submissions
    }
  };

  const endSession = async (sessionId) => {
    const { data, error } = await supabase
      .from("quiz_sessions")
      .update({ status: "completed", end_time: new Date().toISOString() })
      .eq("id", sessionId)
      .select()
      .single();

    if (error) {
      console.error("Error ending session:", error);
    } else {
      setSessions((prevSessions) =>
        prevSessions.map((session) =>
          session.id === sessionId ? data : session
        )
      );
      fetchSessionScores(sessionId);
    }
  };

  const deleteSession = async (sessionId) => {
    const { error } = await supabase
      .from("quiz_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      console.error("Error deleting session:", error);
    } else {
      setSessions((prevSessions) =>
        prevSessions.filter((session) => session.id !== sessionId)
      );
      if (selectedSession && selectedSession.id === sessionId) {
        setSelectedSession(null);
      }
    }
  };

  const fetchSessionScores = async (sessionId) => {
    const { data, error } = await supabase
      .from("submissions")
      .select("score, team:teams(name)")
      .eq("session_id", sessionId);

    if (error) {
      console.error("Error fetching session scores:", error);
      return;
    }

    const scores = data.reduce((acc, submission) => {
      const teamName = submission.team.name;
      acc[teamName] = (acc[teamName] || 0) + submission.score;
      return acc;
    }, {});

    setSessionScores((prevScores) => ({
      ...prevScores,
      [sessionId]: scores,
    }));
  };

  const deleteAllTeams = async () => {
    await supabase.from("teams").delete().neq("id", 1);
    setTeams([]);
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>

      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-2">Create New Session</h3>
        <DatePicker
          selected={newSessionStart}
          onChange={(date) => setNewSessionStart(date)}
          showTimeSelect
          dateFormat="MMMM d, yyyy h:mm aa"
          className="border p-2 mr-2"
        />
        <div className="my-4">
          <h4 className="font-semibold mb-2">Select 4 Categories:</h4>
          <div className="max-w-4xl grid grid-cols-4 gap-4">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-3 py-1 rounded ${
                  selectedCategories.includes(category)
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={createNewSession}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Create Session
        </button>
      </div>

      <button
        className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
        onClick={deleteAllTeams}
      >
        Delete All Teams
      </button>
      <div className="flex gap-4 justify-between">
        <div className="w-full">
          <div className="my-4">
            <h3 className="text-xl font-semibold mb-2">Manage Sessions</h3>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left">No.</th>
                  <th className="text-left">Start Time</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, index) => (
                  <tr key={session?.id}>
                    <td>{index + 1}</td>
                    <td>{new Date(session?.start_time).toLocaleString()}</td>
                    <td>{session?.status}</td>
                    <td>
                      {session?.status === "scheduled" && (
                        <button
                          onClick={() => startSession(session?.id)}
                          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded mr-2"
                        >
                          Start
                        </button>
                      )}
                      {session?.status === "active" && (
                        <button
                          onClick={() => endSession(session?.id)}
                          className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded mr-2"
                        >
                          End
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedSession(session);
                          fetchSessionScores(session?.id);
                        }}
                        className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-2 rounded mr-2"
                      >
                        View Scores
                      </button>
                      <button
                        onClick={() => {
                          deleteSession(session?.id);
                        }}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedSession && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-2">Session Scoreboard</h3>
              <h4>
                Session: {new Date(selectedSession.start_time).toLocaleString()}
              </h4>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left">Team</th>
                    <th className="text-left">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(sessionScores[selectedSession.id] || {}).map(
                    ([teamName, score]) => (
                      <tr key={teamName}>
                        <td>{teamName || "Unknown Team"}</td>
                        <td>{score}</td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-2">
              Real-time Submissions
            </h3>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left">Team</th>
                  <th className="text-left">Score</th>
                  <th className="text-left">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {realtimeSubmissions.map((submission, index) => (
                  <tr key={index}>
                    <td>{submission.teamName}</td>
                    <td>{submission.score}</td>
                    <td>{submission.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="w-full">
          <h3 className="text-xl font-semibold mb-2">Overall Team Rankings</h3>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">Team</th>
                <th className="text-left">Score</th>
                <th className="text-left">Players</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id}>
                  <td>{team.name}</td>
                  <td>{team.score}</td>
                  <td>{team.player_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
