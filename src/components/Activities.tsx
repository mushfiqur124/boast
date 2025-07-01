
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trophy, Users, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ScoreEntry from './ScoreEntry';

interface Activity {
  id: string;
  name: string;
  type: 'team' | 'individual';
  unit?: string;
  completed: boolean;
}

interface ActivitiesProps {
  competitionId: string;
  competitionCode?: string;
}

const Activities = ({ competitionId }: ActivitiesProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newActivity, setNewActivity] = useState({
    name: '',
    type: 'team' as 'team' | 'individual',
    unit: ''
  });
  const [isAddingActivity, setIsAddingActivity] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  useEffect(() => {
    loadActivities();
  }, [competitionId]);

  const loadActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('competition_id', competitionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
      toast({
        title: "Error",
        description: "Failed to load activities",
        variant: "destructive"
      });
    }
  };

  const addActivity = async () => {
    if (!newActivity.name.trim()) return;

    try {
      const { error } = await supabase
        .from('activities')
        .insert([{
          competition_id: competitionId,
          name: newActivity.name.trim(),
          type: newActivity.type,
          unit: newActivity.unit || null
        }]);

      if (error) throw error;

      toast({
        title: "🎉 Activity Added!",
        description: `${newActivity.name} has been added to the competition`,
      });

      setNewActivity({ name: '', type: 'team', unit: '' });
      setIsAddingActivity(false);
      loadActivities();
    } catch (error) {
      console.error('Error adding activity:', error);
      toast({
        title: "Error",
        description: "Failed to add activity",
        variant: "destructive"
      });
    }
  };

  const presetActivities = [
    { name: 'Push-ups', type: 'individual', unit: 'count', emoji: '💪' },
    { name: 'Plank', type: 'individual', unit: 'seconds', emoji: '🏋️‍♂️' },
    { name: 'Wall-sit', type: 'individual', unit: 'seconds', emoji: '🧱' },
    { name: 'Grip Test', type: 'individual', unit: 'lbs', emoji: '✊' },
    { name: 'Beer Pong', type: 'team', unit: '', emoji: '🍺' },
    { name: 'Flip Cup', type: 'team', unit: '', emoji: '🥤' },
    { name: 'Flag Football', type: 'team', unit: '', emoji: '🏈' },
    { name: 'Wiki Race', type: 'team', unit: '', emoji: '🌐' },
    { name: 'Mario Kart', type: 'team', unit: '', emoji: '🏎️' },
  ];

  const addPresetActivity = async (preset: any) => {
    try {
      const { error } = await supabase
        .from('activities')
        .insert([{
          competition_id: competitionId,
          name: preset.name,
          type: preset.type,
          unit: preset.unit || null
        }]);

      if (error) throw error;

      toast({
        title: "🎉 Activity Added!",
        description: `${preset.emoji} ${preset.name} has been added`,
      });

      loadActivities();
    } catch (error) {
      console.error('Error adding preset activity:', error);
      toast({
        title: "Error",
        description: "Failed to add activity",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">🏃‍♂️ Activities</h2>
          <p className="text-gray-600">Manage your competition activities</p>
        </div>
        <Dialog open={isAddingActivity} onOpenChange={setIsAddingActivity}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Activity
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>✨ Add New Activity</DialogTitle>
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
                  onValueChange={(value: 'team' | 'individual') => 
                    setNewActivity({ ...newActivity, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team">🏆 Team Competition</SelectItem>
                    <SelectItem value="individual">👤 Individual Scores</SelectItem>
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
              <Button onClick={addActivity} className="bg-green-600 hover:bg-green-700">Add Activity</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Add Presets */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-dashed border-blue-200">
        <CardHeader>
          <CardTitle>🚀 Quick Add Popular Activities</CardTitle>
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
                  className="justify-start hover:bg-white hover:shadow-md transition-all"
                >
                  <span className="mr-2">{preset.emoji}</span>
                  {preset.name}
                </Button>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Activities List */}
      <div className="grid gap-4">
        {activities.length === 0 ? (
          <Card className="bg-gray-50">
            <CardContent className="pt-6">
              <div className="text-center text-gray-500">
                <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-lg">🎯 No activities added yet</p>
                <p className="text-sm">Add some activities to get started!</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          activities.map(activity => (
            <Card 
              key={activity.id} 
              className={`transition-all hover:shadow-md ${
                activity.completed 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {activity.type === 'team' ? (
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-blue-600" />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <Trophy className="h-5 w-5 text-purple-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">{activity.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={activity.type === 'team' ? 'default' : 'secondary'}>
                          {activity.type === 'team' ? '🏆 Team Competition' : '👤 Individual Scores'}
                        </Badge>
                        {activity.unit && (
                          <Badge variant="outline">📏 Unit: {activity.unit}</Badge>
                        )}
                        {activity.completed && (
                          <Badge className="bg-green-500 hover:bg-green-600">
                            ✅ Completed
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
                      className="hover:bg-blue-50"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      {activity.completed ? '📝 Edit Scores' : '📊 Enter Scores'}
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
          isOpen={!!selectedActivity}
          onClose={() => setSelectedActivity(null)}
          competitionId={competitionId}
          onScoresSaved={() => {
            loadActivities();
            setSelectedActivity(null);
          }}
        />
      )}
    </div>
  );
};

export default Activities;
