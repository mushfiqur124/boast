
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Crown, TrendingUp, Download, Medal, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Team {
  id: string;
  name: string;
  captain: string;
  total_score: number;
  participants: Array<{ id: string; name: string }>;
}

interface Activity {
  id: string;
  name: string;
  type: 'team' | 'individual';
  completed: boolean;
}

const Dashboard = ({ competitionCode, competitionId }: { competitionCode: string, competitionId: string }) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [competitionName, setCompetitionName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [competitionId]);

  const loadDashboardData = async () => {
    try {
      // Load competition info
      const { data: competitionData, error: compError } = await supabase
        .from('competitions')
        .select('*')
        .eq('id', competitionId)
        .single();

      if (compError) throw compError;
      setCompetitionName(competitionData.name);

      // Load teams with participants
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          participants (*)
        `)
        .eq('competition_id', competitionId);

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Load activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('competition_id', competitionId);

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Competition', competitionName],
      ['Code', competitionCode],
      [''],
      ['Team Rankings'],
      ['Rank', 'Team', 'Captain', 'Members', 'Score'],
      ...teams
        .sort((a, b) => b.total_score - a.total_score)
        .map((team, index) => [
          index + 1,
          team.name,
          team.captain,
          team.participants.map(p => p.name).join('; '),
          team.total_score
        ]),
      [''],
      ['Activities'],
      ['Activity', 'Type', 'Status'],
      ...activities.map(activity => [
        activity.name,
        activity.type,
        activity.completed ? 'Completed' : 'Pending'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${competitionName.replace(/\s+/g, '_')}_results.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading dashboard...</div>;
  }

  const sortedTeams = teams.sort((a, b) => b.total_score - a.total_score);
  const scoreDifference = sortedTeams.length >= 2 ? sortedTeams[0].total_score - sortedTeams[1].total_score : 0;
  const completedActivities = activities.filter(a => a.completed).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Trophy className="h-6 w-6 mr-2 text-yellow-500" />
            Competition Dashboard
          </h2>
          <p className="text-gray-600">Live overview of team standings and achievements</p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Competition Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{teams.length}</p>
                <p className="text-sm text-gray-600">Teams</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Medal className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{activities.length}</p>
                <p className="text-sm text-gray-600">Total Activities</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Star className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{completedActivities}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{scoreDifference}</p>
                <p className="text-sm text-gray-600">Point Difference</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Standings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Crown className="h-5 w-5 mr-2 text-yellow-500" />
            Team Standings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No teams found</p>
              <p className="text-sm">Complete the team draft to see standings</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedTeams.map((team, index) => (
                <div 
                  key={team.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                    index === 0 
                      ? 'border-yellow-200 bg-yellow-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 
                        ? 'bg-yellow-500 text-white' 
                        : 'bg-gray-400 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg flex items-center">
                        {team.name}
                        {index === 0 && <Crown className="h-4 w-4 ml-2 text-yellow-500" />}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Captain: {team.captain} • {team.participants.length + 1} players
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {team.participants.map(member => (
                          <Badge key={member.id} variant="outline" className="text-xs">
                            {member.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-3xl font-bold ${
                      index === 0 ? 'text-yellow-600' : 'text-gray-700'
                    }`}>
                      {team.total_score}
                    </p>
                    <p className="text-sm text-gray-500">points</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity History */}
      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Medal className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No activities added yet</p>
              <p className="text-sm">Add activities to track competition progress</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map(activity => (
                <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {activity.type === 'team' ? (
                      <Trophy className="h-4 w-4 text-blue-500" />
                    ) : (
                      <Medal className="h-4 w-4 text-purple-500" />
                    )}
                    <div>
                      <p className="font-medium">{activity.name}</p>
                      <p className="text-sm text-gray-500">
                        {activity.type === 'team' ? 'Team Competition' : 'Individual Scores'}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={activity.completed ? 'default' : 'secondary'}
                    className={activity.completed ? 'bg-green-500' : ''}
                  >
                    {activity.completed ? 'Completed' : 'Pending'}
                  </Badge>
                </div>
              ))}
              
              {completedActivities === 0 && (
                <div className="text-center text-gray-500 py-4">
                  <p className="text-sm">No activities completed yet</p>
                  <p className="text-xs">Start competing to see results here!</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
