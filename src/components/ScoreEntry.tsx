
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trophy, Users, Save, X } from "lucide-react";

interface Activity {
  id: string;
  name: string;
  type: 'team' | 'individual';
  unit?: string;
  completed: boolean;
}

interface Team {
  id: string;
  name: string;
  captain: string;
}

interface Participant {
  id: string;
  name: string;
  team_id: string;
}

interface ScoreData {
  participant_id?: string;
  team_id?: string;
  value: number;
}

interface ScoreEntryProps {
  activity: Activity;
  isOpen: boolean;
  onClose: () => void;
  competitionId: string;
  onScoresSaved: () => void;
}

const ScoreEntry = ({ activity, isOpen, onClose, competitionId, onScoresSaved }: ScoreEntryProps) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [scores, setScores] = useState<ScoreData[]>([]);
  const [winningTeam, setWinningTeam] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [scoringRules, setScoringRules] = useState({
    teamWin: 50,
    teamLoss: 0,
    firstPlace: 10,
    secondPlace: 5,
    lastPlace: -5
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
      loadScoringRules();
    }
  }, [isOpen, competitionId]);

  const loadData = async () => {
    try {
      // Load teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('competition_id', competitionId);

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Load participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .in('team_id', (teamsData || []).map(t => t.id));

      if (participantsError) throw participantsError;
      setParticipants(participantsData || []);

      // Initialize scores array
      if (activity.type === 'individual') {
        setScores((participantsData || []).map(p => ({
          participant_id: p.id,
          team_id: p.team_id,
          value: 0
        })));
      }

      // Load existing scores if any
      const { data: existingScores } = await supabase
        .from('scores')
        .select('*')
        .eq('activity_id', activity.id);

      if (existingScores && existingScores.length > 0) {
        if (activity.type === 'team') {
          const winnerScore = existingScores.find(s => s.points_earned > 0);
          if (winnerScore) {
            setWinningTeam(winnerScore.team_id);
          }
        } else {
          const scoreMap = existingScores.reduce((acc, score) => {
            if (score.participant_id) {
              acc[score.participant_id] = score.value;
            }
            return acc;
          }, {} as Record<string, number>);

          setScores(scores => scores.map(s => ({
            ...s,
            value: scoreMap[s.participant_id!] || 0
          })));
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load competition data",
        variant: "destructive"
      });
    }
  };

  const loadScoringRules = async () => {
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', competitionId)
        .single();

      if (error) throw error;

      // For now, use default scoring rules
      // In the future, we could store custom scoring rules in the database
    } catch (error) {
      console.error('Error loading scoring rules:', error);
    }
  };

  const updateScore = (participantId: string, value: number) => {
    setScores(prev => prev.map(s => 
      s.participant_id === participantId ? { ...s, value } : s
    ));
  };

  const calculatePoints = () => {
    if (activity.type === 'team') {
      return teams.map(team => ({
        team_id: team.id,
        points: team.id === winningTeam ? scoringRules.teamWin : scoringRules.teamLoss
      }));
    } else {
      // Individual scoring
      const sortedScores = [...scores].sort((a, b) => b.value - a.value);
      const teamTotals = teams.map(team => {
        const teamParticipants = participants.filter(p => p.team_id === team.id);
        const teamScore = teamParticipants.reduce((sum, p) => {
          const score = scores.find(s => s.participant_id === p.id);
          return sum + (score?.value || 0);
        }, 0);
        return { team_id: team.id, total: teamScore };
      });

      const sortedTeams = teamTotals.sort((a, b) => b.total - a.total);
      const winningTeamId = sortedTeams[0]?.team_id;

      return scores.map((score, index) => {
        let bonusPoints = 0;
        const sortedIndex = sortedScores.findIndex(s => s.participant_id === score.participant_id);
        
        if (sortedIndex === 0) bonusPoints = scoringRules.firstPlace;
        else if (sortedIndex === 1) bonusPoints = scoringRules.secondPlace;
        else if (sortedIndex === sortedScores.length - 1) bonusPoints = scoringRules.lastPlace;

        const basePoints = score.team_id === winningTeamId ? scoringRules.teamWin : scoringRules.teamLoss;
        
        return {
          participant_id: score.participant_id,
          team_id: score.team_id,
          points: basePoints + bonusPoints
        };
      });
    }
  };

  const saveScores = async () => {
    setLoading(true);
    try {
      // Delete existing scores
      await supabase
        .from('scores')
        .delete()
        .eq('activity_id', activity.id);

      const pointsData = calculatePoints();

      if (activity.type === 'team') {
        // Save team scores
        const teamScores = pointsData.map(p => ({
          activity_id: activity.id,
          team_id: p.team_id,
          points_earned: p.points,
          value: p.team_id === winningTeam ? 1 : 0
        }));

        const { error } = await supabase
          .from('scores')
          .insert(teamScores);

        if (error) throw error;
      } else {
        // Save individual scores
        const individualScores = scores.map(score => {
          const pointData = pointsData.find(p => p.participant_id === score.participant_id);
          return {
            activity_id: activity.id,
            participant_id: score.participant_id,
            team_id: score.team_id,
            value: score.value,
            points_earned: pointData?.points || 0
          };
        });

        const { error } = await supabase
          .from('scores')
          .insert(individualScores);

        if (error) throw error;
      }

      // Update activity as completed
      await supabase
        .from('activities')
        .update({ completed: true })
        .eq('id', activity.id);

      // Update team totals
      for (const team of teams) {
        const teamPoints = pointsData
          .filter(p => p.team_id === team.id)
          .reduce((sum, p) => sum + p.points, 0);

        const { data: currentTeam } = await supabase
          .from('teams')
          .select('total_score')
          .eq('id', team.id)
          .single();

        if (currentTeam) {
          await supabase
            .from('teams')
            .update({ total_score: currentTeam.total_score + teamPoints })
            .eq('id', team.id);
        }
      }

      toast({
        title: "🎉 Scores Saved!",
        description: "Activity completed and points awarded",
      });

      onScoresSaved();
      onClose();
    } catch (error) {
      console.error('Error saving scores:', error);
      toast({
        title: "Error",
        description: "Failed to save scores",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getTeamName = (teamId: string) => {
    return teams.find(t => t.id === teamId)?.name || 'Unknown Team';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center text-xl">
            {activity.type === 'team' ? <Users className="h-5 w-5 mr-2" /> : <Trophy className="h-5 w-5 mr-2" />}
            📊 Enter Scores: {activity.name}
            <Badge variant="outline" className="ml-2">
              {activity.type === 'team' ? 'Team Competition' : 'Individual Scores'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {activity.type === 'team' ? (
            // Team Competition
            <Card>
              <CardHeader>
                <CardTitle>🏆 Select Winning Team</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={winningTeam} onValueChange={setWinningTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose the winning team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} (Captain: {team.captain})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          ) : (
            // Individual Competition
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">🏃‍♂️ Individual Scores</h3>
              <div className="grid gap-4">
                {teams.map(team => (
                  <Card key={team.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{team.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-3">
                        {participants
                          .filter(p => p.team_id === team.id)
                          .map(participant => (
                            <div key={participant.id} className="flex items-center space-x-2">
                              <Label className="min-w-[120px] text-sm">
                                {participant.name}
                              </Label>
                              <Input
                                type="number"
                                placeholder="0"
                                value={scores.find(s => s.participant_id === participant.id)?.value || ''}
                                onChange={(e) => updateScore(participant.id, parseFloat(e.target.value) || 0)}
                                className="w-24"
                              />
                              {activity.unit && (
                                <span className="text-sm text-gray-500">{activity.unit}</span>
                              )}
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={saveScores} 
              disabled={loading || (activity.type === 'team' && !winningTeam)}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Saving..." : "💾 Save Scores"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScoreEntry;
