"use client";
import { supabase } from "@/lib/client";
import { useState, useEffect } from "react";

const GAME_DURATION = 60; // 1 minute in seconds
const TOTAL_CATEGORIES = 4;
const POINTS_POSSIBLE = 1000; // Points possible for each category

export default function PlayerGame() {
  const [player, setPlayer] = useState(null);
  const [team, setTeam] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [grid, setGrid] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [completedCategories, setCompletedCategories] = useState([]);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameStatus, setGameStatus] = useState("waiting"); // 'waiting', 'active', 'completed'
  const [categoryStartTime, setCategoryStartTime] = useState(null);
  const [totalScore, setTotalScore] = useState(0);

  useEffect(() => {
    if (player && team) {
      subscribeToUpdates();
    }
  }, [player, team]);

  useEffect(() => {
    if (
      currentSession &&
      currentSession.status === "active" &&
      gameStatus === "waiting"
    ) {
      startGame();
    }
  }, [currentSession]);

  useEffect(() => {
    let timer;
    if (gameStatus === "active" && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      endGame();
    }
    return () => clearInterval(timer);
  }, [gameStatus, timeLeft]);

  const subscribeToUpdates = () => {
    const subscription = supabase
      .channel("quiz_sessions")
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

    return () => {
      supabase.removeSubscription(subscription);
    };
  };

  const startGame = () => {
    fetchNewGrid();
    setGameStatus("active");
    setTimeLeft(GAME_DURATION);
    setCompletedCategories([]);
    setTotalScore(0);
    setCategoryStartTime(Date.now());
  };

  const endGame = async () => {
    setGameStatus("completed");
    await submitResult(totalScore);
    await updateTeamScore(totalScore);
  };

  const calculateScore = (responseTime) => {
    const timeFraction = responseTime / (GAME_DURATION / TOTAL_CATEGORIES);
    const scoreMultiplier = 1 - timeFraction / 2;
    const score = Math.round(POINTS_POSSIBLE * scoreMultiplier);
    return Math.max(0, score); // Ensure score is not negative
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
      .select()
      .single();

    if (playerError) {
      console.error("Error creating player:", playerError);
      return;
    }

    setPlayer(playerData);
    setTeam(teamData);

    await updateTeamPlayerCount(teamData.id, 1);
  };

  const fetchNewGrid = async () => {
    // In a real app, you'd fetch this from your backend or Supabase
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
    if (gameStatus !== "active") return;

    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter((i) => i !== item));
    } else if (selectedItems.length < 4) {
      setSelectedItems([...selectedItems, item]);
    }

    if (selectedItems.length === 3) {
      checkCategory([...selectedItems, item]);
    }
  };

  const checkCategory = (items) => {
    const category = items[0].category;
    const isCorrect = items.every((item) => item.category === category);

    if (isCorrect && !completedCategories.includes(category)) {
      const responseTime = (Date.now() - categoryStartTime) / 1000; // Convert to seconds
      const score = calculateScore(responseTime);

      setTotalScore((prevScore) => prevScore + score);
      setCompletedCategories([...completedCategories, category]);
      setGrid(grid.filter((item) => !items.includes(item)));
      setSelectedItems([]);
      setCategoryStartTime(Date.now()); // Reset for next category

      if (completedCategories.length + 1 === TOTAL_CATEGORIES) {
        endGame();
      }
    } else {
      setSelectedItems([]);
    }
  };

  const submitResult = async (score) => {
    if (!player || !team || !currentSession) {
      console.error("Missing player, team, or session data");
      return;
    }

    const { error } = await supabase
      .from("submissions")
      .insert({
        player_id: player.id,
        team_id: team.id,
        session_id: currentSession.id,
        is_correct: score === TOTAL_CATEGORIES,
        submitted_at: new Date().toISOString(),
      })
      .single();

    if (error) {
      console.error("Error submitting result:", error);
    }
  };

  const updateTeamScore = async (score) => {
    const { error } = await supabase
      .from("teams")
      .update({ score: team.score + score })
      .eq("id", team.id);

    if (error) {
      console.error("Error updating team score:", error);
    }
  };

  const updateTeamPlayerCount = async (teamId, increment) => {
    const { error } = await supabase.rpc("update_team_player_count", {
      team_id: teamId,
      increment: increment,
    });

    if (error) {
      console.error("Error updating team player count:", error);
    }
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

  if (gameStatus === "waiting") {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">Waiting for next session</h2>
        <p>Player: {player.name}</p>
        <p>Team: {team.name}</p>
      </div>
    );
  }

  if (gameStatus === "completed") {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">Game Completed</h2>
        <p>Player: {player.name}</p>
        <p>Team: {team.name}</p>
        <p>Score: {totalScore}</p>
        <p>
          Categories Completed: {completedCategories.length} /{" "}
          {TOTAL_CATEGORIES}
        </p>
        <p>Score: {completedCategories.length}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Game</h2>
      <p>Player: {player.name}</p>
      <p>Team: {team.name}</p>
      <p>Score: {totalScore}</p>
      <p>
        Time Left: {Math.floor(timeLeft / 60)}:
        {(timeLeft % 60).toString().padStart(2, "0")}
      </p>
      <p>
        Categories Completed: {completedCategories.length} / {TOTAL_CATEGORIES}
      </p>
      <div className="grid grid-cols-4 gap-4 mt-4">
        {grid.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className={`p-2 border ${
              selectedItems.includes(item) ? "bg-blue-200" : "bg-white"
            }`}
          >
            {item.text}
          </button>
        ))}
      </div>
    </div>
  );
}
