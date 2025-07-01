
import React from 'react';
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trophy, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [competitionName, setCompetitionName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const generateCompetitionCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateCompetition = async () => {
    if (!competitionName.trim()) return;
    
    setLoading(true);
    try {
      const code = generateCompetitionCode();
      
      const { data, error } = await supabase
        .from('competitions')
        .insert([
          {
            name: competitionName.trim(),
            code: code
          }
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Competition Created!",
        description: `Competition "${competitionName}" created with code ${code}`,
      });

      navigate(`/competition/${code}`);
    } catch (error) {
      console.error('Error creating competition:', error);
      toast({
        title: "Error",
        description: "Failed to create competition. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCompetition = async () => {
    if (!joinCode.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .eq('code', joinCode.toUpperCase())
        .single();

      if (error) {
        toast({
          title: "Competition Not Found",
          description: "Please check the code and try again.",
          variant: "destructive",
        });
        return;
      }

      navigate(`/competition/${joinCode.toUpperCase()}`);
    } catch (error) {
      console.error('Error joining competition:', error);
      toast({
        title: "Error",
        description: "Failed to join competition. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
                disabled={!competitionName.trim() || loading}
              >
                {loading ? "Creating..." : "Create Competition"}
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
                disabled={joinCode.length !== 6 || loading}
              >
                {loading ? "Joining..." : "Join Competition"}
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
