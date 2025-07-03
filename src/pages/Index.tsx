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
              {/* Landing page image from Supabase storage */}
              <img 
                src="https://qqmtgxwbnxflbttbbbba.supabase.co/storage/v1/object/public/assets//image-landing-page-final.png" 
                alt="Competition trophy and podium illustration"
                className="w-64 md:w-80 lg:w-96 h-auto hover:scale-105 transition-transform duration-300 drop-shadow-lg"
                loading="lazy"
              />
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
