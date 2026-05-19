// ============================================================================
// PERIOD SELECTOR COMPONENT
// ============================================================================
// File: app/dashboard/reports/components/PeriodSelector.tsx
// Description: Date range and outlet selector for reports
// Version: 1.0
// Date: 2026-05-06
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { getTodayWIB } from '@/lib/utils/timezone'; // ✅ WIB
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';

interface PeriodSelectorProps {
  startDate: string;
  endDate: string;
  outletId: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onOutletChange: (outletId: string) => void;
}

interface Outlet {
  id: string;
  nama: string;
}

export function PeriodSelector({
  startDate,
  endDate,
  outletId,
  onStartDateChange,
  onEndDateChange,
  onOutletChange,
}: PeriodSelectorProps) {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [outletsLoading, setOutletsLoading] = useState(false);

  // Fetch outlets
  useEffect(() => {
    const fetchOutlets = async () => {
      setOutletsLoading(true);
      try {
        const response = await fetch('/api/outlets');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setOutlets(data.data);
          }
        }
      } catch (error) {
        console.error('Error fetching outlets:', error);
      } finally {
        setOutletsLoading(false);
      }
    };

    fetchOutlets();
  }, []);

  // Quick period presets
  const handlePresetPeriod = (preset: 'week' | 'month' | 'quarter') => {
    const today = new Date();
    const end = getTodayWIB(); // ✅ WIB
    let start = '';

    switch (preset) {
      case 'week':
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        start = getTodayWIB(lastWeek); // ✅ WIB
        break;
      case 'month':
        const lastMonth = new Date(today);
        lastMonth.setMonth(today.getMonth() - 1);
        start = getTodayWIB(lastMonth); // ✅ WIB
        break;
      case 'quarter':
        const lastQuarter = new Date(today);
        lastQuarter.setMonth(today.getMonth() - 3);
        start = getTodayWIB(lastQuarter); // ✅ WIB
        break;
    }

    onStartDateChange(start);
    onEndDateChange(end);
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="start-date">Tanggal Mulai</Label>
            <div className="relative">
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                max={endDate}
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="end-date">Tanggal Akhir</Label>
            <div className="relative">
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                min={startDate}
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Outlet Filter */}
          <div className="space-y-2">
            <Label htmlFor="outlet">Outlet</Label>
            <Select
              value={outletId}
              onValueChange={onOutletChange}
              disabled={outletsLoading}
            >
              <SelectTrigger id="outlet">
                <SelectValue placeholder="Semua Outlet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Semua Outlet</SelectItem>
                {outlets.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id}>
                    {outlet.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <Label>Periode Cepat</Label>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePresetPeriod('week')}
                className="flex-1"
              >
                7 Hari
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePresetPeriod('month')}
                className="flex-1"
              >
                30 Hari
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePresetPeriod('quarter')}
                className="flex-1"
              >
                90 Hari
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
