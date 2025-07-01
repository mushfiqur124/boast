
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, Save } from "lucide-react";

interface ScoringRules {
  teamWin: number;
  teamLoss: number;
  firstPlace: number;
  secondPlace: number;
  lastPlace: number;
}

const Scoring = ({ competitionCode }: { competitionCode: string }) => {
  const [scoringRules, setScoringRules] = useState<ScoringRules>({
    teamWin: 50,
    teamLoss: 0,
    firstPlace: 10,
    secondPlace: 5,
    lastPlace: -5
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const savedRules = localStorage.getItem(`scoring_${competitionCode}`);
    if (savedRules) {
      setScoringRules(JSON.parse(savedRules));
    }
  }, [competitionCode]);

  const updateRule = (key: keyof ScoringRules, value: string) => {
    const numValue = parseInt(value) || 0;
    setScoringRules(prev => ({ ...prev, [key]: numValue }));
    setHasChanges(true);
  };

  const saveRules = () => {
    localStorage.setItem(`scoring_${competitionCode}`, JSON.stringify(scoringRules));
    setHasChanges(false);
  };

  const resetToDefaults = () => {
    setScoringRules({
      teamWin: 50,
      teamLoss: 0,
      firstPlace: 10,
      secondPlace: 5,
      lastPlace: -5
    });
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Settings className="h-6 w-6 mr-2" />
            Scoring Configuration
          </h2>
          <p className="text-gray-600">Customize point values for your competition</p>
        </div>
        {hasChanges && (
          <Button onClick={saveRules}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Team Competition Scoring */}
        <Card>
          <CardHeader>
            <CardTitle>Team Competition Scoring</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="team-win">Team Win Points</Label>
              <Input
                id="team-win"
                type="number"
                value={scoringRules.teamWin}
                onChange={(e) => updateRule('teamWin', e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Points awarded to the winning team
              </p>
            </div>
            
            <div>
              <Label htmlFor="team-loss">Team Loss Points</Label>
              <Input
                id="team-loss"
                type="number"
                value={scoringRules.teamLoss}
                onChange={(e) => updateRule('teamLoss', e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Points awarded to the losing team
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Individual Competition Scoring */}
        <Card>
          <CardHeader>
            <CardTitle>Individual Competition Bonuses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="first-place">1st Place Bonus</Label>
              <Input
                id="first-place"
                type="number"
                value={scoringRules.firstPlace}
                onChange={(e) => updateRule('firstPlace', e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Additional points for individual 1st place
              </p>
            </div>
            
            <div>
              <Label htmlFor="second-place">2nd Place Bonus</Label>
              <Input
                id="second-place"
                type="number"
                value={scoringRules.secondPlace}
                onChange={(e) => updateRule('secondPlace', e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Additional points for individual 2nd place
              </p>
            </div>
            
            <div>
              <Label htmlFor="last-place">Last Place Penalty</Label>
              <Input
                id="last-place"
                type="number"
                value={scoringRules.lastPlace}
                onChange={(e) => updateRule('lastPlace', e.target.value)}
                className="mt-1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Points deducted for individual last place
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scoring Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Scoring Examples</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-blue-600">Team Competition Example</h4>
              <p className="text-sm text-gray-600">
                Beer Pong: Team Alpha wins → Team Alpha gets +{scoringRules.teamWin} points, Team Beta gets +{scoringRules.teamLoss} points
              </p>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="font-semibold text-purple-600">Individual Competition Example</h4>
              <p className="text-sm text-gray-600">
                Push-ups: Team Alpha wins overall (more total push-ups) → Team Alpha gets +{scoringRules.teamWin} points
              </p>
              <p className="text-sm text-gray-600">
                Plus individual bonuses: John (1st place) adds +{scoringRules.firstPlace} to his team, 
                Sarah (2nd place) adds +{scoringRules.secondPlace} to her team, 
                Mike (last place) loses {Math.abs(scoringRules.lastPlace)} from his team
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset to Defaults */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={resetToDefaults}>
          Reset to Default Values
        </Button>
      </div>
    </div>
  );
};

export default Scoring;
