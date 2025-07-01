
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
  total_score: number;
}

interface Participant {
  id: string;
  name: string;
  team_id: string;
}

interface Score {
  participant_id?: string;
  team_id?: string;
  value?: number;
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
  const [scores, setScores] = useState<Record<string, number>>({});
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

      // Load participants if individual activity
      if (activity.type === 'individual') {
        const { data: participantsData, error: participantsError } = await supabase
          .from('participants')
          .select('*')
          .in('team_id', (teamsData || []).map(t => t.id));

        if (participantsError) throw participantsError;
        setParticipants(participantsData || []);
      }

      // Load existing scores
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select('*')
        .eq('activity_id', activity.id);

      if (scoresError) throw scoresError;

      const existingScores: Record<string, number> = {};
      scoresData?.forEach(score => {
        const key = activity.type === 'team' 
          ? `team_${score.team_id}`
          : `participant_${score.participant_id}`;
        existingScores[key] = score.value || 0;
      });
      setScores(existingScores);

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

  const updateScore = (key: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setScores(prev => ({ ...prev, [key]: numValue }));
  };

  const calculatePoints = (scores: Record<string, number>, isTeamActivity: boolean) => {
    const entries = Object.entries(scores);
    if (entries.length === 0) return {};

    const points: Record<string, number> = {};

    if (isTeamActivity) {
      // For team activities, winner gets 50 points, loser gets 0
      const sortedEntries = entries.sort((a, b) => b[1] - a[1]);
      sortedEntries.forEach((entry, index) => {
        points[entry[0]] = index === 0 ? 50 : 0;
      });
    } else {
      // For individual activities, calculate bonuses
      const sortedEntries = entries.sort((a, b) => b[1] - a[1]);
      sortedEntries.forEach((entry, index) => {
        if (index === 0) points[entry[0]] = 10; // 1st place bonus
        else if (index === 1) points[entry[0]] = 5; // 2nd place bonus
        else if (index === sortedEntries.length - 1) points[entry[0]] = -5; // Last place penalty
        else points[entry[0]] = 0;
      });
    }

    return points;
  };

  const saveScores = async () => {
    setSaving(true);
    try {
      const points = calculatePoints(scores, activity.type === 'team');

      // Delete existing scores
      await supabase
        .from('scores')
        .delete()
        .eq('activity_id', activity.id);

      // Insert new scores
      const scoreInserts = Object.entries(scores).map(([key, value]) => {
        const isTeam = key.startsWith('team_');
        const id = key.split('_')[1];
        
        return {
          activity_id: activity.id,
          team_id: isTeam ? id : participants.find(p => p.id === id)?.team_id,
          participant_id: isTeam ? null : id,
          value: value,
          points_earned: points[key] || 0
        };
      });

      const { error: scoresError } = await supabase
        .from('scores')
        .insert(scoreInserts);

      if (scoresError) throw scoresError;

      // Update activity as completed
      const { error: activityError } = await supabase
        .from('activities')
        .update({ completed: true })
        .eq('id', activity.id);

      if (activityError) throw activityError;

      // Update team total scores
      const teamScoreUpdates: Record<string, number> = {};
      Object.entries(points).forEach(([key, pointsEarned]) => {
        if (key.startsWith('team_')) {
          const teamId = key.split('_')[1];
          teamScoreUpdates[teamId] = (teamScoreUpdates[teamId] || 0) + pointsEarned;
        } else {
          const participantId = key.split('_')[1];
          const participant = participants.find(p => p.id === participantId);
          if (participant) {
            teamScoreUpdates[participant.team_id] = (teamScoreUpdates[participant.team_id] || 0) + pointsEarned;
          }
        }
      });

      for (const [teamId, additionalPoints] of Object.entries(teamScoreUpdates)) {
        const currentTeam = teams.find(t => t.id === teamId);
        if (currentTeam) {
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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
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

        <div className="space-y-4 max-h-96 overflow-y-auto">
          {activity.type === 'team' ? (
            // Team scoring
            teams.map(team => (
              <div key={team.id} className="flex items-center space-x-4">
                <Label className="w-32 font-medium">{team.name}</Label>
                <Input
                  type="number"
                  placeholder={`Enter ${activity.unit || 'score'}`}
                  value={scores[`team_${team.id}`] || ''}
                  onChange={(e) => updateScore(`team_${team.id}`, e.target.value)}
                />
              </div>
            ))
          ) : (
            // Individual scoring
            participants.map(participant => {
              const team = teams.find(t => t.id === participant.team_id);
              return (
                <div key={participant.id} className="flex items-center space-x-4">
                  <div className="w-32">
                    <p className="font-medium">{participant.name}</p>
                    <p className="text-xs text-gray-500">{team?.name}</p>
                  </div>
                  <Input
                    type="number"
                    placeholder={`Enter ${activity.unit || 'score'}`}
                    value={scores[`participant_${participant.id}`] || ''}
                    onChange={(e) => updateScore(`participant_${participant.id}`, e.target.value)}
                  />
                </div>
              );
            })
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
