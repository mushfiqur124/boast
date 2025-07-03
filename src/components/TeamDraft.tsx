import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Crown, Coins, Sparkles, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import confetti from 'canvas-confetti';

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

interface PostgreSQLError extends Error {
  code?: string;
  message: string;
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
  const [editMode, setEditMode] = useState(false);
  
  // New state for team heads/tails selection
  const [teamSelectionPhase, setTeamSelectionPhase] = useState(true);
  const [headsTeamId, setHeadsTeamId] = useState<string>('');
  const [tailsTeamId, setTailsTeamId] = useState<string>('');

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
      const unassignedParticipants = JSON.parse(localStorage.getItem(`unassigned_participants_${competitionCode}`) || '[]');
      setParticipants(unassignedParticipants);

      // Check draft status from localStorage
      const draftStatus = JSON.parse(localStorage.getItem(`draft_status_${competitionCode}`) || '{}');
      
      // Auto-detect if draft is complete based on actual data
      const hasTeamsWithParticipants = formattedTeams.length === 2 && formattedTeams.every(team => team.participants.length > 1); // captain + drafted players
      const noUnassignedParticipants = unassignedParticipants.length === 0;
      const isDraftComplete = hasTeamsWithParticipants && noUnassignedParticipants;
      
      setDraftActive(isDraftComplete ? false : (draftStatus.active || false));
      setCurrentPick(isDraftComplete ? '' : (draftStatus.currentPick || ''));
      setDraftComplete(isDraftComplete || draftStatus.complete || false);
      
      // Update localStorage if we detected completion
      if (isDraftComplete && !draftStatus.complete) {
        localStorage.setItem(`draft_status_${competitionCode}`, JSON.stringify({
          active: false,
          currentPick: '',
          complete: true
        }));
      }

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

      // Add the captain as a participant in the team
      const { error: participantError } = await supabase
        .from('participants')
        .insert([
          {
            team_id: teamData.id,
            name: participant.name
          }
        ]);

      if (participantError) throw participantError;

      const newTeam: Team = {
        id: teamData.id,
        name: teamData.name,
        captain: teamData.captain,
        participants: [{ id: 'captain', name: participant.name, team_id: teamData.id }]
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
    setTeamSelectionPhase(true);
    setHeadsTeamId('');
    setTailsTeamId('');
    setCoinFlipVisible(true);
  };

  const closeCoinFlip = () => {
    setCoinFlipVisible(false);
    setTeamSelectionPhase(true);
    setHeadsTeamId('');
    setTailsTeamId('');
    setCoinFlipping(false);
    setCoinResult('');
    setShowConfetti(false);
  };

  const selectHeadsTails = (teamId: string, choice: 'heads' | 'tails') => {
    const otherTeamId = teams.find(t => t.id !== teamId)?.id || '';
    
    if (choice === 'heads') {
      setHeadsTeamId(teamId);
      setTailsTeamId(otherTeamId);
    } else {
      setTailsTeamId(teamId);
      setHeadsTeamId(otherTeamId);
    }
  };

  const proceedToFlip = () => {
    setTeamSelectionPhase(false);
  };

