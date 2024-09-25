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

  const checkSessionStatus = useCallback(async (playerId) => {
    const { data: sessionData, error } = await supabase
      .from("quiz_sessions")
      .select("*")
      .eq("status", "active")
      .order("start_time", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No active session, check for upcoming
        await checkForUpcomingSession();
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

  const checkForUpcomingSession = async () => {
    const { data, error } = await supabase
      .from("quiz_sessions")
      .select("*")
      .eq("status", "scheduled")
      .order("start_time", { ascending: true })
      .limit(1)
      .single();

    if (error) {
      console.error("[WAITING] Error checking for upcoming session:", error);
    } else if (data) {
      setUpcomingSession(data);
    }
  };

  useEffect(() => {
    const playerData = JSON.parse(localStorage.getItem('playerData'));
    const teamData = JSON.parse(localStorage.getItem('teamData'));
    if (playerData && teamData) {
      setPlayer(playerData);
      setTeam(teamData);
      checkSessionStatus(playerData.id);
    } else {
      router.push('/');
    }
  }, [checkSessionStatus, router]);

  useEffect(() => {
    const subscription = supabase
      .channel("quiz_sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "quiz_sessions" },
        (payload) => {
          if (payload.new.status === "active" && player) {
            checkSessionStatus(player.id);
          }
          if (payload.new.status === "scheduled") {
            setUpcomingSession(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [player, checkSessionStatus]);

  const handleLogout = () => {
    localStorage.removeItem('playerData');
    localStorage.removeItem('teamData');
    router.push('/');
  };

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