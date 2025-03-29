"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/theme-toggle";
import * as chrono from "chrono-node";

// Helper function to map weekday names to cron numbers
const getWeekdayNumber = (day: string): string | null => {
  const lowerDay = day.toLowerCase();
  const map: { [key: string]: string } = {
    sun: "0", sunday: "0",
    mon: "1", monday: "1",
    tue: "2", tuesday: "2",
    wed: "3", wednesday: "3",
    thu: "4", thursday: "4",
    fri: "5", friday: "5",
    sat: "6", saturday: "6",
  };
  return map[lowerDay] || null;
};

// Helper function to parse ordinal numbers (e.g., "second" -> 2)
const parseOrdinal = (ordinal: string): number | null => {
  const lowerOrdinal = ordinal.toLowerCase();
  const map: { [key: string]: number } = {
    first: 1, second: 2, third: 3, fourth: 4, fifth: 5, // Add more if needed
    '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5,
  };
  return map[lowerOrdinal] || null;
};

export default function Home() {
  const [minute, setMinute] = useState("*");
  const [hour, setHour] = useState("*");
  const [dayOfMonth, setDayOfMonth] = useState("*");
  const [month, setMonth] = useState("*");
  const [dayOfWeek, setDayOfWeek] = useState("*");
  const [command, setCommand] = useState("");
  const [cronString, setCronString] = useState("");
  const [naturalLanguage, setNaturalLanguage] = useState("");

  const parseNaturalLanguage = () => {
    const input = naturalLanguage.trim().toLowerCase();
    let parsed = false;

    // Reset fields to default before parsing
    setMinute("*");
    setHour("*");
    setDayOfMonth("*");
    setMonth("*");
    setDayOfWeek("*");

    // --- Simple Recurring Patterns ---

    // Pattern: every N minutes
    let match = input.match(/every\s+(\d+)\s+minutes?/);
    if (match && match[1]) {
      setMinute(`*/${match[1]}`);
      parsed = true;
    }

    // Pattern: every N hours / hourly
    match = input.match(/every\s+(\d+)\s+hours?/);
    if (!parsed && match && match[1]) {
      setMinute("0");
      setHour(`*/${match[1]}`);
      parsed = true;
    } else if (!parsed && input.includes("hourly")) {
        setMinute("0");
        setHour("*"); // Could also be */1, but * is simpler
        parsed = true;
    }

    // Pattern: daily / every day (potentially with time)
    if (!parsed && (input.includes("daily") || input.includes("every day"))) {
      setMinute("0"); // Default to midnight if no time specified
      setHour("0");
      // Let chrono handle potential time specifier later
      parsed = true;
    }

    // Pattern: weekly / every week (potentially on a specific day/time)
    if (!parsed && (input.includes("weekly") || input.includes("every week"))) {
        setMinute("0");
        setHour("0");
        setDayOfWeek("0"); // Default to Sunday midnight if no day/time specified
        // Let chrono handle potential day/time specifier later
        parsed = true;
    }

    // Pattern: monthly / every month (potentially on a specific day/time)
     if (!parsed && (input.includes("monthly") || input.includes("every month"))) {
        setMinute("0");
        setHour("0");
        setDayOfMonth("1"); // Default to 1st day at midnight
         // Let chrono handle potential day/time specifier later
        parsed = true;
    }

    // Pattern: every [Nth] [weekday]
    match = input.match(/every\s+(first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th)\s+(sun|mon|tue|wed|thu|fri|sat|sunday|monday|tuesday|wednesday|thursday|friday|saturday)/);
    if (!parsed && match && match[1] && match[2]) {
        const ordinal = parseOrdinal(match[1]);
        const weekday = getWeekdayNumber(match[2]);
        if (ordinal && weekday) {
            // Cron doesn't directly support "every Nth weekday" in a simple way like steps.
            // The common interpretation is "at minute 0 on day-of-month 1-7/8-14/etc. and on weekday X"
            // This gets complex quickly. A simpler approximation is using steps if N <= 4.
            // For N=1 (every first), it's just that weekday.
            // For N=2 (every second), use /2 step.
            // This is an approximation!
            if (ordinal === 1) {
                 setDayOfWeek(weekday);
            } else if (ordinal <= 4) { // Approximate using steps for 2nd, 3rd, 4th
                setDayOfWeek(`${weekday}/${ordinal}`);
            }
            // else { handle 5th/last specifically if needed }

            setMinute("0"); // Default time
            setHour("0");
            parsed = true;
        }
    }

    // --- Fallback to chrono-node for specific dates/times or refining recurring patterns ---
    const results = chrono.parse(input);
    if (results.length > 0) {
      const parsedDate = results[0].start.date();
      
      // Update only fields explicitly extracted from the parsed date
      if (parsedDate) {
        // Only update if we didn't already identify a recurring pattern
        // or if we're refining a recurring pattern with a specific time
        if (!parsed || (parsed && (results[0].text.includes("at") || results[0].text.includes(":")))) {
          setMinute(parsedDate.getMinutes().toString());
          setHour(parsedDate.getHours().toString());
        }
        
        // Only set day/month/weekday if we didn't parse a broad recurrence pattern
        if (!parsed) {
          setDayOfMonth(parsedDate.getDate().toString());
          setMonth((parsedDate.getMonth() + 1).toString()); // getMonth() returns 0-11
          setDayOfWeek(parsedDate.getDay().toString()); // getDay() returns 0-6 (Sunday-Saturday)
        }
      }
      
      // We successfully used chrono
      parsed = true;
    }

    // If nothing was parsed, reset to defaults (already done at the start)
    if (!parsed) {
      console.log("Could not parse input, resetting to defaults.");
      // Optionally add user feedback here
    }
  };

  const generateCronString = () => {
    const cron = `${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek} ${command}`;
    setCronString(cron);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(cronString);
    // Optional: Add user feedback (e.g., toast notification)
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Cron Job Generator</CardTitle>
            <CardDescription>Create your cron schedule easily using natural language or manual input.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Natural Language Input */}
          <div className="space-y-2">
            <Label htmlFor="naturalLanguage">Natural Language Schedule</Label>
            <div className="flex gap-2">
              <Textarea
                id="naturalLanguage"
                value={naturalLanguage}
                onChange={(e) => setNaturalLanguage(e.target.value)}
                placeholder="e.g., every day at 5:30 AM"
                className="flex-1"
              />
              <Button onClick={parseNaturalLanguage} variant="secondary">
                Parse
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {/* Minute */}
            <div className="space-y-2">
              <Label htmlFor="minute">Minute</Label>
              <Input id="minute" value={minute} onChange={(e) => setMinute(e.target.value)} placeholder="*" />
            </div>
            {/* Hour */}
            <div className="space-y-2">
              <Label htmlFor="hour">Hour</Label>
              <Input id="hour" value={hour} onChange={(e) => setHour(e.target.value)} placeholder="*" />
            </div>
            {/* Day of Month */}
            <div className="space-y-2">
              <Label htmlFor="dayOfMonth">Day (Month)</Label>
              <Input id="dayOfMonth" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} placeholder="*" />
            </div>
            {/* Month */}
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Input id="month" value={month} onChange={(e) => setMonth(e.target.value)} placeholder="*" />
            </div>
            {/* Day of Week */}
            <div className="space-y-2">
              <Label htmlFor="dayOfWeek">Day (Week)</Label>
              <Input id="dayOfWeek" value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} placeholder="*" />
            </div>
          </div>

          {/* Command */}
          <div className="space-y-2">
            <Label htmlFor="command">Command</Label>
            <Input
              id="command"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="/usr/bin/php /path/to/script.php"
            />
          </div>

          {/* Generate Button */}
          <Button onClick={generateCronString} className="w-full">Generate Cron String</Button>

          {/* Result */}
          {cronString && (
            <div className="space-y-2 pt-4">
              <Label>Generated Cron String</Label>
              <div className="flex w-full items-center space-x-2">
                <Input value={cronString} readOnly className="flex-1" />
                <Button variant="outline" size="icon" onClick={copyToClipboard}>
                  Copy
                </Button>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            Try natural language inputs like: "every day at 5:30 AM", "every Monday at 3 PM", "15 minutes past the hour"
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}
