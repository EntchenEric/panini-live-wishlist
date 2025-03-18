'use client';

import { useState, useEffect } from 'react';
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from 'react-toastify';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

type PrioritySelectorProps = {
  url: string;
  urlEnding: string;
  initialPriority?: number;
  isLoggedIn: boolean;
  onPriorityChange?: (priority: number) => void;
};

const getPriorityColor = (priority: number): { bg: string, border: string, text: string } => {
  if (priority <= 3) {
    return { 
      bg: "bg-green-900/30", 
      border: "border-green-800", 
      text: "text-green-400" 
    };
  } else if (priority <= 6) {
    return { 
      bg: "bg-yellow-900/30", 
      border: "border-yellow-800", 
      text: "text-yellow-400" 
    };
  } else {
    return { 
      bg: "bg-red-900/30", 
      border: "border-red-800", 
      text: "text-red-400" 
    };
  }
};

const getPriorityDescription = (priority: number): string => {
  if (priority <= 3) {
      return "High priority";
} else if (priority <= 6) {
    return "Medium priority";
} else {
    return "Low priority";
  }
};

export function PrioritySelector({ url, urlEnding, initialPriority, isLoggedIn, onPriorityChange }: PrioritySelectorProps) {
  const [priority, setPriority] = useState<number | undefined>(initialPriority);
  const [loading, setLoading] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const handleSetPriority = async (value: number) => {
    setLoading(true);
    try {
      const response = await fetch('/api/set_priority', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urlEnding,
          url,
          priority: value
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setPriority(value);
        if (onPriorityChange) {
          onPriorityChange(value);
        }
        toast.success('Priority set successfully!', {
          position: "bottom-right",
          autoClose: 2000,
        });
        
        if (!initialPriority) {
          window.dispatchEvent(new CustomEvent('firstPriorityAdded'));
        }
      } else {
        toast.error(data.message || 'Failed to set priority', {
          position: "bottom-right",
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error('Error setting priority:', error);
      toast.error('An error occurred while setting priority.', {
        position: "bottom-right",
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
      setPopoverOpen(false);
    }
  };

  if (!isLoggedIn) {
    return priority ? (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={`${getPriorityColor(priority).bg} ${getPriorityColor(priority).text} ${getPriorityColor(priority).border} text-xs cursor-help`}
            >
              <Star className={`h-3 w-3 mr-1 fill-current`} /> 
              Priority: {priority}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getPriorityDescription(priority)} (Login to change)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : null;
  }

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        {priority ? (
          <Badge 
            variant="outline" 
            className={`${getPriorityColor(priority).bg} ${getPriorityColor(priority).text} ${getPriorityColor(priority).border} text-xs cursor-pointer hover:brightness-110`}
          >
            <Star className="h-3 w-3 mr-1 fill-current" /> 
            Priority: {priority}
          </Badge>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700 text-xs h-7 px-2"
          >
            <Star className="h-3 w-3 mr-1" /> 
            Set Priority
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2 bg-gray-800 border-gray-700">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-300 mb-2">Select Priority (1-10)</p>
          
          <div className="grid grid-cols-5 gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => {
              const isPrioritySet = priority === value;
              const colors = getPriorityColor(value);
              
              return (
                <TooltipProvider key={value}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        className={`h-8 w-8 p-0 ${
                          isPrioritySet 
                            ? `${colors.bg} ${colors.text} border-2 ${colors.border}` 
                            : `bg-gray-700 hover:${colors.bg} hover:${colors.text} text-gray-200`
                        }`}
                        onClick={() => handleSetPriority(value)}
                      >
                        {value}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{getPriorityDescription(value)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
          
          {priority && (
            <div className="mt-2 text-xs text-gray-400">
              Current: {getPriorityDescription(priority)}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
} 