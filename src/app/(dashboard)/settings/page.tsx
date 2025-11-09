'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BluetoothDeviceInfo {
  id: string;
  name: string | undefined;
  connected: boolean;
}

type WebBluetoothDevice = {
  id: string;
  name?: string;
  gatt?: {
    connected: boolean;
    connect: () => Promise<void>;
  } | null;
};

type NavigatorWithBluetooth = typeof navigator & {
  bluetooth?: {
    getDevices?: () => Promise<WebBluetoothDevice[]>;
    requestDevice: (options: {
      acceptAllDevices?: boolean;
      optionalServices?: Array<number | string>;
    }) => Promise<WebBluetoothDevice>;
  };
};

export default function SettingsPage() {
  const [devices, setDevices] = useState<BluetoothDeviceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadGrantedDevices = async () => {
      const nav = navigator as NavigatorWithBluetooth;
      if (!nav.bluetooth?.getDevices) {
        return;
      }
      try {
        const granted = await nav.bluetooth.getDevices();
        setDevices(
          granted.map((device) => ({
            id: device.id,
            name: device.name || 'Unnamed device',
            connected: device.gatt?.connected ?? false,
          })),
        );
      } catch (err) {
        console.warn('Unable to query granted devices', err);
      }
    };

    loadGrantedDevices();
  }, []);

  const handlePairPrinter = async () => {
    setError(null);
    setStatus(null);

    const nav = navigator as NavigatorWithBluetooth;
    if (!nav.bluetooth) {
      setError('Bluetooth API not supported in this browser. Use Chrome/Edge on desktop or Android.');
      return;
    }

    setIsLoading(true);
    try {
      const device = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 0x1812],
      });

      try {
        if (device.gatt && !device.gatt.connected) {
          await device.gatt.connect();
        }
      } catch (connectionError) {
        console.warn('Could not open GATT connection', connectionError);
      }

      setDevices((prev) => {
        const exists = prev.find((item) => item.id === device.id);
        if (exists) {
          return prev.map((item) =>
            item.id === device.id ? { ...item, connected: device.gatt?.connected ?? true } : item,
          );
        }
        return [
          ...prev,
          {
            id: device.id,
            name: device.name || 'Unnamed device',
            connected: device.gatt?.connected ?? true,
          },
        ];
      });

      setStatus(`Paired with ${device.name || 'printer'}.`);
    } catch (err) {
      const domError = err as DOMException;
      if (domError.name === 'NotFoundError') {
        setError('No Bluetooth printer selected.');
      } else if (domError.name === 'SecurityError') {
        setError('Bluetooth pairing was blocked. Ensure the site is served over HTTPS.');
      } else {
        console.error('Bluetooth pairing error', err);
        setError('Unable to pair with printer.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="text-sm text-slate-400">
          Configure receipt printing and connectivity for portable Bluetooth printers.
        </p>
      </div>

      <Card className="border-slate-800 bg-slate-900/60">
        <CardHeader>
          <h2 className="text-lg font-semibold text-white">Bluetooth printers</h2>
          <p className="text-sm text-slate-400">
            Pair handheld Bluetooth printers for instant receipt generation in the field.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handlePairPrinter} className="w-full sm:w-auto" disabled={isLoading}>
            {isLoading ? 'Searching…' : 'Pair new printer'}
          </Button>
          {status ? <p className="text-sm text-emerald-400">{status}</p> : null}
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}

          <div className="space-y-3">
            {devices.length === 0 ? (
              <p className="text-sm text-slate-400">
                No printer connected yet. Press “Pair new printer” to discover nearby devices.
              </p>
            ) : (
              devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-200"
                >
                  <div>
                    <p className="font-medium text-white">{device.name}</p>
                    <p className="text-xs text-slate-400">{device.id}</p>
                  </div>
                  <Badge variant={device.connected ? 'success' : 'secondary'}>
                    {device.connected ? 'Connected' : 'Saved'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

