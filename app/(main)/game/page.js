"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PlayerGame from "@/components/PlayerGame";
import { Loader2 } from "lucide-react";

export default function PlayerGamePage() {
  const [player, setPlayer] = useState(null);
  const [team, setTeam] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const playerData = JSON.parse(localStorage.getItem("playerData"));
    const teamData = JSON.parse(localStorage.getItem("teamData"));
    if (playerData && teamData) {
      setPlayer(playerData);
      setTeam(teamData);
    } else {
      router.push("/");
    }
  }, []);

  const handleGameEnd = () => {
    router.push("/waiting");
  };

  if (!player || !team) {
    return (
      <div
        key="loading-player-data"
        className="min-h-screen flex items-center justify-center"
      >
        <div className="max-w-md flex flex-1 items-center justify-center bg-white/80 backdrop-blur-sm relative z-10 space-x-8 rounded p-4">
          <span className="text-blue-500 text-xl">
            Waiting for player data...
          </span>
          <Loader2 className="text-center w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  return <PlayerGame player={player} team={team} onGameEnd={handleGameEnd} />;
}
