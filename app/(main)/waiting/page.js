"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import PlayerWaiting from "@/components/PlayerWaiting";
import { supabase } from "@/lib/client";

export default function PlayerWaitingPage() {
  const [player, setPlayer] = useState(null);
  const [team, setTeam] = useState(null);
  const [upcomingSession, setUpcomingSession] = useState(null);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const checkSessionStatus = useCallback(async (playerId, teamData) => {
    const { data: sessionData, error } = await supabase
      .from("quiz_sessions")
      .select("*")
      .eq("status", "active")
      .eq("lab", teamData.lab)
      .order("start_time", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No active session, check for upcoming
        await checkForUpcomingSession(teamData);
      } else {
        console.error("Error checking session status:", error);
      }
    } else if (sessionData) {
      // There's an active session, check if player has already submitted
      const { data: submissionData } = await supabase
        .from("submissions")
        .select("*")
        .eq("player_id", playerId)
        .eq("session_id", sessionData.id)
        .limit(1)
        .single();

      if (submissionData) {
        // Player has already completed this session
        setMessage("You've completed the current session. Please wait for the next one.");
      } else {
        // Player hasn't submitted for this session, redirect to game
        router.push('/game');
      }
    }
  }, [router]);

  const checkForUpcomingSession = async (teamData) => {
    const { data, error } = await supabase
      .from("quiz_sessions")
      .select("*")
      .eq("status", "scheduled")
      .eq("lab", teamData.lab)
      .order("start_time", { ascending: true })
      .limit(1)
      .single();

    if (error) {
      console.error("[WAITING] Error checking for upcoming session:", error);
    } else if (data) {
      setUpcomingSession(data);
    }
  };

  const verifyPlayerData = useCallback(async (playerData, teamData) => {
    if (!playerData || !teamData) return false;

    // Check if player exists in the database
    const { data: playerDbData, error: playerError } = await supabase
      .from("players")
      .select("*")
      .eq("id", playerData.id)
      .single();

    if (playerError || !playerDbData) {
      console.error("Player not found in database:", playerError);
      return false;
    }

    // Check if team exists in the database
    const { data: teamDbData, error: teamError } = await supabase
      .from("teams")
      .select("*")
      .eq("id", teamData.id)
      .single();

    if (teamError || !teamDbData) {
      console.error("Team not found in database:", teamError);
      return false;
    }

    // Check if player is associated with the correct team
    if (playerDbData.team_id !== teamDbData.id) {
      console.error("Player-team association mismatch");
      return false;
    }

    // Update local storage with fresh data from the database
    localStorage.setItem('playerData', JSON.stringify(playerDbData));
    localStorage.setItem('teamData', JSON.stringify(teamDbData));

    setPlayer(playerDbData);
    setTeam(teamDbData);

    return true;
  }, []);

  useEffect(() => {
    const initializePlayer = async () => {
      const playerData = JSON.parse(localStorage.getItem('playerData'));
      const teamData = JSON.parse(localStorage.getItem('teamData'));
      
      const isValid = await verifyPlayerData(playerData, teamData);
      
      if (isValid) {
        checkSessionStatus(playerData.id, teamData);
      } else {
        handleLogout();
      }
    };

    initializePlayer();
  }, [checkSessionStatus, verifyPlayerData]);

  useEffect(() => {
    const subscription = supabase
      .channel("quiz_sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quiz_sessions" },
        (payload) => {
          if (payload.new.status === "active" && player && team && payload.new.lab === team.lab) {
            checkSessionStatus(player.id, team);
          }
          if (payload.new.status === "scheduled" && team && payload.new.lab === team.lab) {
            setUpcomingSession(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [player, checkSessionStatus]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('playerData');
    localStorage.removeItem('teamData');
    router.push('/');
  }, [router]);

  if (!player || !team) {
    return <div key="loading" className="min-h-screen">Loading...</div>;
  }

  return (
    <PlayerWaiting
      player={player}
      team={team}
      upcomingSession={upcomingSession}
      message={message}
      onLogout={handleLogout}
    />
  );
}