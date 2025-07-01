
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
  team_id?: string;
}

interface Team {
  id: string;
  name: string;
  captain: string;
  participants: Participant[];
}

const TeamDraft = ({ competitionCode, competitionId }: { competitionCode: string, competitionId: string }) => {
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [competitionId]);

  const loadData = async () => {
    try {
      // Load teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          *,
          participants (*)
        `)
        .eq('competition_id', competitionId);

      if (teamsError) throw teamsError;

      const formattedTeams = teamsData.map(team => ({
        id: team.id,
        name: team.name,
        captain: team.captain,
        participants: team.participants || []
      }));

      setTeams(formattedTeams);

      // Load unassigned participants (those not in any team yet)
      const assignedParticipantIds = formattedTeams.flatMap(team => 
        team.participants.map(p => p.id)
      );

      // For now, we'll track unassigned participants in localStorage
      // In a full implementation, you might want a separate table for this
      const localParticipants = JSON.parse(localStorage.getItem(`unassigned_participants_${competitionCode}`) || '[]');
      setParticipants(localParticipants);

      // Check draft status from localStorage for now
      const draftStatus = JSON.parse(localStorage.getItem(`draft_status_${competitionCode}`) || '{}');
      setDraftActive(draftStatus.active || false);
      setCurrentPick(draftStatus.currentPick || '');
      setDraftComplete(draftStatus.complete || false);

    } catch (error) {
      console.error('Error loading draft data:', error);
      toast({
        title: "Error",
        description: "Failed to load draft data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addParticipant = () => {
    if (!newParticipantName.trim()) return;
    
    const newParticipant: Participant = {
      id: Date.now().toString(),
      name: newParticipantName.trim(),
    };
    
    const updatedParticipants = [...participants, newParticipant];
    setParticipants(updatedParticipants);
    setNewParticipantName('');
    
    // Save to localStorage for now
    localStorage.setItem(`unassigned_participants_${competitionCode}`, JSON.stringify(updatedParticipants));
  };

  const makeCaptain = async (participantId: string) => {
    if (teams.length >= 2) return;
    
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;

    try {
      const { data: teamData, error } = await supabase
        .from('teams')
        .insert([
          {
            competition_id: competitionId,
            name: `Team ${participant.name}`,
            captain: participant.name
          }
        ])
        .select()
        .single();

      if (error) throw error;

      const newTeam: Team = {
        id: teamData.id,
        name: teamData.name,
        captain: teamData.captain,
        participants: []
      };

      const updatedTeams = [...teams, newTeam];
      const updatedParticipants = participants.filter(p => p.id !== participantId);

      setTeams(updatedTeams);
      setParticipants(updatedParticipants);
      
      // Update localStorage
      localStorage.setItem(`unassigned_participants_${competitionCode}`, JSON.stringify(updatedParticipants));

      toast({
        title: "Captain Selected",
        description: `${participant.name} is now captain of ${newTeam.name}`,
      });
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: "Error",
        description: "Failed to create team",
        variant: "destructive",
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
        
        // Save draft status
        localStorage.setItem(`draft_status_${competitionCode}`, JSON.stringify({
          active: true,
          currentPick: winner.id,
          complete: false
        }));
      }, 3000);
    }, 2000);
  };

  const draftPlayer = async (participantId: string, teamId: string) => {
    if (!draftActive || currentPick !== teamId) return;
    
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;

    try {
      // Add participant to team in database
      const { error } = await supabase
        .from('participants')
        .insert([
          {
            team_id: teamId,
            name: participant.name
          }
        ]);

      if (error) throw error;

      // Update local state
      const updatedTeams = teams.map(team => 
        team.id === teamId 
          ? { ...team, participants: [...team.participants, { ...participant, team_id: teamId }] }
          : team
      );

      const updatedParticipants = participants.filter(p => p.id !== participantId);
      
      // Switch to next team
      const nextTeam = teams.find(t => t.id !== teamId);
      const nextPick = updatedParticipants.length > 0 ? nextTeam?.id || '' : '';
      
      setTeams(updatedTeams);
      setParticipants(updatedParticipants);
      setCurrentPick(nextPick);
      
      if (updatedParticipants.length === 0) {
        setDraftActive(false);
        setDraftComplete(true);
        toast({
          title: "Draft Complete!",
          description: "All players have been drafted to teams",
        });
      }
      
      // Update localStorage
      localStorage.setItem(`unassigned_participants_${competitionCode}`, JSON.stringify(updatedParticipants));
      localStorage.setItem(`draft_status_${competitionCode}`, JSON.stringify({
        active: updatedParticipants.length > 0,
        currentPick: nextPick,
        complete: updatedParticipants.length === 0
      }));

    } catch (error) {
      console.error('Error drafting player:', error);
      toast({
        title: "Error",
        description: "Failed to draft player",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading draft...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Coin Flip Modal */}
      <Dialog open={coinFlipVisible}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Coin Flip for First Pick</DialogTitle>
            <DialogDescription className="text-center">
              {teams[0]?.name} = Heads | {teams[1]?.name} = Tails
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-6">
            {!coinFlipping && !coinResult && (
              <>
                <Coins className={`h-24 w-24 text-yellow-500`} />
                <Button onClick={flipCoin} size="lg">
                  Click to Flip!
                </Button>
              </>
            )}
            
            {coinFlipping && (
              <>
                <Coins className={`h-24 w-24 text-yellow-500 animate-spin`} />
                <p className="text-center">Flipping...</p>
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
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center">
              <Crown className="h-5 w-5 mr-2" />
              Draft Complete!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {teams.map(team => (
                <div key={team.id} className="bg-white p-4 rounded-lg border">
                  <h3 className="font-bold text-lg mb-2 flex items-center">
                    <Crown className="h-4 w-4 mr-1 text-yellow-500" />
                    {team.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">Captain: {team.captain}</p>
                  <div className="space-y-1">
                    {team.participants.map(member => (
                      <Badge key={member.id} variant="secondary">{member.name}</Badge>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Total: {team.participants.length + 1} players
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Draft Status */}
      {draftActive && !draftComplete && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <Badge variant="destructive" className="animate-pulse mb-2">
                DRAFT LIVE
              </Badge>
              <p className="text-lg font-semibold">
                {teams.find(t => t.id === currentPick)?.name}'s turn to pick
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Participants */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Participants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Add participant"
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addParticipant()}
                />
                <Button onClick={addParticipant} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-2">
                {participants.map(participant => (
                  <div 
                    key={participant.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      draftActive 
                        ? 'hover:bg-blue-50 border-blue-200' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      if (!draftActive && teams.length < 2) {
                        makeCaptain(participant.id);
                      }
                    }}
                  >
                    <p className="font-medium">{participant.name}</p>
                    {!draftActive && teams.length < 2 && (
                      <p className="text-xs text-gray-500">Click to make captain</p>
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
                className={`${
                  draftActive && currentPick === team.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : ''
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
                    <Badge variant="outline">Captain: {team.captain}</Badge>
                    {team.participants.map(member => (
                      <Badge key={member.id} variant="secondary">{member.name}</Badge>
                    ))}
                  </div>
                  
                  {draftActive && currentPick === team.id && participants.length > 0 && (
                    <div className="mt-4 p-3 bg-white rounded border-2 border-dashed border-blue-300">
                      <p className="text-sm text-blue-600 font-medium mb-2">
                        Click to select:
                      </p>
                      <div className="space-y-1">
                        {participants.map(participant => (
                          <Button
                            key={participant.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => draftPlayer(participant.id, team.id)}
                          >
                            {participant.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
            
            {teams.length < 2 && (
              <Card className="border-dashed border-gray-300">
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500">
                    <Crown className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Select captains from participants</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {teams.length === 2 && !draftActive && !draftComplete && (
            <div className="mt-6 text-center">
              <Button onClick={startDraft} size="lg" className="bg-gradient-to-r from-blue-500 to-purple-500">
                <Coins className="h-4 w-4 mr-2" />
                Start Draft
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamDraft;
