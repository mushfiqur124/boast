
import React from 'react';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const [competitionName, setCompetitionName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const navigate = useNavigate();

  const generateCompetitionCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateCompetition = () => {
    if (!competitionName.trim()) return;
    
    const code = generateCompetitionCode();
    const competition = {
      id: Date.now().toString(),
      name: competitionName,
      code: code,
      createdAt: new Date().toISOString()
    };
    
    // Store in localStorage for now (will be replaced with Supabase)
    localStorage.setItem(`competition_${code}`, JSON.stringify(competition));
    navigate(`/competition/${code}`);
  };

  const handleJoinCompetition = () => {
    if (!joinCode.trim()) return;
    
    const competition = localStorage.getItem(`competition_${joinCode.toUpperCase()}`);
    if (competition) {
      navigate(`/competition/${joinCode.toUpperCase()}`);
    } else {
      alert('Competition not found. Please check the code and try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="h-12 w-12 text-yellow-500 mr-3" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Boast
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            The ultimate team competition organizer for friend groups. Draft teams, compete in activities, and crown the champions!
          </p>
        </div>

        {/* Main Action Cards */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8 mb-12">
          {/* Create New Competition */}
          <Card className="relative overflow-hidden border-2 border-blue-200 hover:border-blue-300 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
            <CardHeader className="relative">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Start New Competition</CardTitle>
                  <CardDescription>Create a fresh competition and gather your team</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative space-y-4">
              <div className="space-y-2">
                <Label htmlFor="competition-name">Competition Name</Label>
                <Input 
                  id="competition-name"
                  placeholder="e.g., Dawg Olympics 2024"
                  value={competitionName}
                  onChange={(e) => setCompetitionName(e.target.value)}
                  className="border-blue-200 focus:border-blue-400"
                />
              </div>
              <Button 
                onClick={handleCreateCompetition}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                disabled={!competitionName.trim()}
              >
                Create Competition
              </Button>
            </CardContent>
          </Card>

          {/* Join Existing Competition */}
          <Card className="relative overflow-hidden border-2 border-green-200 hover:border-green-300 transition-colors">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-teal-500/5" />
            <CardHeader className="relative">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Join Existing Competition</CardTitle>
                  <CardDescription>Enter your competition code to join the action</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative space-y-4">
              <div className="space-y-2">
                <Label htmlFor="join-code">Competition Code</Label>
                <Input 
                  id="join-code"
                  placeholder="Enter 6-character code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="border-green-200 focus:border-green-400 uppercase"
                  maxLength={6}
                />
              </div>
              <Button 
                onClick={handleJoinCompetition}
                className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white"
                disabled={joinCode.length !== 6}
              >
                Join Competition
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features Preview */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-800">
            Everything you need for epic team competitions
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Team Drafting</h3>
              <p className="text-sm text-gray-600">Interactive coin flip and drag-and-drop team selection</p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Live Scoring</h3>
              <p className="text-sm text-gray-600">Real-time score tracking for team and individual competitions</p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Competition Dashboard</h3>
              <p className="text-sm text-gray-600">Beautiful overview of teams, scores, and achievements</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
