import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Target, Star, Crown } from "lucide-react";
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
  winner?: string;
}

interface Participant {
  id: string;
  name: string;
  team_id: string;
}

interface ActivityScore {
  activity_id: string;
  team_id: string;
  team_name: string;
  points_earned: number;
}

const Dashboard = ({ competitionCode, competitionId }: { competitionCode: string, competitionId: string }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activityScores, setActivityScores] = useState<ActivityScore[]>([]);
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

      // Load participants (get unique count, not duplicating captains)
      if (teamsData && teamsData.length > 0) {
        const { data: participantsData, error: participantsError } = await supabase
          .from('participants')
          .select('*')
          .in('team_id', teamsData.map(t => t.id));

        if (participantsError) throw participantsError;
        setParticipants(participantsData || []);
      }

      // Load activity scores for completed activities
      if (activitiesData && activitiesData.length > 0 && teamsData && teamsData.length > 0) {
        const completedActivityIds = activitiesData.filter(a => a.completed).map(a => a.id);
        
        if (completedActivityIds.length > 0) {
          const { data: scoresData, error: scoresError } = await supabase
            .from('scores')
            .select('activity_id, team_id, points_earned')
            .in('activity_id', completedActivityIds)
            .eq('score_type', 'team')
            .not('team_id', 'is', null);

          if (scoresError) throw scoresError;

          // Map scores with team names
          const scoresWithTeamNames: ActivityScore[] = (scoresData || []).map(score => {
            const team = teamsData.find(t => t.id === score.team_id);
            return {
              activity_id: score.activity_id,
              team_id: score.team_id!,
              team_name: team?.name || 'Unknown Team',
              points_earned: score.points_earned
            };
          });

          setActivityScores(scoresWithTeamNames);
        }
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityScoreDisplay = (activityId: string) => {
    const scores = activityScores.filter(score => score.activity_id === activityId);
    if (scores.length === 0) return null;

    return scores.map(score => (
      <Badge 
        key={score.team_id} 
        variant="outline" 
        className={`ml-1 ${score.points_earned > 0 ? 'bg-green-100 text-green-800' : score.points_earned < 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}
      >
        {score.team_name}: {score.points_earned > 0 ? '+' : ''}{score.points_earned}
      </Badge>
    ));
  };

  const getTeamMembers = (teamId: string) => {
    return participants.filter(p => p.team_id === teamId);
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
        <Card className="shadow-sm">
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

        <Card className="shadow-sm">
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

        <Card className="shadow-sm">
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

        <Card className="shadow-sm">
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
      <Card className="shadow-sm">
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
              teams.map((team, index) => {
                const teamMembers = getTeamMembers(team.id);
                return (
                  <div key={team.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                        #{index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold">{team.name}</h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {teamMembers.map(member => (
                            <Badge 
                              key={member.id}
                              variant={member.name === team.captain ? "default" : "secondary"}
                              className={`text-xs ${member.name === team.captain ? "bg-yellow-500 hover:bg-yellow-600" : ""}`}
                            >
                              {member.name === team.captain && <Crown className="h-3 w-3 mr-1" />}
                              {member.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-lg font-bold">
                      {team.total_score} pts
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activities Progress */}
      <Card className="shadow-sm">
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
                      <Trophy className="h-5 w-5 text-amber-500" />
                    )}
                    <div className="flex-1">
                      <span className="font-medium">{activity.name}</span>
                      <div className="flex items-center flex-wrap mt-1">
                        <Badge variant={activity.completed ? 'default' : 'secondary'}>
                          {activity.completed ? 'Completed' : 'Pending'}
                        </Badge>
                        {activity.completed && activity.winner && (
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 ml-1">
                            🏆 {activity.winner}
                          </Badge>
                        )}
                        {activity.completed && getActivityScoreDisplay(activity.id)}
                      </div>
                    </div>
                  </div>
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
