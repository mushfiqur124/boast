import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trophy } from "lucide-react";

interface Activity {
  id: string;
  name: string;
  type: string;
  unit?: string;
  completed: boolean;
}

interface Team {
  id: string;
  name: string;
  captain: string;
  total_score: number;
}

interface Participant {
  id: string;
  name: string;
  team_id: string;
}

interface ScoringRules {
  teamWin: number;
  teamLoss: number;
  firstPlace: number;
  secondPlace: number;
  lastPlace: number;
}

interface TeamSummary {
  team_id: string;
  team_name: string;
  total_score: number;
  participants: { id: string; name: string; score: number }[];
  placement_bonus: number;
  individual_bonuses: { participant: string; bonus: number; reason: string }[];
  total_individual_bonuses: number;
  final_points: number;
}

const ScoreEntry = ({ 
  activity, 
  competitionId, 
  competitionCode,
  onClose, 
  onScoresUpdated 
}: { 
  activity: Activity;
  competitionId: string;
  competitionCode: string;
  onClose: () => void;
  onScoresUpdated: () => void;
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [teamScores, setTeamScores] = useState<Record<string, number>>({});
  const [individualScores, setIndividualScores] = useState<Record<string, number>>({});
  const [selectedWinnerTeam, setSelectedWinnerTeam] = useState<string>('');
  const [useCustomScores, setUseCustomScores] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scoringRules, setScoringRules] = useState<ScoringRules>({
    teamWin: 50,
    teamLoss: 0,
    firstPlace: 10,
    secondPlace: 5,
    lastPlace: -5
  });

  useEffect(() => {
    const initializeData = async () => {
      await loadScoringRules();
      await loadData();
    };
    initializeData();
  }, [competitionId, activity]);

  const loadScoringRules = async () => {
    try {
      const { data, error } = await supabase
        .from('scoring_rules')
        .select('*')
        .eq('competition_id', competitionId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        throw error;
      }

      if (data) {
        setScoringRules({
          teamWin: data.team_win_points,
          teamLoss: data.team_loss_points,
          firstPlace: data.first_place_bonus,
          secondPlace: data.second_place_bonus,
          lastPlace: data.last_place_penalty
        });
      }
    } catch (error) {
      console.error('Error loading scoring rules:', error);
      // Keep default values if loading fails
    }
  };

  const loadData = async () => {
    try {
      // Load teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('competition_id', competitionId);

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Load participants (including captains)
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .in('team_id', (teamsData || []).map(t => t.id));

      if (participantsError) throw participantsError;
      setParticipants(participantsData || []);

      // Load existing scores
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select('*')
        .eq('activity_id', activity.id);

      if (scoresError) throw scoresError;

      const existingTeamScores: Record<string, number> = {};
      const existingIndividualScores: Record<string, number> = {};
      let winnerTeam = '';
      
      scoresData?.forEach(score => {
        if (score.score_type === 'team' && score.team_id) {
          existingTeamScores[score.team_id] = score.value || 0;
          if (score.points_earned === scoringRules.teamWin) {
            winnerTeam = score.team_id;
          }
        } else if (score.score_type === 'individual' && score.participant_id) {
          existingIndividualScores[score.participant_id] = score.individual_score || 0;
        }
      });
      
      setTeamScores(existingTeamScores);
      setIndividualScores(existingIndividualScores);
      setSelectedWinnerTeam(winnerTeam);
      setUseCustomScores(Object.keys(existingTeamScores).length > 0 && !winnerTeam);

    } catch (error) {
      console.error('Error loading score entry data:', error);
      toast({
        title: "Error",
        description: "Failed to load score entry data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTeamScore = (teamId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setTeamScores(prev => ({ ...prev, [teamId]: numValue }));
  };

  const updateIndividualScore = (participantId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setIndividualScores(prev => ({ ...prev, [participantId]: numValue }));
  };

  const calculateTeamSummaries = (): TeamSummary[] => {
    if (activity.type !== 'individual') return [];

    const summaries: TeamSummary[] = teams.map(team => {
      const teamParticipants = participants.filter(p => p.team_id === team.id);
      const participantScores = teamParticipants.map(p => ({
        id: p.id,
        name: p.name,
        score: individualScores[p.id] || 0
      }));
      
      const total_score = participantScores.reduce((sum, p) => sum + p.score, 0);
      
      return {
        team_id: team.id,
        team_name: team.name,
        total_score,
        participants: participantScores,
        placement_bonus: 0,
        individual_bonuses: [],
        total_individual_bonuses: 0,
        final_points: 0
      };
    });

    // Check if any actual scores have been entered (non-zero values)
    const hasActualScores = summaries.some(s => s.total_score > 0);
    
    // Only calculate bonuses and rankings if actual scores exist
    if (!hasActualScores) {
      return summaries;
    }

    // Calculate team placement bonuses based on team totals
    const sortedByTotal = [...summaries].sort((a, b) => b.total_score - a.total_score);
    
    sortedByTotal.forEach((summary, index) => {
      if (index === 0 && sortedByTotal.length > 1) {
        summary.placement_bonus = scoringRules.teamWin; // 1st place team
      } else if (index === sortedByTotal.length - 1 && sortedByTotal.length > 1) {
        summary.placement_bonus = scoringRules.teamLoss; // Last place team
      } else {
        summary.placement_bonus = 0;
      }
    });

    // Calculate individual bonuses within each team
    const allParticipantScores = summaries.flatMap(s => 
      s.participants.map(p => ({ ...p, team_id: s.team_id, team_name: s.team_name }))
    ).sort((a, b) => b.score - a.score);

    // Create proper tie-aware rankings
    const participantRankings = [];
    let currentRank = 1;
    
    for (let i = 0; i < allParticipantScores.length; i++) {
      const participant = allParticipantScores[i];
      
      // If this isn't the first participant and their score is different from the previous one,
      // update the rank to account for ties
      if (i > 0 && allParticipantScores[i - 1].score !== participant.score) {
        currentRank = i + 1;
      }
      
      participantRankings.push({
        ...participant,
        rank: currentRank
      });
    }

    // Count how many participants have each unique score to determine effective placements
    const uniqueScores = [...new Set(allParticipantScores.map(p => p.score))].sort((a, b) => b - a);
    const scoreToEffectivePlacement = new Map();
    let currentPlacement = 1;
    
    uniqueScores.forEach(score => {
      scoreToEffectivePlacement.set(score, currentPlacement);
      const participantsWithThisScore = allParticipantScores.filter(p => p.score === score).length;
      currentPlacement += participantsWithThisScore;
    });

    summaries.forEach(summary => {
      const individualBonuses: { participant: string; bonus: number; reason: string }[] = [];
      
      summary.participants.forEach(participant => {
        const participantRanking = participantRankings.find(p => p.id === participant.id);
        
        if (!participantRanking) return;
        
        const rank = participantRanking.rank;
        const effectivePlacement = scoreToEffectivePlacement.get(participantRanking.score);
        const totalParticipants = allParticipantScores.length;
        
        // Award bonuses based on effective placement to handle ties properly
        if (effectivePlacement === 1 && totalParticipants > 1) {
          // First place bonus (handles ties for first)
          individualBonuses.push({
            participant: participant.name,
            bonus: scoringRules.firstPlace,
            reason: rank === 1 && allParticipantScores.filter(p => p.score === participantRanking.score).length > 1 
              ? "1st Place Overall (Tied)" 
              : "1st Place Overall"
          });
        } else if (effectivePlacement === 2 && totalParticipants > 2) {
          // Second place bonus (effectively second even if rank is 3 due to tie)
          individualBonuses.push({
            participant: participant.name,
            bonus: scoringRules.secondPlace,
            reason: "2nd Place Overall"
          });
        } else if (rank === totalParticipants && totalParticipants > 2) {
          // Last place penalty (only if there are more than 2 participants)
          individualBonuses.push({
            participant: participant.name,
            bonus: scoringRules.lastPlace,
            reason: "Last Place Overall"
          });
        }
      });
      
      summary.individual_bonuses = individualBonuses;
      summary.total_individual_bonuses = individualBonuses.reduce((sum, bonus) => sum + bonus.bonus, 0);
      summary.final_points = summary.placement_bonus + summary.total_individual_bonuses;
    });

    return summaries;
  };

  const saveScores = async () => {
    setSaving(true);
    try {
      // Delete existing scores for this activity
      await supabase
        .from('scores')
        .delete()
        .eq('activity_id', activity.id);

      const scoreInserts = [];

      if (activity.type === 'team') {
        // Team competition scoring
        if (useCustomScores) {
          // Custom scoring mode
          for (const [teamId, score] of Object.entries(teamScores)) {
            if (score > 0) {
              scoreInserts.push({
                activity_id: activity.id,
                team_id: teamId,
                participant_id: null,
                value: score,
                individual_score: null,
                score_type: 'team',
                points_earned: score
              });
            }
          }
        } else {
          // Win/lose mode
          if (selectedWinnerTeam) {
            teams.forEach(team => {
              const isWinner = team.id === selectedWinnerTeam;
              scoreInserts.push({
                activity_id: activity.id,
                team_id: team.id,
                participant_id: null,
                value: isWinner ? 1 : 0,
                individual_score: null,
                score_type: 'team',
                points_earned: isWinner ? scoringRules.teamWin : scoringRules.teamLoss
              });
            });
          }
        }
      } else {
        // Individual competition scoring
        const teamSummaries = calculateTeamSummaries();
        
        // Insert individual scores
        for (const [participantId, score] of Object.entries(individualScores)) {
          if (score > 0) {
            const participant = participants.find(p => p.id === participantId);
            scoreInserts.push({
              activity_id: activity.id,
              team_id: participant?.team_id || null,
              participant_id: participantId,
              value: null,
              individual_score: score,
              score_type: 'individual',
              points_earned: 0
            });
          }
        }
        
        // Insert team totals with points
        for (const summary of teamSummaries) {
          scoreInserts.push({
            activity_id: activity.id,
            team_id: summary.team_id,
            participant_id: null,
            value: summary.total_score,
            individual_score: null,
            score_type: 'team',
            points_earned: summary.final_points
          });
        }
      }

      if (scoreInserts.length > 0) {
        const { error: scoresError } = await supabase
          .from('scores')
          .insert(scoreInserts);

        if (scoresError) throw scoresError;
      }

      // Calculate winner based on activity type
      let winner = '';
      if (activity.type === 'team') {
        // For team activities, find team with highest points
        if (selectedWinnerTeam) {
          const winningTeam = teams.find(t => t.id === selectedWinnerTeam);
          winner = winningTeam?.name || '';
        }
      } else {
        // For individual activities, find team with highest total points
        const teamSummaries = calculateTeamSummaries();
        const sortedSummaries = teamSummaries.sort((a, b) => b.final_points - a.final_points);
        if (sortedSummaries.length > 0 && sortedSummaries[0].final_points > 0) {
          winner = sortedSummaries[0].team_name;
        }
      }

      // Mark activity as completed and store winner
      const { error: activityError } = await supabase
        .from('activities')
        .update({ 
          completed: true,
          winner: winner
        })
        .eq('id', activity.id);

      if (activityError) throw activityError;

      // Recalculate team totals from all scores (instead of incrementally adding)
      await recalculateAllTeamTotals();

      toast({
        title: "Scores Saved!",
        description: `Scores for ${activity.name} have been saved successfully`,
      });

      onScoresUpdated();
      onClose();

    } catch (error) {
      console.error('Error saving scores:', error);
      toast({
        title: "Error",
        description: "Failed to save scores",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  // Helper function to recalculate all team totals from scratch
  const recalculateAllTeamTotals = async () => {
    try {
      for (const team of teams) {
        // Calculate total score for this team from all scores
        const { data: teamScores, error: scoresError } = await supabase
          .from('scores')
          .select('points_earned')
          .eq('team_id', team.id);

        if (scoresError) throw scoresError;

        const totalScore = teamScores?.reduce((sum, score) => sum + score.points_earned, 0) || 0;

        // Update team total
        const { error: updateError } = await supabase
          .from('teams')
          .update({ total_score: totalScore })
          .eq('id', team.id);

        if (updateError) throw updateError;
      }
    } catch (error) {
      console.error('Error recalculating team totals:', error);
    }
  };

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center p-8">
            Loading...
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const teamSummaries = activity.type === 'individual' ? calculateTeamSummaries() : [];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enter Scores: {activity.name}</DialogTitle>
          <DialogDescription>
            <Badge variant={activity.type === 'team' ? 'default' : 'secondary'}>
              {activity.type === 'team' ? 'Team Competition' : 'Individual Scores'}
            </Badge>
            {activity.unit && (
              <Badge variant="outline" className="ml-2">
                Unit: {activity.unit}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {activity.type === 'team' ? (
            // Team scoring
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="custom-scores" 
                  checked={useCustomScores}
                  onCheckedChange={setUseCustomScores}
                />
                <Label htmlFor="custom-scores">Use custom scores instead of win/lose</Label>
              </div>

              {useCustomScores ? (
                // Custom scoring mode
                <div className="space-y-4">
                  {teams.map(team => (
                    <div key={team.id} className="flex items-center space-x-4">
                      <Label className="w-32 font-medium">{team.name}</Label>
                      <Input
                        type="number"
                        placeholder={`Enter ${activity.unit || 'score'}`}
                        value={teamScores[team.id] || ''}
                        onChange={(e) => updateTeamScore(team.id, e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                // Win/lose mode
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Select the winning team (Winner gets +{scoringRules.teamWin} points, Loser gets +{scoringRules.teamLoss} points)
                  </p>
                  <div className="grid gap-3">
                    {teams.map(team => (
                      <Button
                        key={team.id}
                        variant={selectedWinnerTeam === team.id ? "default" : "outline"}
                        onClick={() => setSelectedWinnerTeam(team.id)}
                        className="justify-start"
                      >
                        {team.name}
                        {selectedWinnerTeam === team.id && (
                          <Badge className="ml-2">Winner</Badge>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Individual scoring
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Individual Scores</h3>
                {teams.map(team => {
                  const teamParticipants = participants.filter(p => p.team_id === team.id);
                  return (
                    <Card key={team.id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">{team.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {teamParticipants.map(participant => (
                          <div key={participant.id} className="flex items-center space-x-3">
                            <Label className="w-24 text-sm">{participant.name}</Label>
                            <Input
                              type="number"
                              placeholder={activity.unit || 'score'}
                              value={individualScores[participant.id] || ''}
                              onChange={(e) => updateIndividualScore(participant.id, e.target.value)}
                              className="flex-1"
                            />
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Team Summaries & Points</h3>
                {teamSummaries.length > 0 && (
                  <div className="space-y-3">
                    {teamSummaries
                      .sort((a, b) => b.total_score - a.total_score)
                      .map((summary, index) => (
                        <Card key={summary.team_id} className="border-2">
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold">#{index + 1}</span>
                                <span className="font-medium">{summary.team_name}</span>
                              </div>
                              <Badge variant="outline" className="font-mono">
                                Total: {summary.total_score} {activity.unit}
                              </Badge>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Team Placement Bonus:</span>
                                <span className={summary.placement_bonus > 0 ? 'text-green-600 font-medium' : summary.placement_bonus < 0 ? 'text-red-600 font-medium' : ''}>
                                  {summary.placement_bonus > 0 ? '+' : ''}{summary.placement_bonus} pts
                                </span>
                              </div>
                              
                              <div className="space-y-1">
                                <div className="flex justify-between">
                                  <span>Individual Performance Bonuses:</span>
                                  <span className={summary.total_individual_bonuses > 0 ? 'text-green-600 font-medium' : summary.total_individual_bonuses < 0 ? 'text-red-600 font-medium' : ''}>
                                    {summary.total_individual_bonuses > 0 ? '+' : ''}{summary.total_individual_bonuses} pts
                                  </span>
                                </div>
                                {summary.individual_bonuses.map((bonus, idx) => (
                                  <div key={idx} className="text-xs text-gray-600 ml-4">
                                    • {bonus.participant}: {bonus.reason} ({bonus.bonus > 0 ? '+' : ''}{bonus.bonus} pts)
                                  </div>
                                ))}
                              </div>
                              
                              <Separator />
                              
                              <div className="flex justify-between font-medium">
                                <span>Final Points Earned:</span>
                                <span className={summary.final_points > 0 ? 'text-green-600' : summary.final_points < 0 ? 'text-red-600' : ''}>
                                  {summary.final_points > 0 ? '+' : ''}{summary.final_points} pts
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </div>

              {/* Individual Leaderboard & Podium */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center">
                  <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
                  Individual Leaderboard
                </h3>
                
                {(() => {
                  // Get all participants with scores, sorted by score descending
                  const allParticipantsWithScores = participants
                    .map(p => ({
                      ...p,
                      score: individualScores[p.id] || 0,
                      team_name: teams.find(t => t.id === p.team_id)?.name || 'Unknown'
                    }))
                    .filter(p => p.score > 0)
                    .sort((a, b) => b.score - a.score);

                  if (allParticipantsWithScores.length === 0) {
                    return (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center text-gray-500 py-8">
                            <Trophy className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                            <p>Enter scores to see the leaderboard!</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }

                  const topThree = allParticipantsWithScores.slice(0, 3);
                  const restOfParticipants = allParticipantsWithScores.slice(3);

                  return (
                    <div className="space-y-4">
                      {/* Podium */}
                      <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base text-center flex items-center justify-center">
                            
                            🏆 Podium
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-end justify-center space-x-4 mb-4">
                            {/* 2nd Place */}
                            {topThree[1] && (
                              <div className="text-center transform hover:scale-105 transition-transform w-20">
                                <div className="w-16 h-12 bg-gradient-to-t from-gray-300 to-gray-200 rounded-t-lg flex items-center justify-center mb-2 border-2 border-gray-400 mx-auto">
                                  <span className="text-white font-bold text-lg">2</span>
                                </div>
                                <div className="w-20 text-xs font-medium truncate" title={topThree[1].name}>{topThree[1].name}</div>
                                <div className="text-xs text-gray-600">{topThree[1].score} {activity.unit}</div>
                                <div className="text-xs text-blue-600 truncate" title={topThree[1].team_name}>({topThree[1].team_name})</div>
                              </div>
                            )}

                            {/* 1st Place */}
                            {topThree[0] && (
                              <div className="text-center transform hover:scale-105 transition-transform w-20">
                                <div className="w-16 h-16 bg-gradient-to-t from-yellow-400 to-yellow-300 rounded-t-lg flex items-center justify-center mb-2 border-2 border-yellow-500 shadow-lg mx-auto">
                                  <span className="text-white font-bold text-xl">1</span>
                                </div>
                                <div className="w-20 text-sm font-bold text-yellow-700 truncate" title={topThree[0].name}>{topThree[0].name}</div>
                                <div className="text-sm font-medium text-yellow-600">{topThree[0].score} {activity.unit}</div>
                                <div className="text-xs text-blue-600 truncate" title={topThree[0].team_name}>({topThree[0].team_name})</div>
                              </div>
                            )}

                            {/* 3rd Place */}
                            {topThree[2] && (
                              <div className="text-center transform hover:scale-105 transition-transform w-20">
                                <div className="w-16 h-10 bg-gradient-to-t from-amber-600 to-amber-500 rounded-t-lg flex items-center justify-center mb-2 border-2 border-amber-700 mx-auto">
                                  <span className="text-white font-bold">3</span>
                                </div>
                                <div className="w-20 text-xs font-medium truncate" title={topThree[2].name}>{topThree[2].name}</div>
                                <div className="text-xs text-gray-600">{topThree[2].score} {activity.unit}</div>
                                <div className="text-xs text-blue-600 truncate" title={topThree[2].team_name}>({topThree[2].team_name})</div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Rest of participants */}
                      {restOfParticipants.length > 0 && (
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Other Participants</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {restOfParticipants.map((participant, index) => (
                                <div key={participant.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                  <div className="flex items-center space-x-3">
                                    <span className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                                      {index + 4}
                                    </span>
                                    <div>
                                      <div className="text-sm font-medium">{participant.name}</div>
                                      <div className="text-xs text-blue-600">({participant.team_name})</div>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {participant.score} {activity.unit}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={saveScores} disabled={saving}>
            {saving ? 'Saving...' : 'Save Scores'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScoreEntry;
