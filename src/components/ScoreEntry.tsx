
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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

interface IndividualScore {
  participant_id: string;
  score: number;
}

interface TeamSummary {
  team_id: string;
  team_name: string;
  total_score: number;
  participants: { id: string; name: string; score: number }[];
  bonus_points: number;
  final_points: number;
}

const ScoreEntry = ({ 
  activity, 
  competitionId, 
  onClose, 
  onScoresUpdated 
}: { 
  activity: Activity;
  competitionId: string;
  onClose: () => void;
  onScoresUpdated: () => void;
}) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [teamScores, setTeamScores] = useState<Record<string, number>>({});
  const [individualScores, setIndividualScores] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [competitionId, activity]);

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

      // Load existing scores
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select('*')
        .eq('activity_id', activity.id);

      if (scoresError) throw scoresError;

      const existingTeamScores: Record<string, number> = {};
      const existingIndividualScores: Record<string, number> = {};
      
      scoresData?.forEach(score => {
        if (score.score_type === 'team' && score.team_id) {
          existingTeamScores[score.team_id] = score.value || 0;
        } else if (score.score_type === 'individual' && score.participant_id) {
          existingIndividualScores[score.participant_id] = score.individual_score || 0;
        }
      });
      
      setTeamScores(existingTeamScores);
      setIndividualScores(existingIndividualScores);

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
        bonus_points: 0,
        final_points: 0
      };
    });

    // Calculate bonuses based on team totals
    const sortedByTotal = [...summaries].sort((a, b) => b.total_score - a.total_score);
    
    sortedByTotal.forEach((summary, index) => {
      if (index === 0) summary.bonus_points = 50; // 1st place
      else if (index === 1) summary.bonus_points = 25; // 2nd place
      else if (index === sortedByTotal.length - 1) summary.bonus_points = -10; // Last place
      else summary.bonus_points = 0;
      
      // Calculate individual bonuses within each team
      const sortedParticipants = [...summary.participants].sort((a, b) => b.score - a.score);
      let individualBonuses = 0;
      
      sortedParticipants.forEach((participant, pIndex) => {
        if (pIndex === 0 && sortedParticipants.length > 1) individualBonuses += 10; // Team's best performer
        else if (pIndex === 1 && sortedParticipants.length > 2) individualBonuses += 5; // Team's 2nd best
        else if (pIndex === sortedParticipants.length - 1 && sortedParticipants.length > 2) individualBonuses -= 5; // Team's worst
      });
      
      summary.final_points = summary.bonus_points + individualBonuses;
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
        const sortedTeams = Object.entries(teamScores).sort((a, b) => b[1] - a[1]);
        
        for (const [teamId, score] of sortedTeams) {
          const points = sortedTeams.findIndex(([id]) => id === teamId) === 0 ? 50 : 0;
          scoreInserts.push({
            activity_id: activity.id,
            team_id: teamId,
            participant_id: null,
            value: score,
            individual_score: null,
            score_type: 'team',
            points_earned: points
          });
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

      // Mark activity as completed
      const { error: activityError } = await supabase
        .from('activities')
        .update({ completed: true })
        .eq('id', activity.id);

      if (activityError) throw activityError;

      // Update team total scores
      const teamUpdates: Record<string, number> = {};
      
      if (activity.type === 'team') {
        const sortedTeams = Object.entries(teamScores).sort((a, b) => b[1] - a[1]);
        const winnerTeamId = sortedTeams[0]?.[0];
        if (winnerTeamId) teamUpdates[winnerTeamId] = 50;
      } else {
        const teamSummaries = calculateTeamSummaries();
        teamSummaries.forEach(summary => {
          teamUpdates[summary.team_id] = summary.final_points;
        });
      }

      for (const [teamId, additionalPoints] of Object.entries(teamUpdates)) {
        const currentTeam = teams.find(t => t.id === teamId);
        if (currentTeam && additionalPoints !== 0) {
          await supabase
            .from('teams')
            .update({ total_score: currentTeam.total_score + additionalPoints })
            .eq('id', teamId);
        }
      }

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
            // Individual scoring
            <div className="grid md:grid-cols-2 gap-6">
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
                                <span className={summary.bonus_points > 0 ? 'text-green-600 font-medium' : summary.bonus_points < 0 ? 'text-red-600 font-medium' : ''}>
                                  {summary.bonus_points > 0 ? '+' : ''}{summary.bonus_points} pts
                                </span>
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
