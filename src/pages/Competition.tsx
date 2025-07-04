import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Share2, Trophy, AlertCircle, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import TeamDraft from '@/components/TeamDraft';
import Activities from '@/components/Activities';
import Scoring from '@/components/Scoring';
import Dashboard from '@/components/Dashboard';
import CompetitionResults from '@/components/CompetitionResults';

const Competition = () => {
  const { code } = useParams();
  const [competition, setCompetition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEndModal, setShowEndModal] = useState(false);
  const [endingCompetition, setEndingCompetition] = useState(false);

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

  const shareViewOnlyUrl = () => {
    const viewUrl = `${window.location.origin}/view/${code}`;
    navigator.clipboard.writeText(viewUrl);
    toast({
      title: "View link copied!",
      description: "View-only link copied to clipboard",
    });
  };

  const endCompetition = async () => {
    if (!competition) return;
    
    setEndingCompetition(true);
    try {
      const { error } = await supabase
        .from('competitions')
        .update({ status: 'ended' })
        .eq('id', competition.id);

      if (error) throw error;

      setCompetition({ ...competition, status: 'ended' });
      setShowEndModal(false);
      
      toast({
        title: "Competition Ended!",
        description: "The competition has been finalized. View the results below!",
      });
    } catch (error) {
      console.error('Error ending competition:', error);
      toast({
        title: "Error",
        description: "Failed to end competition. Please try again.",
        variant: "destructive",
      });
    } finally {
      setEndingCompetition(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading competition...</p>
        </div>
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="min-h-screen bg-gray-50/30 flex items-center justify-center">
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

  // Show results screen if competition is ended
  if (competition?.status === 'ended') {
    return <CompetitionResults competitionCode={code} competitionId={competition.id} />;
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* End Competition Modal */}
      <Dialog open={showEndModal} onOpenChange={setShowEndModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              End Competition?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to end this competition? Once ended, you won't be able to edit activities, scores, or team compositions anymore. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => setShowEndModal(false)}
              disabled={endingCompetition}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={endCompetition}
              disabled={endingCompetition}
            >
              {endingCompetition ? "Ending..." : "Yes, End Competition"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{competition.name}</h1>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="outline" className="font-mono text-sm">
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
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" onClick={shareViewOnlyUrl}>
                <Eye className="h-4 w-4 mr-2" />
                Share View
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setShowEndModal(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <Trophy className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">End Competition</span>
                <span className="sm:hidden">End</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="draft" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 h-14 bg-gray-100/60 rounded-xl p-1">
            <TabsTrigger value="draft" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg font-medium text-base">Team Draft</TabsTrigger>
            <TabsTrigger value="activities" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg font-medium text-base">Activities</TabsTrigger>
            <TabsTrigger value="scoring" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg font-medium text-base">Scoring</TabsTrigger>
            <TabsTrigger value="dashboard" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg font-medium text-base">Dashboard</TabsTrigger>
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
