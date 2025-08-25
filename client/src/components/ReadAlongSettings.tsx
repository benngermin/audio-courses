import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Settings, 
  Type, 
  Eye, 
  Palette, 
  Zap, 
  ChevronDown,
  ChevronUp,
  BookOpen,
  Target,
  Clock,
  Sparkles
} from 'lucide-react';

interface ReadAlongSettingsProps {
  // Display settings
  textSize: 'sm' | 'md' | 'lg' | 'xl';
  onTextSizeChange: (size: 'sm' | 'md' | 'lg' | 'xl') => void;
  
  // Behavior settings
  autoScroll: boolean;
  onAutoScrollChange: (enabled: boolean) => void;
  
  // Highlighting settings
  highlightMode: 'sentence' | 'word' | 'both';
  onHighlightModeChange: (mode: 'sentence' | 'word' | 'both') => void;
  
  // Advanced settings
  highlightDelay: number;
  onHighlightDelayChange: (delay: number) => void;
  
  className?: string;
}

export function ReadAlongSettings({
  textSize,
  onTextSizeChange,
  autoScroll,
  onAutoScrollChange,
  highlightMode,
  onHighlightModeChange,
  highlightDelay,
  onHighlightDelayChange,
  className
}: ReadAlongSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const textSizeOptions = [
    { value: 'sm', label: 'Small', description: 'Compact reading' },
    { value: 'md', label: 'Medium', description: 'Default size' },
    { value: 'lg', label: 'Large', description: 'Easy reading' },
    { value: 'xl', label: 'Extra Large', description: 'Maximum legibility' }
  ] as const;

  const highlightModeOptions = [
    { 
      value: 'sentence', 
      label: 'Sentence', 
      description: 'Highlight full sentences',
      icon: BookOpen 
    },
    { 
      value: 'word', 
      label: 'Word', 
      description: 'Highlight individual words',
      icon: Target 
    },
    { 
      value: 'both', 
      label: 'Both', 
      description: 'Sentence + word highlighting',
      icon: Sparkles 
    }
  ] as const;

  const presetSettings = {
    'comfortable': {
      textSize: 'md' as const,
      autoScroll: true,
      highlightMode: 'sentence' as const,
      highlightDelay: 0,
    },
    'focus': {
      textSize: 'lg' as const,
      autoScroll: true,
      highlightMode: 'word' as const,
      highlightDelay: 100,
    },
    'accessibility': {
      textSize: 'xl' as const,
      autoScroll: true,
      highlightMode: 'both' as const,
      highlightDelay: 200,
    }
  };

  const applyPreset = (preset: keyof typeof presetSettings) => {
    const settings = presetSettings[preset];
    onTextSizeChange(settings.textSize);
    onAutoScrollChange(settings.autoScroll);
    onHighlightModeChange(settings.highlightMode);
    onHighlightDelayChange(settings.highlightDelay);
  };

  return (
    <Card className={className}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" />
                Read-Along Settings
                <Badge variant="outline" className="text-xs">
                  {textSize} • {highlightMode}
                </Badge>
              </CardTitle>
              {isExpanded ? 
                <ChevronUp className="h-4 w-4 text-muted-foreground" /> : 
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              }
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Quick Presets */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Quick Setup
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset('comfortable')}
                  className="h-auto p-3 flex flex-col items-center gap-1"
                >
                  <BookOpen className="h-4 w-4" />
                  <span className="text-xs">Comfortable</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset('focus')}
                  className="h-auto p-3 flex flex-col items-center gap-1"
                >
                  <Target className="h-4 w-4" />
                  <span className="text-xs">Focus</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset('accessibility')}
                  className="h-auto p-3 flex flex-col items-center gap-1"
                >
                  <Eye className="h-4 w-4" />
                  <span className="text-xs">Accessible</span>
                </Button>
              </div>
            </div>

            <Tabs defaultValue="display" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="display">Display</TabsTrigger>
                <TabsTrigger value="behavior">Behavior</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>
              
              <TabsContent value="display" className="space-y-4 mt-4">
                {/* Text Size */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Text Size
                  </Label>
                  <Select value={textSize} onValueChange={onTextSizeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {textSizeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex flex-col">
                            <span>{option.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {option.description}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Text Size Preview */}
                  <div className="p-3 border rounded-md bg-slate-50">
                    <p className={`${
                      textSize === 'sm' ? 'text-sm' :
                      textSize === 'md' ? 'text-base' :
                      textSize === 'lg' ? 'text-lg' : 'text-xl'
                    }`}>
                      This is how your text will appear during read-along.
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="behavior" className="space-y-4 mt-4">
                {/* Auto-scroll */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Auto-scroll
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically scroll to follow the current text
                    </p>
                  </div>
                  <Switch
                    checked={autoScroll}
                    onCheckedChange={onAutoScrollChange}
                  />
                </div>

                {/* Highlight Mode */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Highlight Mode
                  </Label>
                  <Select value={highlightMode} onValueChange={onHighlightModeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {highlightModeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <option.icon className="h-4 w-4" />
                            <div className="flex flex-col">
                              <span>{option.label}</span>
                              <span className="text-xs text-muted-foreground">
                                {option.description}
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Highlight Preview */}
                  <div className="p-3 border rounded-md bg-slate-50">
                    <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                    {highlightMode === 'sentence' && (
                      <p className="bg-blue-100 text-blue-900 rounded px-1">
                        This entire sentence would be highlighted.
                      </p>
                    )}
                    {highlightMode === 'word' && (
                      <p>
                        Each <span className="bg-yellow-100 text-yellow-900 rounded px-1">word</span> would be highlighted individually.
                      </p>
                    )}
                    {highlightMode === 'both' && (
                      <p className="bg-blue-50 border-l-2 border-blue-400 pl-2">
                        The sentence is highlighted, plus individual <span className="bg-yellow-100 text-yellow-900 rounded px-1">words</span>.
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4 mt-4">
                {/* Highlight Delay */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Highlight Delay: {highlightDelay}ms
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Delay before highlighting text (useful for preparation time)
                  </p>
                  <Slider
                    value={[highlightDelay]}
                    onValueChange={(value) => onHighlightDelayChange(value[0])}
                    max={1000}
                    min={0}
                    step={50}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Instant</span>
                    <span>1 second</span>
                  </div>
                </div>

                {/* Performance Info */}
                <div className="p-3 border rounded-md bg-blue-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Performance Tips</span>
                  </div>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Word highlighting uses more resources than sentence highlighting</li>
                    <li>• Higher text sizes may affect scroll performance</li>
                    <li>• Auto-scroll can be disabled for manual control</li>
                  </ul>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}