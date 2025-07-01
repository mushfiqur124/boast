
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Crown, Coins, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Participant {
  id: string;
  name: string;
  isCaptain: boolean;
  teamId?: string;
}

interface Team {
  id: string;
  name: string;
  captain: string;
  members: string[];
}

const TeamDraft = ({ competitionCode }: { competitionCode: string }) => {
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
    // Load data from localStorage
    const draftData = localStorage.getItem(`draft_${competitionCode}`);
    if (draftData) {
      const data = JSON.parse(draftData);
      setParticipants(data.participants || []);
      setTeams(data.teams || []);
      setDraftActive(data.draftActive || false);
      setCurrentPick(data.currentPick || '');
      setDraftComplete(data.draftComplete || false);
    }
  }, [competitionCode]);

  const saveData = (data: any) => {
    localStorage.setItem(`draft_${competitionCode}`, JSON.stringify(data));
  };

  const addParticipant = () => {
    if (!newParticipantName.trim()) return;
    
    const newParticipant: Participant = {
      id: Date.now().toString(),
      name: newParticipantName.trim(),
      isCaptain: false
    };
    
    const updatedParticipants = [...participants, newParticipant];
    setParticipants(updatedParticipants);
    setNewParticipantName('');
    
    saveData({ participants: updatedParticipants, teams, draftActive, currentPick, draftComplete });
  };

  const makeCaptain = (participantId: string) => {
    if (teams.length >= 2) return;
    
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;

    const newTeam: Team = {
      id: Date.now().toString(),
      name: `Team ${participant.name}`,
      captain: participant.name,
      members: []
    };

    const updatedTeams = [...teams, newTeam];
    const updatedParticipants = participants.map(p => 
      p.id === participantId 
        ? { ...p, isCaptain: true, teamId: newTeam.id }
        : p
    ).filter(p => p.id !== participantId);

    setTeams(updatedTeams);
    setParticipants(updatedParticipants);
    
    saveData({ participants: updatedParticipants, teams: updatedTeams, draftActive, currentPick, draftComplete });
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
        
        const data = { participants, teams, draftActive: true, currentPick: winner.id, draftComplete };
        saveData(data);
      }, 3000);
    }, 2000);
  };

  const draftPlayer = (participantId: string, teamId: string) => {
    if (!draftActive || currentPick !== teamId) return;
    
    const participant = participants.find(p => p.id === participantId);
    if (!participant) return;

    const updatedTeams = teams.map(team => 
      team.id === teamId 
        ? { ...team, members: [...team.members, participant.name] }
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
    }
    
    saveData({ 
      participants: updatedParticipants, 
      teams: updatedTeams, 
      draftActive: updatedParticipants.length > 0, 
      currentPick: nextPick,
      draftComplete: updatedParticipants.length === 0
    });
  };

  const availableParticipants = participants.filter(p => !p.isCaptain);

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
                    {team.members.map(member => (
                      <Badge key={member} variant="secondary">{member}</Badge>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Total: {team.members.length + 1} players
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
                {availableParticipants.map(participant => (
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
                    {team.members.map(member => (
                      <Badge key={member} variant="secondary">{member}</Badge>
                    ))}
                  </div>
                  
                  {draftActive && currentPick === team.id && availableParticipants.length > 0 && (
                    <div className="mt-4 p-3 bg-white rounded border-2 border-dashed border-blue-300">
                      <p className="text-sm text-blue-600 font-medium mb-2">
                        Drag a player here or click to select:
                      </p>
                      <div className="space-y-1">
                        {availableParticipants.map(participant => (
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
