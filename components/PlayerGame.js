"use client";
import { supabase } from "@/lib/client";
import { useState, useEffect } from "react";

export default function PlayerGame() {
  const [player, setPlayer] = useState(null);
  const [team, setTeam] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [grid, setGrid] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (player && team) {
      subscribeToUpdates();
    }
  }, [player, team]);

  useEffect(() => {
    if (currentSession && currentSession.status === "active") {
      fetchNewGrid();
      setHasSubmitted(false);
    }
  }, [currentSession]);

  const subscribeToUpdates = () => {
    supabase
      .channel("admin-dashboard")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "teams" },
        (payload) => {
          setTeams((currentTeams) => {
            const updatedTeams = [...currentTeams];
            const index = updatedTeams.findIndex(
              (team) => team.id === payload.new.id
            );
            if (index !== -1) {
              updatedTeams[index] = payload.new;
            }
            return updatedTeams.sort((a, b) => b.score - a.score);
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quiz_sessions" },
        (payload) => {
          if (
            payload.eventType === "INSERT" ||
            payload.eventType === "UPDATE"
          ) {
            setCurrentSession(payload.new);
          }
        }
      )
      .subscribe();
  };

  const joinGame = async (playerName, teamName) => {
    // Check if team exists, if not create it
    let { data: teamData, error: teamError } = await supabase
      .from("teams")
      .select("*")
      .eq("name", teamName)
      .single();

    if (teamError && teamError.code === "PGRST116") {
      // Team doesn't exist, create it
      const { data, error } = await supabase
        .from("teams")
        .insert({ name: teamName, score: 0 })
        .select()
        .single();

      if (error) {
        console.error("Error creating team:", error);
        return;
      }
      teamData = data;
    } else if (teamError) {
      console.error("Error fetching team:", teamError);
      return;
    }

    // Create player
    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .insert({ name: playerName, team_id: teamData.id })
      .select();

    if (playerError) {
      console.error("Error creating player:", playerError);
      return;
    }

    setPlayer(playerData);
    setTeam(teamData);
  };

  const fetchNewGrid = async () => {
    // In a real app, you'd fetch this from your backend or Supabase
    // For this example, we'll use a hardcoded grid
    const newGrid = [
      { id: 1, text: "Python", category: "Programming Languages" },
      { id: 2, text: "JavaScript", category: "Programming Languages" },
      { id: 3, text: "Ruby", category: "Programming Languages" },
      { id: 4, text: "Java", category: "Programming Languages" },
      { id: 5, text: "React", category: "Frontend Frameworks" },
      { id: 6, text: "Vue", category: "Frontend Frameworks" },
      { id: 7, text: "Angular", category: "Frontend Frameworks" },
      { id: 8, text: "Svelte", category: "Frontend Frameworks" },
      { id: 9, text: "MongoDB", category: "Databases" },
      { id: 10, text: "PostgreSQL", category: "Databases" },
      { id: 11, text: "MySQL", category: "Databases" },
      { id: 12, text: "SQLite", category: "Databases" },
      { id: 13, text: "Git", category: "Version Control" },
      { id: 14, text: "SVN", category: "Version Control" },
      { id: 15, text: "Mercurial", category: "Version Control" },
      { id: 16, text: "Perforce", category: "Version Control" },
    ];
    setGrid(newGrid.sort(() => Math.random() - 0.5));
  };

  const handleItemClick = (item) => {
    if (hasSubmitted) return;

    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter((i) => i !== item));
    } else if (selectedItems.length < 4) {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const submitAnswer = async () => {
    if (selectedItems.length !== 4 || hasSubmitted) return;

    const category = selectedItems[0].category;
    const isCorrect = selectedItems.every((item) => item.category === category);

    const { data, error } = await supabase
      .from("submissions")
      .insert({
        player_id: player.id,
        team_id: team.id,
        session_id: currentSession.id,
        is_correct: isCorrect,
        submitted_at: new Date().toISOString(),
      })
      .single();

    if (error) {
      console.error("Error submitting answer:", error);
      return;
    }

    setHasSubmitted(true);

    // The backend will handle updating scores and determining the first correct submission
  };

  if (!player || !team) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">Join Game</h2>
        <input
          type="text"
          id="playerName"
          placeholder="Enter your name"
          className="border p-2 mr-2"
        />
        <input
          type="text"
          id="teamName"
          placeholder="Enter team name"
          className="border p-2 mr-2"
        />
        <button
          onClick={() =>
            joinGame(
              document.getElementById("playerName").value,
              document.getElementById("teamName").value
            )
          }
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Join Game
        </button>
      </div>
    );
  }

  if (!currentSession || currentSession.status !== "active") {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">Waiting for next session</h2>
        <p>Player: {player.name}</p>
        <p>Team: {team.name}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Game</h2>
      <p>Player: {player.name}</p>
      <p>Team: {team.name}</p>
      <div className="grid grid-cols-4 gap-4 mt-4">
        {grid.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className={`p-2 border ${
              selectedItems.includes(item) ? "bg-blue-200" : "bg-white"
            } ${hasSubmitted ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={hasSubmitted}
          >
            {item.text}
          </button>
        ))}
      </div>
      <button
        onClick={submitAnswer}
        disabled={selectedItems.length !== 4 || hasSubmitted}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mt-4 disabled:opacity-50"
      >
        Submit Answer
      </button>
      {hasSubmitted && (
        <p className="mt-4">Answer submitted. Waiting for results...</p>
      )}
    </div>
  );
}
