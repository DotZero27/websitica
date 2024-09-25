import { useState, useEffect } from "react";
import { supabase } from "@/lib/client";
import { Loader2 } from "lucide-react";

const QUESTION_DURATION = 300; // 5 minutes in seconds
const TOTAL_CATEGORIES = 4;
const POINTS_POSSIBLE = 1000;

const categoryColors = {
  "Programming Languages": "bg-purple-700",
  "Frontend Frameworks": "bg-blue-600",
  Databases: "bg-green-600",
  "Version Control": "bg-orange-600",
};

export default function PlayerGame({ player, team, onGameEnd }) {
  const [currentSession, setCurrentSession] = useState(null);
  const [grid, setGrid] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [completedCategories, setCompletedCategories] = useState([]);
  const [timeLeft, setTimeLeft] = useState(QUESTION_DURATION);
  const [gameStatus, setGameStatus] = useState("waiting");
  const [questionStartTime, setQuestionStartTime] = useState(null);
  const [totalScore, setTotalScore] = useState(0);

  useEffect(() => {
    checkAndStartGame();
  }, []);

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

  const checkAndStartGame = async () => {
    const { data: sessionData } = await supabase
      .from("quiz_sessions")
      .select("*")
      .eq("status", "active")
      .order("start_time", { ascending: false })
      .limit(1)
      .single();

    if (sessionData) {
      setCurrentSession(sessionData);

      // Check if player has already submitted for this session
      const { data: submissionData } = await supabase
        .from("submissions")
        .select("*")
        .eq("player_id", player.id)
        .eq("session_id", sessionData.id)
        .limit(1)
        .single();

      if (submissionData) {
        // Player has already completed this session, return to waiting room
        onGameEnd();
      } else {
        // Player hasn't completed this session, start the game
        startGame(sessionData);
      }
    } else {
      // No active session, return to waiting room
      onGameEnd();
    }
  };

  const startGame = async (sessionData) => {
    await fetchNewGrid(sessionData);
    setGameStatus("active");
    setTimeLeft(QUESTION_DURATION);
    setQuestionStartTime(Date.now());
    setCompletedCategories([]);
    setTotalScore(0);
  };

  const calculateScore = (responseTime) => {
    const timeFraction = responseTime / QUESTION_DURATION;
    const scoreMultiplier = 1 - timeFraction / 2;
    const calculatedScore = Math.round(POINTS_POSSIBLE * scoreMultiplier);
    return Math.max(0, calculatedScore);
  };

  const fetchNewGrid = async (sessionData) => {
    const categories = [
      sessionData.category1,
      sessionData.category2,
      sessionData.category3,
      sessionData.category4,
    ].filter(Boolean);

    const { data: words, error } = await supabase
      .from("words")
      .select("word, category")
      .in("category", categories);

    if (error) {
      console.error("Error fetching words:", error);
      return;
    }

    const newGrid = categories.flatMap((category) => {
      const categoryWords = words.filter((word) => word.category === category);
      return categoryWords
        .sort(() => Math.random() - 0.5)
        .slice(0, 4)
        .map((word, index) => ({
          id: `${category}-${index}`,
          text: word.word,
          category: word.category,
        }));
    });

    setGrid(newGrid.sort(() => Math.random() - 0.5));
  };

  const handleItemClick = (item) => {
    if (gameStatus !== "active" || completedCategories.includes(item.category))
      return;

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
      const responseTime = (Date.now() - questionStartTime) / 1000; // Convert to seconds
      const categoryScore = calculateScore(responseTime);

      setTotalScore((prevScore) => prevScore + categoryScore);
      setCompletedCategories([...completedCategories, category]);

      // Reorder the grid to move the completed category to the top
      const newGrid = [
        ...grid.filter((item) => item.category === category),
        ...grid.filter((item) => item.category !== category),
      ];
      setGrid(newGrid);

      setSelectedItems([]);

      if (completedCategories.length + 1 === TOTAL_CATEGORIES) {
        endGame(totalScore + categoryScore);
      }
    } else {
      setSelectedItems([]);
    }
  };

  const endGame = async (finalScore) => {
    setGameStatus("completed");
    await submitResult(finalScore);
    onGameEnd();
  };

  const submitResult = async (finalScore) => {
    if (!player || !team || !currentSession) {
      console.error("Missing player, team, or session data");
      return;
    }

    const { error } = await supabase.from("submissions").insert({
      player_id: player.id,
      team_id: team.id,
      session_id: currentSession.id,
      is_correct: completedCategories.length === TOTAL_CATEGORIES,
      submitted_at: new Date().toISOString(),
      score: finalScore,
    });

    if (error) {
      console.error("Error submitting result:", error);
    }
  };

  const renderCompletedCategories = () => {
    return completedCategories.map((category) => {
      const categoryItems = grid.filter((item) => item.category === category);
      return (
        <div
          key={category}
          className={`flex flex-col items-center justify-center w-full mb-4 py-4 text-white rounded uppercase ${
            categoryColors[category] || "bg-gray-600"
          }`}
        >
          <h3 className="text-lg font-bold mb-2">{category}</h3>
          <p>{categoryItems.map((item) => item.text).join(", ")}</p>
        </div>
      );
    });
  };

  const renderRemainingGrid = () => {
    const remainingItems = grid.filter(
      (item) => !completedCategories.includes(item.category)
    );
    return (
      <div className="grid grid-cols-4 gap-4 mt-4 text-black" >
        {remainingItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className={`px-4 py-6 rounded-md ${
              selectedItems.includes(item) ? "bg-yellow-200" : "bg-white/80 backdrop-blur-sm"
            } ${
              gameStatus !== "active" ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={gameStatus !== "active"}
          >
            {item.text}
          </button>
        ))}
      </div>
    );
  };

  if (gameStatus === "waiting") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="p-8 text-blue-600 flex items-center rounded max-w-md gap-8 bg-white/80 backdrop-blur-sm">
          <div className="text-lg">Waiting for the game to start...</div>
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="text-white min-h-screen max-w-2xl flex flex-col mt-12 mx-auto px-4">
      <h2 className="text-4xl font-spicyRice font-bold mb-4 uppercase">Codections</h2>
      <p>Player: {player.name}</p>
      <p>Team: {team.name}</p>
      <p>
        Time Left: {Math.floor(timeLeft / 60)}:
        {(timeLeft % 60).toString().padStart(2, "0")}
      </p>
      {/* <p>
        Categories Completed: {completedCategories.length} / {TOTAL_CATEGORIES}
      </p>
      <p>Current Score: {totalScore}</p> */}

      <div className="mt-4">{renderCompletedCategories()}</div>

      {renderRemainingGrid()}

      {gameStatus === "completed" && (
        <div className="mt-4">
          <p>Game completed. Final Score: {totalScore}</p>
          <p>
            Categories Found: {completedCategories.length} / {TOTAL_CATEGORIES}
          </p>
        </div>
      )}
    </div>
  );
}
