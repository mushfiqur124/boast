
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import TeamDraft from '@/components/TeamDraft';
import Activities from '@/components/Activities';
import Scoring from '@/components/Scoring';
import Dashboard from '@/components/Dashboard';

const Competition = () => {
  const { code } = useParams();
  const [competition, setCompetition] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (code) {
      loadCompetition();
    }
  }, [code]);

  const loadCompetition = async () => {
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .eq('code', code)
        .single();

      if (error) {
        console.error('Error loading competition:', error);
        setCompetition(null);
      } else {
        setCompetition(data);
      }
    } catch (error) {
      console.error('Error loading competition:', error);
      setCompetition(null);
    } finally {
      setLoading(false);
    }
  };

  const copyCodeToClipboard = () => {
    navigator.clipboard.writeText(code || '');
    toast({
      title: "Code copied!",
      description: "Competition code copied to clipboard",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading competition...</p>
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Competition Not Found</h1>
          <p className="text-gray-600 mb-4">The competition code "{code}" could not be found.</p>
          <Button onClick={() => window.location.href = '/'}>
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{competition.name}</h1>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="outline" className="font-mono">
                  {code}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyCodeToClipboard}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={copyCodeToClipboard}>
              <Share2 className="h-4 w-4 mr-2" />
              Share Code
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="draft" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="draft">Team Draft</TabsTrigger>
            <TabsTrigger value="activities">Activities</TabsTrigger>
            <TabsTrigger value="scoring">Scoring</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          </TabsList>

          <TabsContent value="draft">
            <TeamDraft competitionCode={code} competitionId={competition.id} />
          </TabsContent>

          <TabsContent value="activities">
            <Activities competitionCode={code} competitionId={competition.id} />
          </TabsContent>

          <TabsContent value="scoring">
            <Scoring competitionCode={code} competitionId={competition.id} />
          </TabsContent>

          <TabsContent value="dashboard">
            <Dashboard competitionCode={code} competitionId={competition.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Competition;
