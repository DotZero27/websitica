import { useState, useEffect } from "react";
import { supabase } from "@/lib/client";
import {
  CircleUserRound,
  Heart,
  Loader2,
  Shuffle,
  Timer,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import UnderwaterBackground from "./UndergroundBackground";

const QUESTION_DURATION = 60; // 1 minute in seconds
const TOTAL_CATEGORIES = 4;
const POINTS_POSSIBLE = 1000;
const MAX_LIVES = 4;

const categoryColors = {
  "Browser Dev Tools": "bg-gradient-to-br from-red-400 to-red-700",
  "URL Components": "bg-gradient-to-br from-purple-500 to-violet-800",
  "CSS Display Values": "bg-gradient-to-br from-yellow-400 to-yellow-600",
  "Frontend Frameworks": "bg-gradient-to-br from-green-400 to-green-600",

  "Programming Languages": "bg-gradient-to-br from-red-400 to-red-700",
  Databases: "bg-gradient-to-br from-purple-500 to-violet-800",
  "Web APIs": "bg-gradient-to-br from-yellow-400 to-yellow-600",
  "Web Security Threats": "bg-gradient-to-br from-green-400 to-green-600",

  "API Authentication": "bg-gradient-to-br from-red-400 to-red-700",
  "Mobile Frameworks": "bg-gradient-to-br from-purple-500 to-violet-800",
  "CSS Units": "bg-gradient-to-br from-yellow-400 to-yellow-600",
  "JavaScript Concepts": "bg-gradient-to-br from-green-400 to-green-600",

  "Protocols": "bg-gradient-to-br from-red-400 to-red-700",
  "Backend Frameworks": "bg-gradient-to-br from-purple-500 to-violet-800",
  "Frontend Toolkits": "bg-gradient-to-br from-yellow-400 to-yellow-600",
  "HTML Elements": "bg-gradient-to-br from-green-400 to-green-600",

  "Version Control": "bg-gradient-to-br from-red-400 to-red-700",
  "Database Concepts": "bg-gradient-to-br from-purple-500 to-violet-800",
  "Cloud Providers": "bg-gradient-to-br from-yellow-400 to-yellow-600",
  "Data Formats": "bg-gradient-to-br from-green-400 to-green-600",

  "HTTP Methods": "bg-gradient-to-br from-red-400 to-red-700",
  "Network Topologies": "bg-gradient-to-br from-purple-500 to-violet-800",
  "SDLC Methods": "bg-gradient-to-br from-yellow-400 to-yellow-600",
  "Software Testing Tools": "bg-gradient-to-br from-green-400 to-green-600",
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
  const [lives, setLives] = useState(MAX_LIVES);
  const [shakeHeart, setShakeHeart] = useState(false);

  useEffect(() => {
    checkAndStartGame();
    const subscription = supabase
      .channel("quiz_sessions")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "quiz_sessions" },
        handleSessionUpdate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
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

  const handleSessionUpdate = async (payload) => {
    console.log("Session update", payload);

    if (payload.new.status === "active") {
      // If an active session is updated or a new session becomes active
      const { data: activeSession } = await supabase
        .from("quiz_sessions")
        .select("*")
        .eq("id", payload.new.id)
        .single();

      if (activeSession) {
        setCurrentSession(activeSession);
        if (gameStatus === "waiting") {
          startGame(activeSession);
        }
      }
    } else if (payload.new.status === "completed") {
      // If any session is completed, check if it's the one we're currently playing
      const { data: currentActiveSession } = await supabase
        .from("quiz_sessions")
        .select("*")
        .eq("status", "active")
        .order("start_time", { ascending: false })
        .limit(1)
        .single();

      if (!currentActiveSession || currentActiveSession.id === payload.new.id) {
        // If there's no active session or the completed session is the one we're playing
        endGame();
      }
    }
  };

  const startGame = async (sessionData) => {
    await fetchNewGrid(sessionData);
    setGameStatus("active");
    setTimeLeft(QUESTION_DURATION);
    setQuestionStartTime(Date.now());
    setCompletedCategories([]);
    setTotalScore(0);
    setLives(MAX_LIVES);
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

  const checkCategory = async (items) => {
    const category = items[0].category;
    const isCorrect = items.every((item) => item.category === category);

    if (isCorrect && !completedCategories.includes(category)) {
      const responseTime = (Date.now() - questionStartTime) / 1000; // Convert to seconds
      const categoryScore = calculateScore(responseTime);

      const newTotalScore = totalScore + categoryScore;
      setTotalScore(newTotalScore);

      const newCompletedCategories = [...completedCategories, category];
      setCompletedCategories(newCompletedCategories);

      // Update the team's score in the database after each category completion
      console.log("New Score: " + categoryScore);
      await updateTeamScore(categoryScore);

      const newGrid = [
        ...grid.filter((item) => item.category === category),
        ...grid.filter((item) => item.category !== category),
      ];

      setGrid(newGrid);
      setSelectedItems([]);

      if (newCompletedCategories.length === TOTAL_CATEGORIES) {
        endGame(newTotalScore);
      }
    } else {
      const newLives = lives - 1;
      setShakeHeart(true);
      setTimeout(() => {
        setShakeHeart(false);
      }, 500);
      setLives(newLives);

      if (newLives === 0) {
        endGame(totalScore);
      }
      setSelectedItems([]);
    }
  };

  const updateTeamScore = async (scoreIncrement) => {
    if (!team) {
      console.error("Missing team data");
      return;
    }

    // Fetch the current team score
    const { data: currentTeamData, error: fetchError } = await supabase
      .from("teams")
      .select("score")
      .eq("id", team.id)
      .limit(1)
      .single();

    if (fetchError) {
      console.error("Error fetching team score:", fetchError);
      return;
    }

    const newScore = (currentTeamData.score || 0) + scoreIncrement;

    // Update the team's score
    const { data, error } = await supabase
      .from("teams")
      .update({ score: newScore })
      .eq("id", team.id);

    if (error) {
      console.error("Error updating team score:", error);
    } else {
      console.log("Team score updated successfully");
    }
  };

  const endGame = async (finalScore) => {
    setGameStatus("completed");
    await submitResult(finalScore);
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

  const shuffleGrid = () => {
    if (gameStatus !== "active") return;

    const completedItems = grid.filter((item) =>
      completedCategories.includes(item.category)
    );
    const remainingItems = grid.filter(
      (item) => !completedCategories.includes(item.category)
    );

    const shuffledRemainingItems = [...remainingItems].sort(
      () => Math.random() - 0.5
    );

    setGrid([...completedItems, ...shuffledRemainingItems]);
    setSelectedItems([]);
  };

  const deselectAll = () => {
    if (gameStatus !== "active") return;
    setSelectedItems([]);
  };

  const renderCompletedCategories = () => {
    return completedCategories.map((category) => {
      const categoryItems = grid.filter((item) => item.category === category);
      return (
        <div
          key={category}
          className={`flex flex-col items-center justify-center w-full mb-2 py-4 text-white rounded uppercase border-white ${
            categoryColors[category] || "bg-gray-600"
          }`}
        >
          <p className="text-lg font-bold mb-1">{category}</p>
          <p>{categoryItems.map((item) => item.text).join(", ")}</p>
        </div>
      );
    });
  };

  const renderLives = () => {
    return (
      <div className="absolute top-20 right-0 flex flex-col-reverse items-end">
        {[...Array(MAX_LIVES)].map((_, index) => (
          <Heart
            key={index}
            className={cn(
              `w-10 h-10`,
              index < lives ? "fill-red-500 text-white" : "text-gray-300",
              index === lives && shakeHeart && "animate-shake"
            )}
          />
        ))}
      </div>
    );
  };

  const renderRemainingGrid = () => {
    const remainingItems = grid.filter(
      (item) => !completedCategories.includes(item.category)
    );
    return (
      <div className="grid grid-cols-4 gap-4 text-black">
        {remainingItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className={`py-6 rounded-md font-bold ${
              selectedItems.includes(item)
                ? "bg-white text-black"
                : "text-white backdrop-blur-sm hover:scale-110 transition-transform duration-100 border bg-white/10 border-white"
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
    <div className="flex text-white min-h-screen">
      <UnderwaterBackground />
      <div className="flex-1 backdrop-blur-sm relative z-10 ">
        <div className="max-w-4xl h-full w-full mx-auto px-4 flex flex-col items-center justify-center">
          <div
            className={cn(
              `flex justify-center gap-8 w-full`,
              gameStatus === "completed" && "opacity-40 cursor-not-allowed"
            )}
          >
            <div className="flex flex-col justify-between">
              <div className="relative flex flex-col h-full">
                <h2 className="text-6xl mb-4 font-spicyRice font-bold uppercase">
                  Codections
                </h2>
                <div className="pb-3 mb-2 w-3/4 italic font-bold leading-4 border-b">
                  Discover 4 words that connect to the same theme
                </div>
                <div className="mb-4 flex items-center gap-4">
                  <CircleUserRound className="w-10 h-10" />
                  <div>
                    <p className="text-sm">
                      <span>Team</span> {team.name}
                    </p>
                    <p className="text-4xl font-bold">{player.name}</p>
                  </div>
                </div>
                <div className="flex gap-2 text-5xl font-bold items-center">
                  <Timer className="w-10 h-10" /> {Math.floor(timeLeft / 60)}:
                  {(timeLeft % 60).toString().padStart(2, "0")}
                </div>
                {renderLives()}
              </div>

              <div className="flex gap-4">
                <Button
                  disabled={gameStatus === "completed"}
                  variant="outline"
                  onClick={deselectAll}
                  className="w-full h-12 bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-400"
                >
                  <X className="mr-2 w-5 h-5" /> Deselect All
                </Button>
                <Button
                  disabled={gameStatus === "completed"}
                  variant="outline"
                  onClick={shuffleGrid}
                  className="w-full h-12 bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-400"
                >
                  <Shuffle className="mr-3 w-4 h-4" /> Shuffle
                </Button>
              </div>
            </div>

            {/* <p>x
        Categories Completed: {completedCategories.length} / {TOTAL_CATEGORIES}
      </p>
      <p>Current Score: {totalScore}</p> */}

            <div className="w-full">
              {renderCompletedCategories()}

              {renderRemainingGrid()}
            </div>
          </div>
          {gameStatus === "completed" && (
            <div className="mt-8">
              <p className="font-spicyRice text-5xl uppercase">
                Game completed
              </p>
              <p className="text-center">
                Categories Found: {completedCategories.length} /{" "}
                {TOTAL_CATEGORIES}
              </p>
              <Button
                variant="outline"
                className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-300"
                onClick={onGameEnd}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
