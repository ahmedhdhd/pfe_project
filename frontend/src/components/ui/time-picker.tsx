"use client";

import * as React from "react";
import { Clock, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TimePickerProps {
  value?: string; // Format: "HH:MM" (24-hour)
  onChange?: (time: string) => void;
  className?: string;
  error?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function TimePicker({
  value,
  onChange,
  className,
  error,
  placeholder = "Select time",
  disabled = false,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedHour, setSelectedHour] = React.useState<number | null>(null);
  const [selectedMinute, setSelectedMinute] = React.useState<number | null>(
    null
  );
  const [period, setPeriod] = React.useState<"AM" | "PM">("AM");
  const hourScrollRef = React.useRef<HTMLDivElement>(null);
  const minuteScrollRef = React.useRef<HTMLDivElement>(null);

  // Parse initial value
  React.useEffect(() => {
    if (value) {
      const [hours, minutes] = value.split(":").map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        if (hours === 0) {
          setSelectedHour(12);
          setPeriod("AM");
        } else if (hours < 12) {
          setSelectedHour(hours);
          setPeriod("AM");
        } else if (hours === 12) {
          setSelectedHour(12);
          setPeriod("PM");
        } else {
          setSelectedHour(hours - 12);
          setPeriod("PM");
        }
        setSelectedMinute(minutes);
      }
    }
  }, [value]);

  const handleTimeSelect = (
    hour: number,
    minute: number,
    selectedPeriod: "AM" | "PM"
  ) => {
    let hour24 = hour;
    if (selectedPeriod === "AM" && hour === 12) {
      hour24 = 0;
    } else if (selectedPeriod === "PM" && hour !== 12) {
      hour24 = hour + 12;
    }

    const timeString = `${hour24.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
    onChange?.(timeString);
    setOpen(false);
  };

  const handleHourClick = (hour: number) => {
    setSelectedHour(hour);
    if (selectedMinute !== null) {
      handleTimeSelect(hour, selectedMinute, period);
    }
  };

  const handleMinuteClick = (minute: number) => {
    setSelectedMinute(minute);
    if (selectedHour !== null) {
      handleTimeSelect(selectedHour, minute, period);
    }
  };

  const scrollHour = (direction: "up" | "down") => {
    if (hourScrollRef.current) {
      const scrollAmount = 36; // Approximate button height + margin
      hourScrollRef.current.scrollBy({
        top: direction === "down" ? scrollAmount : -scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const scrollMinute = (direction: "up" | "down") => {
    if (minuteScrollRef.current) {
      const scrollAmount = 36; // Approximate button height + margin
      minuteScrollRef.current.scrollBy({
        top: direction === "down" ? scrollAmount : -scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const formatDisplayTime = () => {
    if (!value) return "";
    const [hours, minutes] = value.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return "";

    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const displayPeriod = hours >= 12 ? "PM" : "AM";
    return `${hour12.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")} ${displayPeriod}`;
  };

  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            error && "border-red-500",
            className
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value ? formatDisplayTime() : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <div className="flex">
          {/* Hours */}
          <div className="w-[70px] border-r">
            <div className="flex items-center justify-between px-2 py-1 border-b">
              <span className="text-xs font-semibold">Hour</span>
              <div className="flex flex-col">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={() => scrollHour("up")}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={() => scrollHour("down")}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div ref={hourScrollRef} className="h-[200px] overflow-y-auto">
              <div className="p-1">
                {hours.map((hour) => (
                  <Button
                    key={hour}
                    variant={selectedHour === hour ? "default" : "ghost"}
                    className="w-full mb-1 h-8 text-xs"
                    size="sm"
                    onClick={() => handleHourClick(hour)}
                  >
                    {hour.toString().padStart(2, "0")}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Minutes */}
          <div className="w-[70px] border-r">
            <div className="flex items-center justify-between px-2 py-1 border-b">
              <span className="text-xs font-semibold">Min</span>
              <div className="flex flex-col">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={() => scrollMinute("up")}
                >
                  <ChevronUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={() => scrollMinute("down")}
                >
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div ref={minuteScrollRef} className="h-[200px] overflow-y-auto">
              <div className="p-1">
                {minutes.map((minute) => (
                  <Button
                    key={minute}
                    variant={selectedMinute === minute ? "default" : "ghost"}
                    className="w-full mb-1 h-8 text-xs"
                    size="sm"
                    onClick={() => handleMinuteClick(minute)}
                  >
                    {minute.toString().padStart(2, "0")}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* AM/PM */}
          <div className="w-[100px]">
            <div className="p-2 text-center text-xs font-semibold border-b">
              Period
            </div>
            <div className="p-2 space-y-2">
              <Button
                variant={period === "AM" ? "default" : "ghost"}
                className="w-full"
                size="sm"
                onClick={() => {
                  setPeriod("AM");
                  if (selectedHour !== null && selectedMinute !== null) {
                    handleTimeSelect(selectedHour, selectedMinute, "AM");
                  }
                }}
              >
                AM
              </Button>
              <Button
                variant={period === "PM" ? "default" : "ghost"}
                className="w-full"
                size="sm"
                onClick={() => {
                  setPeriod("PM");
                  if (selectedHour !== null && selectedMinute !== null) {
                    handleTimeSelect(selectedHour, selectedMinute, "PM");
                  }
                }}
              >
                PM
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
