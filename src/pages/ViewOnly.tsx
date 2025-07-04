import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Dashboard from '@/components/Dashboard';

const ViewOnly = () => {
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

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <Eye className="h-6 w-6 text-gray-500" />
                <span className="text-sm text-gray-500 font-medium">View Only</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{competition.name}</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="container mx-auto px-4 py-6">
        <Dashboard competitionCode={code} competitionId={competition.id} />
      </div>
    </div>
  );
};

export default ViewOnly; 