'use client';

import { useEffect, useState } from 'react';
import * as db from '@/lib/db';
import * as Types from '@/lib/types';
import { Button } from '@/components/ui/button';

function SettingsContent() {
  const [settings, setSettings] = useState<Types.ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    shop_name: '',
    tax_rate: 0,
    currency: 'IDR',
    opening_time: '',
    closing_time: '',
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const loadedSettings = await db.getShopSettings();
        if (loadedSettings) {
          setSettings(loadedSettings);
          setFormData({
            shop_name: loadedSettings.shop_name,
            tax_rate: loadedSettings.tax_rate,
            currency: loadedSettings.currency,
            opening_time: loadedSettings.opening_time || '',
            closing_time: loadedSettings.closing_time || '',
          });
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const updated = await db.updateShopSettings({
        shop_name: formData.shop_name,
        tax_rate: formData.tax_rate,
        currency: formData.currency,
        opening_time: formData.opening_time,
        closing_time: formData.closing_time,
      });

      if (updated) {
        setSettings(updated);
        alert('Settings saved successfully');
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">⚙️ Pengaturan</h2>
        <p className="text-sm text-gray-500">Konfigurasi toko</p>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Shop Name */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Shop Name
              </label>
              <input
                type="text"
                value={formData.shop_name}
                onChange={(e) =>
                  setFormData({ ...formData, shop_name: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Tax Rate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.tax_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, tax_rate: parseFloat(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Currency
                </label>
                <input
                  type="text"
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({ ...formData, currency: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Operating Hours */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Opening Time
                </label>
                <input
                  type="time"
                  value={formData.opening_time}
                  onChange={(e) =>
                    setFormData({ ...formData, opening_time: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Closing Time
                </label>
                <input
                  type="time"
                  value={formData.closing_time}
                  onChange={(e) =>
                    setFormData({ ...formData, closing_time: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-6 border-t border-gray-200">
              <Button
                type="submit"
                disabled={saving}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-2 px-6"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </div>

        {/* System Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4">System Information</h3>
          <div className="space-y-2 text-sm text-blue-900">
            <p>
              <strong>Version:</strong> 1.0.0
            </p>
            <p>
              <strong>Database:</strong> Supabase PostgreSQL
            </p>
            <p>
              <strong>Last Updated:</strong>{' '}
              {settings?.updated_at
                ? new Date(settings.updated_at).toLocaleDateString('id-ID')
                : 'Never'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsContent />;
}
