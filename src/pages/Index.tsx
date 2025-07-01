
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trophy, Users } from "lucide-react";

const Index = () => {
  const [competitionName, setCompetitionName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const createCompetition = async () => {
    if (!competitionName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a competition name",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const code = generateCode();
      
      const { data, error } = await supabase
        .from('competitions')
        .insert([
          { name: competitionName.trim(), code }
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "🎉 Competition Created!",
        description: `Your competition code is: ${code}`,
      });

      navigate(`/competition/${code}`);
    } catch (error) {
      console.error('Error creating competition:', error);
      toast({
        title: "Error",
        description: "Failed to create competition. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const joinCompetition = async () => {
    if (!joinCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a competition code",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .eq('code', joinCode.trim().toUpperCase())
        .single();

      if (error || !data) {
        toast({
          title: "Error",
          description: "Competition not found. Please check your code.",
          variant: "destructive"
        });
        return;
      }

      navigate(`/competition/${joinCode.trim().toUpperCase()}`);
    } catch (error) {
      console.error('Error joining competition:', error);
      toast({
        title: "Error",
        description: "Failed to join competition. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Trophy className="h-12 w-12 text-yellow-500 mr-3" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Boast
            </h1>
          </div>
          <p className="text-xl text-gray-600">
            🏆 The ultimate team competition organizer for friend groups
          </p>
        </div>

        {/* Action Cards */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Create Competition */}
          <Card className="border-2 hover:border-blue-300 transition-colors shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Start New Competition</CardTitle>
              <CardDescription className="text-base">
                🚀 Create a fresh competition and invite your friends
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="competition-name" className="text-sm font-medium">
                  Competition Name
                </Label>
                <Input
                  id="competition-name"
                  placeholder="e.g., Summer Olympics 2024"
                  value={competitionName}
                  onChange={(e) => setCompetitionName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createCompetition()}
                  className="mt-1"
                />
              </div>
              <Button 
                onClick={createCompetition} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold"
                disabled={loading}
              >
                {loading ? "Creating..." : "🎯 Create Competition"}
              </Button>
            </CardContent>
          </Card>

          {/* Join Competition */}
          <Card className="border-2 hover:border-green-300 transition-colors shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Trophy className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl">Join Competition</CardTitle>
              <CardDescription className="text-base">
                🎲 Enter your competition code to join the fun
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="join-code" className="text-sm font-medium">
                  Competition Code
                </Label>
                <Input
                  id="join-code"
                  placeholder="Enter 6-digit code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && joinCompetition()}
                  className="mt-1 font-mono text-center text-lg tracking-wider"
                  maxLength={6}
                />
              </div>
              <Button 
                onClick={joinCompetition} 
                className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-semibold"
                disabled={loading}
              >
                {loading ? "Joining..." : "🚪 Join Competition"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Info Section */}
        <div className="max-w-2xl mx-auto mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">How it works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-2">👥</div>
              <h3 className="font-semibold mb-2">Draft Teams</h3>
              <p className="text-gray-600 text-sm">Pick captains and draft players with our interactive system</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-2">🏃‍♂️</div>
              <h3 className="font-semibold mb-2">Compete</h3>
              <p className="text-gray-600 text-sm">Track scores across team and individual challenges</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="text-3xl mb-2">🏆</div>
              <h3 className="font-semibold mb-2">Crown Winners</h3>
              <p className="text-gray-600 text-sm">Real-time leaderboard and final championship results</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
