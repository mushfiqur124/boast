import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Crown, Star, Medal, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import confetti from 'canvas-confetti';

interface Team {
  id: string;
  name: string;
  captain: string;
  total_score: number;
  participants: Array<{
    id: string;
    name: string;
  }>;
}

interface Activity {
  id: string;
  name: string;
  type: string;
  unit: string | null;
  winner: string | null;
  completed: boolean;
}

interface ActivityWinner {
  activity: Activity;
  winnerTeam?: Team;
  scores: Array<{
    team_id: string | null;
    participant_id: string | null;
    participant_name?: string;
    team_name?: string;
    score: number;
    points_earned: number;
  }>;
}

interface IndividualResult {
  participant_id: string;
  participant_name: string;
  team_name: string;
  team_id: string;
  score: number;
  rank: number;
}

interface MVPResult {
  participant_id: string;
  participant_name: string;
  team_name: string;
  team_id: string;
  average_rank: number;
  activity_ranks: Array<{
    activity_name: string;
    rank: number;
    score: number;
  }>;
}

const CompetitionResults = ({ competitionCode, competitionId }: { competitionCode: string, competitionId: string }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityWinners, setActivityWinners] = useState<ActivityWinner[]>([]);
  const [individualResults, setIndividualResults] = useState<Record<string, IndividualResult[]>>({});
  const [mvpResult, setMvpResult] = useState<MVPResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWinner, setShowWinner] = useState(false);
  const [drumRolling, setDrumRolling] = useState(true);

  useEffect(() => {
    loadResultsData();
  }, [competitionId]);

  useEffect(() => {
    // Start with drum roll, then reveal winner
    const drumrollTimer = setTimeout(() => {
      setDrumRolling(false);
      setShowWinner(true);
      triggerWinnerConfetti();
    }, 3000);

    return () => clearTimeout(drumrollTimer);
  }, []);

  const triggerWinnerConfetti = () => {
    // Epic winner confetti - even more spectacular than draft completion
    const duration = 5000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 40, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    // Massive confetti explosion
    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 150 * (timeLeft / duration);
      
      // Multiple simultaneous bursts
      confetti(Object.assign({}, defaults, { 
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#4169E1', '#8A2BE2', '#FF1493']
      }));
      confetti(Object.assign({}, defaults, { 
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#4169E1', '#8A2BE2', '#FF1493']
      }));
      confetti(Object.assign({}, defaults, { 
        particleCount: particleCount * 0.8,
        origin: { x: 0.5, y: Math.random() - 0.1 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#4169E1', '#8A2BE2', '#FF1493']
      }));
      confetti(Object.assign({}, defaults, { 
        particleCount: particleCount * 0.6,
        origin: { x: randomInRange(0.4, 0.6), y: Math.random() - 0.3 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#4169E1', '#8A2BE2', '#FF1493']
      }));
    }, 200);
  };

  const loadResultsData = async () => {
    try {
      // Load teams with participants
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          participants (*)
        `)
        .eq('competition_id', competitionId)
        .order('total_score', { ascending: false });

      if (teamsError) throw teamsError;

      const formattedTeams = teamsData.map(team => ({
        id: team.id,
        name: team.name,
        captain: team.captain,
        total_score: team.total_score,
        participants: team.participants || []
      }));

      setTeams(formattedTeams);

      // Load activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('competition_id', competitionId);

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

      // Load all scores to determine winners
      await loadActivityWinners(activitiesData || [], formattedTeams);
      await loadIndividualResults(activitiesData || [], formattedTeams);

    } catch (error) {
      console.error('Error loading results data:', error);
      toast({
        title: "Error",
        description: "Failed to load competition results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadActivityWinners = async (activities: Activity[], teams: Team[]) => {
    const winners: ActivityWinner[] = [];

    for (const activity of activities) {
      const { data: scoresData, error } = await supabase
        .from('scores')
        .select('*')
        .eq('activity_id', activity.id)
        .eq('score_type', 'team');

      if (error) continue;

      const scores = scoresData?.map(score => ({
        team_id: score.team_id,
        participant_id: score.participant_id,
        score: score.value || 0,
        points_earned: score.points_earned,
        team_name: teams.find(t => t.id === score.team_id)?.name || ''
      })) || [];

      // Find winning team (highest points earned)
      const winningScore = scores.reduce((max, score) => 
        score.points_earned > max.points_earned ? score : max, 
        { points_earned: -1000, team_id: null }
      );

      const winnerTeam = teams.find(t => t.id === winningScore.team_id);

      winners.push({
        activity,
        winnerTeam,
        scores
      });
    }

    setActivityWinners(winners);
  };

  const loadIndividualResults = async (activities: Activity[], teams: Team[]) => {
    const results: Record<string, IndividualResult[]> = {};

    for (const activity of activities.filter(a => a.type === 'individual')) {
      const { data: scoresData, error } = await supabase
        .from('scores')
        .select('*')
        .eq('activity_id', activity.id)
        .eq('score_type', 'individual');

      if (error) continue;

      const participantScores = scoresData?.map(score => {
        const participant = teams.flatMap(t => t.participants).find(p => p.id === score.participant_id);
        const team = teams.find(t => t.participants.some(p => p.id === score.participant_id));
        
        return {
          participant_id: score.participant_id || '',
          participant_name: participant?.name || '',
          team_name: team?.name || '',
          team_id: team?.id || '',
          score: score.individual_score || 0,
          rank: 0
        };
      }) || [];

      // Sort by score (descending) and assign proper tie-aware ranks
      participantScores.sort((a, b) => b.score - a.score);
      
      let currentRank = 1;
      for (let i = 0; i < participantScores.length; i++) {
        const result = participantScores[i];
        
        // If this isn't the first participant and their score is different from the previous one,
        // update the rank to account for ties
        if (i > 0 && participantScores[i - 1].score !== result.score) {
          currentRank = i + 1;
        }
        
        result.rank = currentRank;
      }

      results[activity.id] = participantScores;
    }

    setIndividualResults(results);
    
    // Calculate MVP after loading individual results
    calculateMVP(results, activities);
  };

  const calculateMVP = (individualResults: Record<string, IndividualResult[]>, activities: Activity[]) => {
    // Get only individual activities that have results
    const individualActivities = activities.filter(a => a.type === 'individual' && individualResults[a.id]);
    
    if (individualActivities.length === 0) {
      setMvpResult(null);
      return;
    }

    // Create a map to track each participant's ranks across activities
    const participantRanks: Record<string, {
      participant_name: string;
      team_name: string;
      team_id: string;
      ranks: Array<{ activity_name: string; rank: number; score: number; }>;
    }> = {};

    // Collect ranks for each participant across all individual activities
    individualActivities.forEach(activity => {
      const results = individualResults[activity.id] || [];
      results.forEach(result => {
        if (!participantRanks[result.participant_id]) {
          participantRanks[result.participant_id] = {
            participant_name: result.participant_name,
            team_name: result.team_name,
            team_id: result.team_id,
            ranks: []
          };
        }
        participantRanks[result.participant_id].ranks.push({
          activity_name: activity.name,
          rank: result.rank,
          score: result.score
        });
      });
    });

    // Calculate MVP (participant with lowest average rank, but only if they participated in all activities)
    let mvp: MVPResult | null = null;
    let bestAverageRank = Infinity;

    Object.entries(participantRanks).forEach(([participantId, data]) => {
      // Only consider participants who participated in all individual activities
      if (data.ranks.length === individualActivities.length) {
        const averageRank = data.ranks.reduce((sum, r) => sum + r.rank, 0) / data.ranks.length;
        
        if (averageRank < bestAverageRank) {
          bestAverageRank = averageRank;
          mvp = {
            participant_id: participantId,
            participant_name: data.participant_name,
            team_name: data.team_name,
            team_id: data.team_id,
            average_rank: averageRank,
            activity_ranks: data.ranks
          };
        }
      }
    });

    setMvpResult(mvp);
  };

  const winningTeam = teams[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 p-6">
      <div className="container mx-auto space-y-8">
        {/* Winner Announcement */}
        <div className="text-center mb-12">
          {drumRolling && (
            <div className="space-y-6">
              <div className="animate-bounce">
                <Sparkles className="h-16 w-16 text-yellow-500 mx-auto animate-pulse" />
              </div>
              <h1 className="text-4xl font-bold text-gray-800 animate-pulse">
                🥁 Calculating Winner... 🥁
              </h1>
              <p className="text-xl text-gray-600">The moment of truth approaches...</p>
            </div>
          )}

          {showWinner && winningTeam && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-center mb-4">
                <Trophy className="h-20 w-20 text-yellow-500 drop-shadow-lg animate-bounce" />
              </div>
              <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500 drop-shadow-lg">
                🎉 {winningTeam.name} WINS! 🎉
              </h1>
              <p className="text-2xl text-gray-700 font-semibold">
                Total Score: {winningTeam.total_score} points
              </p>
              <div className="flex items-center justify-center space-x-2">
                <Crown className="h-6 w-6 text-yellow-500" />
                <p className="text-lg text-gray-600">
                  Captain: {winningTeam.captain}
                </p>
              </div>
            </div>
          )}
        </div>

        {showWinner && (
          <>
            {/* MVP Section */}
            {mvpResult && (
              <Card className="border-purple-200 bg-purple-50">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-center flex items-center justify-center">
                    <Star className="h-8 w-8 mr-3 text-purple-500" />
                    Most Valuable Player (MVP)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-bold text-purple-800">{mvpResult.participant_name}</h3>
                      <p className="text-lg text-purple-600">{mvpResult.team_name}</p>
                      <p className="text-sm text-gray-600">
                        Average Rank: {mvpResult.average_rank.toFixed(2)}
                      </p>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border border-purple-200">
                      <h4 className="font-semibold mb-3 text-purple-800">Individual Activity Performance</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {mvpResult.activity_ranks.map((activity, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{activity.activity_name}</p>
                              <p className="text-xs text-gray-600">Score: {activity.score}</p>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`ml-2 ${
                                activity.rank === 1 ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                                activity.rank === 2 ? 'bg-gray-100 text-gray-800 border-gray-300' :
                                activity.rank === 3 ? 'bg-orange-100 text-orange-800 border-orange-300' :
                                'bg-blue-100 text-blue-800 border-blue-300'
                              }`}
                            >
                              #{activity.rank}
                              {activity.rank === 1 && ' 🥇'}
                              {activity.rank === 2 && ' 🥈'}
                              {activity.rank === 3 && ' 🥉'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Team Standings */}
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-center flex items-center justify-center">
                  <Medal className="h-8 w-8 mr-3 text-yellow-500" />
                  Final Standings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {teams.map((team, index) => (
                    <div 
                      key={team.id} 
                      className={`p-6 rounded-lg border-2 ${
                        index === 0 
                          ? 'border-yellow-400 bg-yellow-100 shadow-lg' 
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          {index === 0 ? (
                            <Trophy className="h-8 w-8 text-yellow-500 mr-3" />
                          ) : (
                            <Medal className="h-8 w-8 text-gray-400 mr-3" />
                          )}
                          <div>
                            <h3 className="text-xl font-bold">{team.name}</h3>
                            <p className="text-sm text-gray-600">Captain: {team.captain}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-blue-600">{team.total_score}</p>
                          <p className="text-sm text-gray-500">points</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="font-medium text-gray-700">Team Members:</p>
                        <div className="flex flex-wrap gap-2">
                          {team.participants.map(participant => (
                            <Badge 
                              key={participant.id} 
                              variant={participant.name === team.captain ? "default" : "secondary"}
                              className={participant.name === team.captain ? "bg-yellow-500" : ""}
                            >
                              {participant.name === team.captain && <Crown className="h-3 w-3 mr-1" />}
                              {participant.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Activity Winners */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-center flex items-center justify-center">
                  <Star className="h-8 w-8 mr-3 text-blue-500" />
                  Activity Winners
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activityWinners.map(({ activity, winnerTeam }) => (
                    <div key={activity.id} className="p-4 border rounded-lg bg-white">
                      <h4 className="font-bold text-lg mb-2">{activity.name}</h4>
                      {winnerTeam ? (
                        <div className="flex items-center">
                          <Trophy className="h-5 w-5 text-yellow-500 mr-2" />
                          <span className="font-medium text-green-600">{winnerTeam.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500">No winner recorded</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Individual Podiums */}
            {Object.keys(individualResults).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-center flex items-center justify-center">
                    <Medal className="h-8 w-8 mr-3 text-purple-500" />
                    Individual Champions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    {Object.entries(individualResults).map(([activityId, results]) => {
                      const activity = activities.find(a => a.id === activityId);
                      if (!activity || results.length === 0) return null;

                      return (
                        <div key={activityId} className="space-y-4">
                          <h3 className="text-xl font-bold text-center">{activity.name} Podium</h3>
                          <div className="flex justify-center items-end space-x-2 flex-wrap">
                            {/* Group participants by rank for proper tie display */}
                            {[1, 2, 3].map(rank => {
                              const playersAtRank = results.filter(r => r.rank === rank);
                              if (playersAtRank.length === 0) return null;

                              return playersAtRank.map((result) => (
                                <div key={result.participant_id} className="text-center w-28 mb-2">
                                  <div className={`w-28 rounded-t-lg flex items-end justify-center pb-2 ${
                                    rank === 1 ? 'bg-yellow-400 h-28' :
                                    rank === 2 ? 'bg-gray-300 h-20' :
                                    'bg-orange-400 h-16'
                                  }`}>
                                    <span className={`${
                                      rank === 1 ? 'text-3xl' :
                                      rank === 2 ? 'text-2xl' :
                                      'text-xl'
                                    }`}>
                                      {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                                    </span>
                                  </div>
                                  <div className={`p-3 rounded-b-lg w-28 ${
                                    rank === 1 ? 'bg-yellow-100' :
                                    rank === 2 ? 'bg-gray-100' :
                                    'bg-orange-100'
                                  }`}>
                                    <p className="font-bold text-sm truncate" title={result.participant_name}>
                                      {result.participant_name}
                                    </p>
                                    <p className="text-xs text-gray-600 truncate" title={result.team_name}>
                                      {result.team_name}
                                    </p>
                                    <p className={`text-lg font-bold ${
                                      rank === 1 ? 'text-yellow-700' :
                                      rank === 2 ? 'text-gray-700' :
                                      'text-orange-700'
                                    }`}>
                                      {result.score}
                                    </p>
                                  </div>
                                </div>
                              ));
                            })}
                          </div>

                          {/* Additional participants */}
                          {results.filter(r => r.rank > 3).length > 0 && (
                            <div className="mt-4">
                              <h4 className="font-semibold mb-2 text-center">All Participants</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {results.filter(r => r.rank > 3).map(result => (
                                  <div key={result.participant_id} className="text-center p-2 bg-gray-50 rounded">
                                    <p className="font-medium text-sm">{result.rank}. {result.participant_name}</p>
                                    <p className="text-xs text-gray-600">{result.team_name}</p>
                                    <p className="text-sm font-bold">{result.score}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CompetitionResults; 