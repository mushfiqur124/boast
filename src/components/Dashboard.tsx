
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Target, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Team {
  id: string;
  name: string;
  captain: string;
  total_score: number;
}

interface Activity {
  id: string;
  name: string;
  type: string;
  completed: boolean;
}

interface Participant {
  id: string;
  name: string;
  team_id: string;
}

const Dashboard = ({ competitionCode, competitionId }: { competitionCode: string, competitionId: string }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [competitionId]);

  const loadDashboardData = async () => {
    try {
      // Load teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('competition_id', competitionId)
        .order('total_score', { ascending: false });

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Load activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('competition_id', competitionId);

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

      // Load participants
      if (teamsData && teamsData.length > 0) {
        const { data: participantsData, error: participantsError } = await supabase
          .from('participants')
          .select('*')
          .in('team_id', teamsData.map(t => t.id));

        if (participantsError) throw participantsError;
        setParticipants(participantsData || []);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const completedActivities = activities.filter(a => a.completed).length;
  const totalActivities = activities.length;

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{teams.length}</p>
                <p className="text-xs text-muted-foreground">Teams</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Star className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{participants.length}</p>
                <p className="text-xs text-muted-foreground">Participants</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{totalActivities}</p>
                <p className="text-xs text-muted-foreground">Activities</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{completedActivities}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Trophy className="h-5 w-5 mr-2 text-yellow-500" />
            Team Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teams.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No teams registered yet</p>
            ) : (
              teams.map((team, index) => (
                <div key={team.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                      #{index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold">{team.name}</h3>
                      <p className="text-sm text-gray-600">Captain: {team.captain}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-lg font-bold">
                    {team.total_score} pts
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activities Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Activities Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No activities added yet</p>
            ) : (
              activities.map(activity => (
                <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-3">
                    {activity.type === 'team' ? (
                      <Users className="h-5 w-5 text-blue-500" />
                    ) : (
                      <Trophy className="h-5 w-5 text-purple-500" />
                    )}
                    <span className="font-medium">{activity.name}</span>
                  </div>
                  <Badge variant={activity.completed ? 'default' : 'secondary'}>
                    {activity.completed ? 'Completed' : 'Pending'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
