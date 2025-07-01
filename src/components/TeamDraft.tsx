import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Crown, Coins, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Participant {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
  captain: string;
  members: string[];
}

interface TeamDraftProps {
  competitionId: string;
  competitionCode?: string;
}

const TeamDraft = ({ competitionId }: TeamDraftProps) => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [draftActive, setDraftActive] = useState(false);
  const [currentPick, setCurrentPick] = useState<string>('');
  const [coinFlipVisible, setCoinFlipVisible] = useState(false);
  const [coinFlipping, setCoinFlipping] = useState(false);
  const [coinResult, setCoinResult] = useState<string>('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [draftComplete, setDraftComplete] = useState(false);

  useEffect(() => {
    loadData();
  }, [competitionId]);

  const loadData = async () => {
    try {
      // Load teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .eq('competition_id', competitionId);

      if (teamsError) throw teamsError;

      // Load participants for each team
      const teamsWithMembers = [];
      for (const team of teamsData || []) {
        const { data: participantsData } = await supabase
          .from('participants')
          .select('*')
          .eq('team_id', team.id);

        teamsWithMembers.push({
          ...team,
          members: (participantsData || []).map(p => p.name)
        });
      }

      setTeams(teamsWithMembers);

      // Check if draft is complete
      if (teamsWithMembers.length === 2 && teamsWithMembers.every(t => t.members.length > 0)) {
        setDraftComplete(true);
      }

      // Load remaining participants (not on any team)
      const allParticipantNames = teamsWithMembers.flatMap(t => [...t.members, t.captain]);
      // For now, we'll keep track of available participants in state
      // In a real app, you might have a separate participants table
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load team data",
        variant: "destructive"
      });
    }
  };

  const addParticipant = () => {
    if (!newParticipantName.trim()) return;
    
    const newParticipant: Participant = {
      id: Date.now().toString(),
      name: newParticipantName.trim()
    };
    
    setParticipants([...participants, newParticipant]);
    setNewParticipantName('');
  };

  const makeCaptain = async (participantId: string) => {
    if (teams.length >= 2) return;
    
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;

    try {
      const { data, error } = await supabase
        .from('teams')
        .insert([{
          competition_id: competitionId,
          name: `Team ${participant.name}`,
          captain: participant.name,
          total_score: 0
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "👑 Captain Selected!",
        description: `${participant.name} is now a team captain`,
      });

      // Remove participant from available list
      setParticipants(participants.filter(p => p.id !== participantId));
      loadData();
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: "Error",
        description: "Failed to create team",
        variant: "destructive"
      });
    }
  };

  const startDraft = () => {
    if (teams.length !== 2) return;
    setCoinFlipVisible(true);
  };

  const flipCoin = () => {
    setCoinFlipping(true);
    
    setTimeout(() => {
      const isHeads = Math.random() > 0.5;
      const winner = isHeads ? teams[0] : teams[1];
      setCoinResult(`${isHeads ? 'Heads' : 'Tails'}! ${winner.name} picks first!`);
      setCurrentPick(winner.id);
      setShowConfetti(true);
      setCoinFlipping(false);
      
      setTimeout(() => {
        setCoinFlipVisible(false);
        setDraftActive(true);
        setShowConfetti(false);
      }, 3000);
    }, 2000);
  };

  const draftPlayer = async (participantId: string, teamId: string) => {
    if (!draftActive || currentPick !== teamId) return;
    
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;

    try {
      // Add participant to team
      const { error } = await supabase
        .from('participants')
        .insert([{
          team_id: teamId,
          name: participant.name
        }]);

      if (error) throw error;

      // Remove from available participants
      setParticipants(participants.filter(p => p.id !== participantId));
      
      // Switch to next team
      const nextTeam = teams.find(t => t.id !== teamId);
      const nextPick = participants.length > 1 ? nextTeam?.id || '' : '';
      
      setCurrentPick(nextPick);
      
      if (participants.length <= 1) {
        setDraftActive(false);
        setDraftComplete(true);
      }

      toast({
        title: "🎯 Player Drafted!",
        description: `${participant.name} joined ${teams.find(t => t.id === teamId)?.name}`,
      });

      loadData();
    } catch (error) {
      console.error('Error drafting player:', error);
      toast({
        title: "Error",
        description: "Failed to draft player",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Coin Flip Modal */}
      <Dialog open={coinFlipVisible}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">🪙 Coin Flip for First Pick</DialogTitle>
            <DialogDescription className="text-center">
              {teams[0]?.name} = Heads | {teams[1]?.name} = Tails
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-6">
            {!coinFlipping && !coinResult && (
              <>
                <Coins className={`h-24 w-24 text-yellow-500`} />
                <Button onClick={flipCoin} size="lg" className="bg-yellow-500 hover:bg-yellow-600">
                  🎲 Click to Flip!
                </Button>
              </>
            )}
            
            {coinFlipping && (
              <>
                <Coins className={`h-24 w-24 text-yellow-500 animate-spin`} />
                <p className="text-center">🌪️ Flipping...</p>
              </>
            )}
            
            {coinResult && (
              <>
                <Coins className={`h-24 w-24 text-yellow-500`} />
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">{coinResult}</p>
                  {showConfetti && <Sparkles className="h-8 w-8 text-yellow-500 mx-auto mt-2 animate-pulse" />}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Draft Complete Summary */}
      {draftComplete && (
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center text-xl">
              <Crown className="h-6 w-6 mr-2" />
              🎉 Draft Complete!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {teams.map(team => (
                <div key={team.id} className="bg-white p-4 rounded-lg border shadow-sm">
                  <h3 className="font-bold text-lg mb-2 flex items-center">
                    <Crown className="h-4 w-4 mr-1 text-yellow-500" />
                    {team.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">👑 Captain: {team.captain}</p>
                  <div className="space-y-1">
                    {team.members.map(member => (
                      <Badge key={member} variant="secondary" className="mr-1 mb-1">
                        👤 {member}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    👥 Total: {team.members.length + 1} players
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Draft Status */}
      {draftActive && !draftComplete && (
        <Card className="border-red-200 bg-gradient-to-r from-red-50 to-pink-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <Badge variant="destructive" className="animate-pulse mb-2 text-lg px-4 py-2">
                🔴 DRAFT LIVE
              </Badge>
              <p className="text-lg font-semibold">
                🎯 {teams.find(t => t.id === currentPick)?.name}'s turn to pick
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Participants */}
        <div className="lg:col-span-1">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center">
                👥 Participants
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Add participant"
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
                />
                <Button onClick={addParticipant} size="sm" className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-2">
                {participants.map(participant => (
                  <div 
                    key={participant.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${
                      draftActive 
                        ? 'hover:bg-blue-50 border-blue-200 hover:border-blue-300' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      if (!draftActive && teams.length < 2) {
                        makeCaptain(participant.id);
                      }
                    }}
                  >
                    <p className="font-medium">👤 {participant.name}</p>
                    {!draftActive && teams.length < 2 && (
                      <p className="text-xs text-gray-500">👑 Click to make captain</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Area - Teams */}
        <div className="lg:col-span-3">
          <div className="grid md:grid-cols-2 gap-6">
            {teams.map(team => (
              <Card 
                key={team.id}
                className={`shadow-md transition-all ${
                  draftActive && currentPick === team.id 
                    ? 'border-blue-500 bg-blue-50 shadow-lg' 
                    : 'hover:shadow-lg'
                }`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Crown className="h-5 w-5 mr-2 text-yellow-500" />
                    {team.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge variant="outline" className="bg-yellow-50">👑 Captain: {team.captain}</Badge>
                    {team.members.map(member => (
                      <Badge key={member} variant="secondary">👤 {member}</Badge>
                    ))}
                  </div>
                  
                  {draftActive && currentPick === team.id && participants.length > 0 && (
                    <div className="mt-4 p-3 bg-white rounded border-2 border-dashed border-blue-300">
                      <p className="text-sm text-blue-600 font-medium mb-2">
                        🎯 Your turn to pick:
                      </p>
                      <div className="space-y-1">
                        {participants.map(participant => (
                          <Button
                            key={participant.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start hover:bg-blue-100"
                            onClick={() => draftPlayer(participant.id, team.id)}
                          >
                            👤 {participant.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            
            {teams.length < 2 && (
              <Card className="border-dashed border-gray-300 shadow-md">
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">
                    <Crown className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-lg">👑 Select captains from participants</p>
                    <p className="text-sm">Click on participants to make them captains</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {teams.length === 2 && !draftActive && !draftComplete && participants.length > 0 && (
            <div className="mt-6 text-center">
              <Button onClick={startDraft} size="lg" className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8 py-4 text-lg">
                <Coins className="h-5 w-5 mr-2" />
                🚀 Start Draft
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamDraft;