  const flipCoin = () => {
    setCoinFlipping(true);
    
    setTimeout(() => {
      const isHeads = Math.random() > 0.5;
      const winnerTeamId = isHeads ? headsTeamId : tailsTeamId;
      const winner = teams.find(t => t.id === winnerTeamId);
      
      if (winner) {
        setCoinResult(`${isHeads ? 'Heads' : 'Tails'}! ${winner.name} picks first!`);
        setCurrentPick(winner.id);
        setShowConfetti(true);
        
        // Trigger spectacular confetti effect
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min: number, max: number) {
          return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 50 * (timeLeft / duration);
          
          // Since particles fall down, start a bit higher than random
          confetti(Object.assign({}, defaults, { 
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
          }));
          confetti(Object.assign({}, defaults, { 
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
          }));
        }, 250);
      }
      
      setCoinFlipping(false);
      
      setTimeout(() => {
        setCoinFlipVisible(false);
        setDraftActive(true);
        setShowConfetti(false);
        
        // Save draft status
        localStorage.setItem(`draft_status_${competitionCode}`, JSON.stringify({
          active: true,
          currentPick: winnerTeamId,
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
        
        // Trigger draft completion confetti celebration
        const duration = 4000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min: number, max: number) {
          return Math.random() * (max - min) + min;
        }

        // More intense confetti for draft completion
        const interval = setInterval(function() {
          const timeLeft = animationEnd - Date.now();

          if (timeLeft <= 0) {
            return clearInterval(interval);
          }

          const particleCount = 100 * (timeLeft / duration);
          
          // Multiple bursts from different positions
          confetti(Object.assign({}, defaults, { 
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#4169E1']
          }));
          confetti(Object.assign({}, defaults, { 
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#4169E1']
          }));
          confetti(Object.assign({}, defaults, { 
            particleCount: particleCount * 0.7,
            origin: { x: 0.5, y: Math.random() - 0.1 },
            colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#4169E1']
          }));
        }, 250);
        
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
      
      // Handle duplicate participant constraint violation
      const pgError = error as PostgreSQLError;
      if (pgError?.code === '23505' && pgError?.message?.includes('unique_participant_per_team')) {
        toast({
          title: "Player Already on Team",
          description: `${participant.name} is already on this team`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to draft player",
          variant: "destructive",
        });
      }
    }
  };

  const removeParticipant = async (participantId: string, participantName: string) => {
    // Don't allow removing captains
    const isCaptain = teams.some(team => team.captain === participantName);
    if (isCaptain) {
      toast({
        title: "Cannot Remove Captain",
        description: "Team captains cannot be removed",
        variant: "destructive",
      });
      return;
    }

    try {
      // Remove from database
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', participantId);

      if (error) throw error;

      // Update local state
      const updatedTeams = teams.map(team => ({
        ...team,
        participants: team.participants.filter(p => p.id !== participantId)
      }));

      setTeams(updatedTeams);

      toast({
        title: "Participant Removed",
        description: `${participantName} has been removed from the team`,
      });
    } catch (error) {
      console.error('Error removing participant:', error);
      toast({
        title: "Error",
        description: "Failed to remove participant",
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
      <Dialog open={coinFlipVisible} onOpenChange={(open) => !open && closeCoinFlip()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              {teamSelectionPhase ? "Choose Heads or Tails" : "Coin Flip for First Pick"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {teamSelectionPhase 
                ? "Each team picks heads or tails, then we'll flip!"
                : `${teams.find(t => t.id === headsTeamId)?.name} = Heads | ${teams.find(t => t.id === tailsTeamId)?.name} = Tails`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-6">
            {teamSelectionPhase && (
              <>
                <div className="space-y-4 w-full">
                  {teams.map(team => {
                    const teamChoice = headsTeamId === team.id ? 'heads' : tailsTeamId === team.id ? 'tails' : null;
                    return (
                      <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center">
                          <Crown className="h-4 w-4 mr-2 text-yellow-500" />
                          <span className="font-medium">{team.name}</span>
                          {teamChoice && (
                            <Badge variant="secondary" className="ml-2">
                              {teamChoice.charAt(0).toUpperCase() + teamChoice.slice(1)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant={headsTeamId === team.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => selectHeadsTails(team.id, 'heads')}
                            disabled={headsTeamId && headsTeamId !== team.id}
                          >
                            Heads
                          </Button>
                          <Button
                            variant={tailsTeamId === team.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => selectHeadsTails(team.id, 'tails')}
                            disabled={tailsTeamId && tailsTeamId !== team.id}
                          >
                            Tails
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {headsTeamId && tailsTeamId && (
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-3">
                      {teams.find(t => t.id === headsTeamId)?.name} chose Heads, {teams.find(t => t.id === tailsTeamId)?.name} chose Tails
                    </p>
                    <Button onClick={proceedToFlip} size="lg">
                      <Coins className="h-4 w-4 mr-2" />
                      Ready to Flip!
                    </Button>
                  </div>
                )}
              </>
            )}

            {!teamSelectionPhase && !coinFlipping && !coinResult && (
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
        <Card className="border-green-200 bg-green-50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-green-800 flex items-center justify-between">
              <div className="flex items-center">
                <Crown className="h-5 w-5 mr-2" />
                Draft Complete!
              </div>
              <Button
                variant={editMode ? "default" : "outline"}
                size="sm"
                onClick={() => setEditMode(!editMode)}
              >
                {editMode ? "Done Editing" : "Edit Teams"}
              </Button>
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
                    {team.participants
                      .filter(member => member.name !== team.captain) // Don't show captain twice
                      .filter((member, index, arr) => 
                        arr.findIndex(m => m.name === member.name) === index // Remove duplicates by name
                      )
                      .map(member => (
                        <div key={member.id} className="flex items-center gap-2">
                          <Badge variant="secondary">{member.name}</Badge>
                          {editMode && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                              onClick={() => removeParticipant(member.id, member.name)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Total: {team.participants.length} players
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
        {/* Left Sidebar - Participants (only show if draft not complete) */}
        {!draftComplete && (
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
        )}

        {/* Main Area - Teams (only show when draft not complete) */}
        {!draftComplete && (
          <div className="lg:col-span-3">
            <div className="grid md:grid-cols-2 gap-6">
              {teams.map(team => (
                <Card 
                  key={team.id}
                  className={`shadow-sm ${
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
                      {team.participants
                        .filter(member => member.name !== team.captain) // Don't show captain twice
                        .map(member => (
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
                <Card className="border-dashed border-gray-300 shadow-sm">
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
              <div className="mt-8 text-center">
                <Button 
                  onClick={startDraft} 
                  size="lg" 
                  className="px-8 py-6 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Coins className="h-5 w-5 mr-3" />
                  Start Draft
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamDraft;
