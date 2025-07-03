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
    if (!competitionName.trim()) {
      toast({
        title: "Competition Name Required",
        description: "Please enter a competition name.",
        variant: "destructive",
      });
      return;
    }
    
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
    if (!joinCode.trim()) {
      toast({
        title: "Competition Code Required",
        description: "Please enter a competition code.",
        variant: "destructive",
      });
      return;
    }
    
    if (joinCode.length !== 6) {
      toast({
        title: "Invalid Code Length",
        description: "Competition code must be exactly 6 characters.",
        variant: "destructive",
      });
      return;
    }
    
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
    <div className="min-h-screen bg-gray-50/30">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Trophy className="h-16 w-16 text-amber-500 mr-4 drop-shadow-md" />
            <h1 className="text-6xl font-bold text-gray-900 drop-shadow-lg">
              Boast
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            The ultimate team competition organizer for friend groups. Draft teams, compete in activities, and crown the champions!
          </p>
        </div>

        {/* Hero Section: Image + Action Cards */}
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center mb-20">
          {/* Competition Illustration */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative">
              {/* Simple SVG podium - much smaller than 1.3MB image */}
              <div className="w-64 md:w-80 lg:w-96 h-auto hover:scale-105 transition-transform duration-300 drop-shadow-lg">
                <svg viewBox="0 0 300 200" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Podium base */}
                  <rect x="50" y="120" width="60" height="80" fill="#FFD700" stroke="#FFA500" strokeWidth="2" rx="4"/>
                  <rect x="120" y="80" width="60" height="120" fill="#FFD700" stroke="#FFA500" strokeWidth="2" rx="4"/>
                  <rect x="190" y="140" width="60" height="60" fill="#FFD700" stroke="#FFA500" strokeWidth="2" rx="4"/>
                  
                  {/* Podium numbers */}
                  <text x="80" y="165" textAnchor="middle" className="fill-current text-amber-800 font-bold text-2xl">2</text>
                  <text x="150" y="145" textAnchor="middle" className="fill-current text-amber-800 font-bold text-2xl">1</text>
                  <text x="220" y="175" textAnchor="middle" className="fill-current text-amber-800 font-bold text-2xl">3</text>
                  
                  {/* Trophy on top */}
                  <g transform="translate(140, 45)">
                    <ellipse cx="10" cy="15" rx="12" ry="8" fill="#FFD700"/>
                    <rect x="8" y="20" width="4" height="15" fill="#FFA500"/>
                    <rect x="4" y="32" width="12" height="6" fill="#FFD700" rx="2"/>
                    <circle cx="10" cy="10" r="3" fill="#FFF" opacity="0.3"/>
                  </g>
                  
                  {/* Confetti */}
                  <circle cx="70" cy="30" r="2" fill="#FF6B6B"/>
                  <circle cx="230" cy="40" r="2" fill="#4ECDC4"/>
                  <circle cx="40" cy="50" r="2" fill="#45B7D1"/>
                  <circle cx="260" cy="60" r="2" fill="#96CEB4"/>
                  <circle cx="80" cy="20" r="2" fill="#FFEAA7"/>
                  <circle cx="220" cy="25" r="2" fill="#DDA0DD"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Action Cards */}
          <div className="space-y-8 lg:pl-8">
          {/* Create New Competition */}
          <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-white">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Zap className="h-7 w-7 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-xl text-gray-900">Start New Competition</CardTitle>
                  <CardDescription className="text-gray-500">Create a fresh competition and gather your team</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="competition-name" className="text-sm font-medium text-gray-700">Competition Name</Label>
                <Input 
                  id="competition-name"
                  placeholder="e.g., Dawg Olympics 2024"
                  value={competitionName}
                  onChange={(e) => setCompetitionName(e.target.value)}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <Button 
                onClick={handleCreateCompetition}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white border-0 h-11"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Competition"}
              </Button>
            </CardContent>
          </Card>

                      {/* Join Existing Competition */}
            <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-200 bg-white">
              <CardHeader className="pb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-emerald-50 rounded-xl">
                    <Users className="h-7 w-7 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-gray-900">Join Existing Competition</CardTitle>
                    <CardDescription className="text-gray-500">Enter your competition code to join the action</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="join-code" className="text-sm font-medium text-gray-700">Competition Code</Label>
                  <Input 
                    id="join-code"
                    placeholder="Enter 6-character code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    className="border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 uppercase"
                    maxLength={6}
                  />
                </div>
                <Button 
                  onClick={handleJoinCompetition}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-0 h-11"
                  disabled={loading}
                >
                  {loading ? "Joining..." : "Join Competition"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features Preview */}
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Everything you need for epic team competitions
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-white rounded-2xl shadow-md border border-gray-100/50">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-3 text-lg">Team Drafting</h3>
              <p className="text-gray-600 leading-relaxed">Interactive coin flip and drag-and-drop team selection</p>
            </div>
            <div className="text-center p-8 bg-white rounded-2xl shadow-md border border-gray-100/50">
              <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-3 text-lg">Live Scoring</h3>
              <p className="text-gray-600 leading-relaxed">Real-time score tracking for team and individual competitions</p>
            </div>
            <div className="text-center p-8 bg-white rounded-2xl shadow-md border border-gray-100/50">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trophy className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-3 text-lg">Competition Dashboard</h3>
              <p className="text-gray-600 leading-relaxed">Beautiful overview of teams, scores, and achievements</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
