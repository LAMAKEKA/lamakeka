// Minimal Web Bluetooth API type declarations.
// The full spec is not yet in TypeScript's lib.dom.d.ts for this version.

interface BluetoothDevice {
  gatt?: BluetoothRemoteGATTServer;
  addEventListener(
    type: "gattserverdisconnected",
    listener: EventListenerOrEventListenerObject
  ): void;
}

interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  value: DataView | null;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
}

interface BluetoothRequestDeviceFilter {
  namePrefix?: string;
  services?: string[];
}

interface RequestDeviceOptions {
  filters?: BluetoothRequestDeviceFilter[];
  acceptAllDevices?: boolean;
  optionalServices?: string[];
}

interface Bluetooth {
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
}

interface Navigator {
  bluetooth: Bluetooth;
}
