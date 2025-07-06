import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trophy, Users, Edit, Trash2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ScoreEntry from './ScoreEntry';

interface Activity {
  id: string;
  name: string;
  type: string;
  unit?: string;
  completed: boolean;
  winner?: string;
}

interface PresetActivity {
  name: string;
  type: string;
  unit: string;
}

const Activities = ({ competitionCode, competitionId }: { competitionCode: string, competitionId: string }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newActivity, setNewActivity] = useState({
    name: '',
    type: 'team' as string,
    unit: ''
  });
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [deletingActivity, setDeletingActivity] = useState<Activity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadActivities();
  }, [competitionId]);

  // Helper function to recalculate all team totals from scratch
  const recalculateAllTeamTotals = async () => {
    try {
      // Get all teams for this competition
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('competition_id', competitionId);

      if (teamsError) throw teamsError;

      if (teams) {
        for (const team of teams) {
          // Calculate total score for this team from all remaining scores
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
    } catch (error) {
      console.error('Error recalculating team totals:', error);
    }
  };

  const loadActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('competition_id', competitionId);

      if (error) throw error;

      setActivities(data || []);
      
      // Ensure team totals are accurate on load (silent recalculation)
      await recalculateAllTeamTotals();
    } catch (error) {
      console.error('Error loading activities:', error);
      toast({
        title: "Error",
        description: "Failed to load activities",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addActivity = async () => {
    if (!newActivity.name.trim()) return;

    try {
      const { data, error } = await supabase
        .from('activities')
        .insert([
          {
            competition_id: competitionId,
            name: newActivity.name,
            type: newActivity.type,
            unit: newActivity.unit || null
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setActivities([...activities, data]);
      setNewActivity({ name: '', type: 'team', unit: '' });
      setIsAddingActivity(false);

      toast({
        title: "Activity Added",
        description: `${newActivity.name} has been added to the competition`,
      });
    } catch (error) {
      console.error('Error adding activity:', error);
      toast({
        title: "Error",
        description: "Failed to add activity",
        variant: "destructive",
      });
    }
  };

  const presetActivities = [
    { name: 'Push-ups', type: 'individual', unit: 'count' },
    { name: 'Plank', type: 'individual', unit: 'seconds' },
    { name: 'Wall-sit', type: 'individual', unit: 'seconds' },
    { name: 'Grip Test', type: 'individual', unit: 'number' },
    { name: 'Beer Pong', type: 'team', unit: '' },
    { name: 'Flip Cup', type: 'team', unit: '' },
    { name: 'Flag Football', type: 'team', unit: '' },
    { name: 'Wiki Race', type: 'team', unit: '' },
    { name: 'Mario Kart', type: 'team', unit: '' },
  ];

  const addPresetActivity = async (preset: PresetActivity) => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .insert([
          {
            competition_id: competitionId,
            name: preset.name,
            type: preset.type,
            unit: preset.unit || null
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setActivities([...activities, data]);

      toast({
        title: "Activity Added",
        description: `${preset.name} has been added to the competition`,
      });
    } catch (error) {
      console.error('Error adding preset activity:', error);
      toast({
        title: "Error",
        description: "Failed to add activity",
        variant: "destructive",
      });
    }
  };

  const deleteActivity = async (activity: Activity) => {
    if (!activity) return;
    
    setIsDeleting(true);
    try {
      // Delete all scores for this activity
      const { error: deleteScoresError } = await supabase
        .from('scores')
        .delete()
        .eq('activity_id', activity.id);

      if (deleteScoresError) throw deleteScoresError;

      // Delete the activity itself
      const { error: deleteActivityError } = await supabase
        .from('activities')
        .delete()
        .eq('id', activity.id);

      if (deleteActivityError) throw deleteActivityError;

      // Recalculate all team totals from scratch
      await recalculateAllTeamTotals();

      // Update local state
      setActivities(activities.filter(a => a.id !== activity.id));
      setDeletingActivity(null);

      toast({
        title: "Activity Deleted",
        description: `${activity.name} has been removed and team totals recalculated`,
      });

    } catch (error) {
      console.error('Error deleting activity:', error);
      toast({
        title: "Error",
        description: "Failed to delete activity. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading activities...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Activities</h2>
          <p className="text-gray-600">Manage your competition activities</p>
        </div>
        <Dialog open={isAddingActivity} onOpenChange={setIsAddingActivity}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Activity
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Activity</DialogTitle>
              <DialogDescription>
                Create a custom activity for your competition
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="activity-name">Activity Name</Label>
                <Input
                  id="activity-name"
                  value={newActivity.name}
                  onChange={(e) => setNewActivity({ ...newActivity, name: e.target.value })}
                  placeholder="e.g., Arm Wrestling"
                />
              </div>
              <div>
                <Label htmlFor="activity-type">Activity Type</Label>
                <Select 
                  value={newActivity.type} 
                  onValueChange={(value: string) => 
                    setNewActivity({ ...newActivity, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team">Team Competition</SelectItem>
                    <SelectItem value="individual">Individual Scores</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newActivity.type === 'individual' && (
                <div>
                  <Label htmlFor="activity-unit">Unit of Measurement</Label>
                  <Input
                    id="activity-unit"
                    value={newActivity.unit}
                    onChange={(e) => setNewActivity({ ...newActivity, unit: e.target.value })}
                    placeholder="e.g., seconds, count, points"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingActivity(false)}>
                Cancel
              </Button>
              <Button onClick={addActivity}>Add Activity</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Add Presets */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Quick Add Popular Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {presetActivities
              .filter(preset => !activities.some(activity => activity.name === preset.name))
              .map((preset, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => addPresetActivity(preset)}
                  className="justify-start"
                >
                  {preset.type === 'team' ? (
                    <Users className="h-3 w-3 mr-1 text-blue-600" />
                  ) : (
                    <Trophy className="h-3 w-3 mr-1 text-amber-500" />
                  )}
                  {preset.name}
                </Button>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Activities List */}
      <div className="grid gap-4">
        {activities.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              <div className="text-center text-gray-500">
                <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No activities added yet</p>
                <p className="text-sm">Add some activities to get started!</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          activities.map(activity => (
            <Card key={activity.id} className={`shadow-sm ${activity.completed ? 'bg-green-50' : ''}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {activity.type === 'team' ? (
                      <Users className="h-5 w-5 text-blue-500" />
                    ) : (
                      <Trophy className="h-5 w-5 text-amber-500" />
                    )}
                    <div>
                      <h3 className="font-semibold">{activity.name}</h3>
                      <div className="flex items-center space-x-2">
                        <Badge variant={activity.type === 'team' ? 'default' : 'secondary'}>
                          {activity.type === 'team' ? 'Team Competition' : 'Individual Scores'}
                        </Badge>
                        {activity.unit && (
                          <Badge variant="outline">Unit: {activity.unit}</Badge>
                        )}
                        {activity.completed && (
                          <Badge variant="default" className="bg-green-500">
                            Completed
                          </Badge>
                        )}
                        {activity.completed && activity.winner && (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                            🏆 {activity.winner}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedActivity(activity)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      {activity.completed ? 'Edit Scores' : 'Enter Scores'}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setDeletingActivity(activity)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Score Entry Modal */}
      {selectedActivity && (
        <ScoreEntry
          activity={selectedActivity}
          competitionId={competitionId}
          competitionCode={competitionCode}
          onClose={() => setSelectedActivity(null)}
          onScoresUpdated={loadActivities}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingActivity} onOpenChange={() => setDeletingActivity(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              Delete Activity?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingActivity?.name}"? This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Remove all scores for this activity</li>
                <li>Subtract earned points from team totals</li>
                <li>Permanently delete the activity</li>
              </ul>
              <span className="font-medium text-red-600 mt-2 block">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setDeletingActivity(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deletingActivity && deleteActivity(deletingActivity)}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Yes, Delete Activity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Activities;
