
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, Save, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ScoringRules {
  teamWin: number;
  teamLoss: number;
  firstPlace: number;
  secondPlace: number;
  lastPlace: number;
}

const Scoring = ({ competitionCode, competitionId }: { competitionCode: string, competitionId: string }) => {
  const [scoringRules, setScoringRules] = useState<ScoringRules>({
    teamWin: 50,
    teamLoss: 0,
    firstPlace: 10,
    secondPlace: 5,
    lastPlace: -5
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    loadScoringRules();
  }, [competitionId]);

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
      } else {
        // No scoring rules found, create default ones
        await createDefaultScoringRules();
      }
    } catch (error) {
      console.error('Error loading scoring rules:', error);
      toast({
        title: "Error",
        description: "Failed to load scoring rules. Using defaults.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createDefaultScoringRules = async () => {
    try {
      const { error } = await supabase
        .from('scoring_rules')
        .insert({
          competition_id: competitionId,
          team_win_points: scoringRules.teamWin,
          team_loss_points: scoringRules.teamLoss,
          first_place_bonus: scoringRules.firstPlace,
          second_place_bonus: scoringRules.secondPlace,
          last_place_penalty: scoringRules.lastPlace
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating default scoring rules:', error);
    }
  };

  const updateRule = (key: keyof ScoringRules, value: string) => {
    const numValue = parseInt(value) || 0;
    setScoringRules(prev => ({ ...prev, [key]: numValue }));
    setHasChanges(true);
  };

  const recalculateExistingScores = async (newRules: ScoringRules) => {
    setRecalculating(true);
    try {
      // Get all completed activities and their scores
      const { data: activities, error: activitiesError } = await supabase
        .from('activities')
        .select('id, type')
        .eq('competition_id', competitionId)
        .eq('completed', true);

      if (activitiesError) throw activitiesError;

      if (!activities || activities.length === 0) {
        toast({
          title: "No scores to recalculate",
          description: "No completed activities found.",
        });
        return;
      }

      // For each activity, recalculate scores
      for (const activity of activities) {
        if (activity.type === 'team') {
          // Update team competition scores
          const { data: teamScores, error: teamScoresError } = await supabase
            .from('scores')
            .select('id, value, team_id')
            .eq('activity_id', activity.id)
            .eq('score_type', 'team')
            .not('team_id', 'is', null);

          if (teamScoresError) throw teamScoresError;

                     if (teamScores) {
             for (const score of teamScores) {
               const isWinner = (typeof score.value === 'number' && score.value === 1) || 
                                (typeof score.value === 'string' && score.value === '1');
               const newPoints = isWinner ? newRules.teamWin : newRules.teamLoss;
               
               const { error: updateError } = await supabase
                 .from('scores')
                 .update({ points_earned: newPoints })
                 .eq('id', score.id);

               if (updateError) throw updateError;
             }
           }
        } else if (activity.type === 'individual') {
          // Update individual competition scores
          const { data: individualScores, error: individualScoresError } = await supabase
            .from('scores')
            .select('id, value, score_type, team_id, participant_id')
            .eq('activity_id', activity.id);

          if (individualScoresError) throw individualScoresError;

          if (individualScores) {
                         // First, update team scores (win/loss)
             const teamScores = individualScores.filter(s => s.score_type === 'team' && s.team_id);
             for (const score of teamScores) {
               const isWinner = (typeof score.value === 'number' && score.value === 1) || 
                                (typeof score.value === 'string' && score.value === '1');
               const newPoints = isWinner ? newRules.teamWin : newRules.teamLoss;
              
              const { error: updateError } = await supabase
                .from('scores')
                .update({ points_earned: newPoints })
                .eq('id', score.id);

              if (updateError) throw updateError;
            }

            // Then, update individual bonus scores
            const bonusScores = individualScores.filter(s => s.score_type === 'individual' && s.participant_id);
            
            // Sort by individual_score to determine rankings
            const sortedBonusScores = bonusScores.sort((a, b) => {
              const aScore = parseFloat(String(a.value || '0'));
              const bScore = parseFloat(String(b.value || '0'));
              return bScore - aScore; // Higher scores first
            });

            // Calculate effective placements to handle ties properly
            const uniqueScores = [...new Set(sortedBonusScores.map(s => parseFloat(String(s.value || '0'))))].sort((a, b) => b - a);
            const scoreToEffectivePlacement = new Map();
            let currentPlacement = 1;
            
            uniqueScores.forEach(score => {
              scoreToEffectivePlacement.set(score, currentPlacement);
              const participantsWithThisScore = sortedBonusScores.filter(s => parseFloat(String(s.value || '0')) === score).length;
              currentPlacement += participantsWithThisScore;
            });

            for (let i = 0; i < sortedBonusScores.length; i++) {
              const score = sortedBonusScores[i];
              const scoreValue = parseFloat(String(score.value || '0'));
              const effectivePlacement = scoreToEffectivePlacement.get(scoreValue);
              const totalParticipants = sortedBonusScores.length;
              let bonusPoints = 0;

              if (effectivePlacement === 1 && totalParticipants > 1) {
                bonusPoints = newRules.firstPlace; // First place (handles ties)
              } else if (effectivePlacement === 2 && totalParticipants > 2) {
                bonusPoints = newRules.secondPlace; // Second place (effectively second even if rank is 3 due to tie)
              }
              
              // Check if this is the last effective placement (handles ties for last place properly)
              const lastEffectivePlacement = Math.max(...Array.from(scoreToEffectivePlacement.values()));
              if (effectivePlacement === lastEffectivePlacement && totalParticipants > 2) {
                bonusPoints = newRules.lastPlace; // Last place (can be in addition to other bonuses)
              }

              const { error: updateError } = await supabase
                .from('scores')
                .update({ points_earned: bonusPoints })
                .eq('id', score.id);

              if (updateError) throw updateError;
            }
          }
        }
      }

      // Recalculate team totals
      await recalculateTeamTotals();

      toast({
        title: "Scores Recalculated",
        description: "All existing scores have been updated with the new scoring rules.",
      });

    } catch (error) {
      console.error('Error recalculating scores:', error);
      toast({
        title: "Error",
        description: "Failed to recalculate existing scores. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRecalculating(false);
    }
  };

  const recalculateTeamTotals = async () => {
    setRecalculating(true);
    try {
      // Get all teams for this competition
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('competition_id', competitionId);

      if (teamsError) throw teamsError;

      if (teams) {
        for (const team of teams) {
          // Calculate total score for this team
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
      }

      toast({
        title: "Team Totals Fixed!",
        description: "All team totals have been recalculated from scratch.",
      });

    } catch (error) {
      console.error('Error recalculating team totals:', error);
      toast({
        title: "Error",
        description: "Failed to recalculate team totals. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRecalculating(false);
    }
  };

  const saveRules = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('scoring_rules')
        .upsert({
          competition_id: competitionId,
          team_win_points: scoringRules.teamWin,
          team_loss_points: scoringRules.teamLoss,
          first_place_bonus: scoringRules.firstPlace,
          second_place_bonus: scoringRules.secondPlace,
          last_place_penalty: scoringRules.lastPlace
        });

      if (error) throw error;

      setHasChanges(false);
      
      // Recalculate existing scores with new rules
      await recalculateExistingScores(scoringRules);

      toast({
        title: "Scoring Rules Saved",
        description: "Your scoring configuration has been updated and all scores recalculated.",
      });
    } catch (error) {
      console.error('Error saving scoring rules:', error);
      toast({
        title: "Error",
        description: "Failed to save scoring rules. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setScoringRules({
      teamWin: 50,
      teamLoss: 0,
      firstPlace: 10,
      secondPlace: 5,
      lastPlace: -5
    });
    setHasChanges(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading scoring configuration...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Settings className="h-6 w-6 mr-2" />
            Scoring Configuration
          </h2>
          <p className="text-gray-600">Customize point values for your competition</p>
        </div>
        {hasChanges && (
          <Button onClick={saveRules} disabled={saving}>
            {saving ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      {/* Quick Fix Button */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-yellow-800">Team Total Fix</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-yellow-700 mb-3">
            If team totals seem incorrect, click below to recalculate them from scratch.
          </p>
          <Button 
            onClick={recalculateTeamTotals} 
            disabled={recalculating}
            variant="outline"
            className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
          >
            {recalculating ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {recalculating ? 'Recalculating...' : 'Fix Team Totals'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Team Competition Scoring */}
        <Card>
          <CardHeader>
            <CardTitle>Team Competition Scoring</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="team-win">Team Win Points</Label>
              <Input
                id="team-win"
                type="number"
                value={scoringRules.teamWin}
                onChange={(e) => updateRule('teamWin', e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Points awarded to the winning team
              </p>
            </div>
            
            <div>
              <Label htmlFor="team-loss">Team Loss Points</Label>
              <Input
                id="team-loss"
                type="number"
                value={scoringRules.teamLoss}
                onChange={(e) => updateRule('teamLoss', e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Points awarded to the losing team
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Individual Competition Scoring */}
        <Card>
          <CardHeader>
            <CardTitle>Individual Competition Bonuses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="first-place">1st Place Bonus</Label>
              <Input
                id="first-place"
                type="number"
                value={scoringRules.firstPlace}
                onChange={(e) => updateRule('firstPlace', e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Additional points for individual 1st place
              </p>
            </div>
            
            <div>
              <Label htmlFor="second-place">2nd Place Bonus</Label>
              <Input
                id="second-place"
                type="number"
                value={scoringRules.secondPlace}
                onChange={(e) => updateRule('secondPlace', e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Additional points for individual 2nd place
              </p>
            </div>
            
            <div>
              <Label htmlFor="last-place">Last Place Penalty</Label>
              <Input
                id="last-place"
                type="number"
                value={scoringRules.lastPlace}
                onChange={(e) => updateRule('lastPlace', e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Points deducted for individual last place
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scoring Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Scoring Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-blue-600">Team Competition Example</h4>
              <p className="text-sm text-gray-600">
                Beer Pong: Team Alpha wins → Team Alpha gets +{scoringRules.teamWin} points, Team Beta gets +{scoringRules.teamLoss} points
              </p>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-semibold text-purple-600">Individual Competition Example</h4>
              <p className="text-sm text-gray-600">
                Push-ups: Team Alpha wins overall (more total push-ups) → Team Alpha gets +{scoringRules.teamWin} points
              </p>
              <p className="text-sm text-gray-600">
                Plus individual bonuses: John (1st place) adds +{scoringRules.firstPlace} to his team, 
                Sarah (2nd place) adds +{scoringRules.secondPlace} to her team, 
                Mike (last place) loses {Math.abs(scoringRules.lastPlace)} from his team
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset to Defaults */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={resetToDefaults}>
          Reset to Default Values
        </Button>
      </div>
    </div>
  );
};

export default Scoring;
