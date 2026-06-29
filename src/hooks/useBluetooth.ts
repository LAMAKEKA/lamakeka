"use client";

import { useState, useCallback, useRef } from "react";

// Nordic UART Service (NUS) — most common BLE profile for RFID readers.
// Adjust UUIDs if the XRS2i uses a proprietary profile.
const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_TX_UUID      = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"; // device → app

export interface UseBluetoothReturn {
  isSupported: boolean;
  isConnected: boolean;
  lastEid: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
  clearError: () => void;
}

export function useBluetooth(onEid: (eid: string) => void): UseBluetoothReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEid, setLastEid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deviceRef = useRef<BluetoothDevice | null>(null);
  const charRef    = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const onEidRef   = useRef(onEid);
  onEidRef.current = onEid;

  const isSupported =
    typeof navigator !== "undefined" && "bluetooth" in navigator;

  const handleNotification = useCallback((event: Event) => {
    const char = event.target as BluetoothRemoteGATTCharacteristic;
    if (!char.value) return;
    const raw = new TextDecoder().decode(char.value).trim();
    // Strip non-digits; EID is 15 digits (ISO 11784/85)
    const eid = raw.replace(/\D/g, "").slice(0, 15);
    if (eid.length >= 10) {
      setLastEid(eid);
      onEidRef.current(eid);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!isSupported) return;
    setError(null);
    try {
      // Try XRS2i name prefix first; fall back to any device with UART service
      let device: BluetoothDevice;
      try {
        device = await navigator.bluetooth.requestDevice({
          filters: [{ namePrefix: "XRS" }],
          optionalServices: [UART_SERVICE_UUID],
        });
      } catch {
        device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [UART_SERVICE_UUID],
        });
      }

      deviceRef.current = device;

      device.addEventListener("gattserverdisconnected", () => {
        setIsConnected(false);
      });

      const gatt = device.gatt;
      if (!gatt) throw new Error("Este dispositivo no soporta GATT");

      const server  = await gatt.connect();
      const service = await server.getPrimaryService(UART_SERVICE_UUID);
      const char    = await service.getCharacteristic(UART_TX_UUID);

      charRef.current = char;
      await char.startNotifications();
      char.addEventListener("characteristicvaluechanged", handleNotification);

      setIsConnected(true);
    } catch (err) {
      if (err instanceof Error && err.name === "NotFoundError") {
        // User cancelled the device picker — not a real error
        return;
      }
      setError(
        err instanceof Error ? err.message : "Error al conectar el bastón"
      );
    }
  }, [isSupported, handleNotification]);

  const disconnect = useCallback(() => {
    if (charRef.current) {
      charRef.current.removeEventListener(
        "characteristicvaluechanged",
        handleNotification
      );
      charRef.current = null;
    }
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    deviceRef.current = null;
    setIsConnected(false);
  }, [handleNotification]);

  const clearError = useCallback(() => setError(null), []);

  return { isSupported, isConnected, lastEid, connect, disconnect, error, clearError };
}
