import { validatePublicApiOptions } from "../public-api-schema.js";

export type PermissionSetting = "granted" | "denied" | "prompt";

export type PermissionDescriptorObject = {
  name: string;
  sysex?: boolean;
  userVisibleOnly?: boolean;
  allowWithoutSanitization?: boolean;
  allowWithoutGesture?: boolean;
  panTiltZoom?: boolean;
};

export type PermissionDescriptorInput = string | PermissionDescriptorObject;

export type PermissionOriginOptions = {
  origin?: string;
};

export type GeolocationCoordinates = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

const PERMISSION_SETTINGS = new Set<PermissionSetting>([
  "granted",
  "denied",
  "prompt",
]);

const DESCRIPTOR_BOOLEAN_FIELDS = new Set([
  "sysex",
  "userVisibleOnly",
  "allowWithoutSanitization",
  "allowWithoutGesture",
  "panTiltZoom",
]);

// Maps Ego Lite user-control reason keys and CDP PermissionType camelCase names
// to Chromium CDP Browser.setPermission PermissionDescriptor objects.
const PERMISSION_ALIASES: Record<
  string,
  readonly PermissionDescriptorObject[]
> = {
  location: [{ name: "geolocation" }],
  clipboard: [{ name: "clipboard-read" }, { name: "clipboard-write" }],
  clipboardReadWrite: [{ name: "clipboard-read" }, { name: "clipboard-write" }],
  clipboardSanitizedWrite: [{ name: "clipboard-write" }],
  videoCapture: [{ name: "camera" }],
  audioCapture: [{ name: "microphone" }],
  pan_tilt_zoom_microphone: [
    { name: "camera", panTiltZoom: true },
    { name: "microphone" },
  ],
  midiSysex: [{ name: "midi", sysex: true }],
  "midi-sysex": [{ name: "midi", sysex: true }],
  local_fonts: [{ name: "local-fonts" }],
  localFonts: [{ name: "local-fonts" }],
  window_management: [{ name: "window-management" }],
  windowManagement: [{ name: "window-management" }],
  storage_access: [{ name: "storage-access" }],
  storageAccess: [{ name: "storage-access" }],
  local_network_access: [{ name: "local-network-access" }],
  localNetworkAccess: [{ name: "local-network-access" }],
  backgroundSync: [{ name: "background-sync" }],
  periodicBackgroundSync: [{ name: "periodic-background-sync" }],
  idleDetection: [{ name: "idle-detection" }],
  wakeLockScreen: [{ name: "screen-wake-lock" }],
  paymentHandler: [{ name: "payment-handler" }],
};

export function validatePermissionSetting(
  setting: unknown,
  apiName: string,
): PermissionSetting {
  if (
    typeof setting === "string" &&
    PERMISSION_SETTINGS.has(setting as PermissionSetting)
  ) {
    return setting as PermissionSetting;
  }
  throw new TypeError(
    `${apiName} setting must be one of granted, denied, prompt`,
  );
}

export function normalizePermissionDescriptors(
  input: unknown,
  apiName: string,
): PermissionDescriptorObject[] {
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) {
      throw new TypeError(`${apiName} permission must be a non-empty string`);
    }
    const alias = Object.hasOwn(PERMISSION_ALIASES, trimmed)
      ? PERMISSION_ALIASES[trimmed]
      : undefined;
    return alias ? alias.map((entry) => ({ ...entry })) : [{ name: trimmed }];
  }

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError(
      `${apiName} permission must be a non-empty string or descriptor object`,
    );
  }

  const record = input as Record<string, unknown>;
  if (typeof record.name !== "string" || record.name.trim().length === 0) {
    throw new TypeError(
      `${apiName} permission.name must be a non-empty string`,
    );
  }

  const descriptor: PermissionDescriptorObject = { name: record.name.trim() };
  for (const [key, value] of Object.entries(record)) {
    if (key === "name" || value === undefined) continue;
    if (!DESCRIPTOR_BOOLEAN_FIELDS.has(key)) {
      throw new TypeError(
        `${apiName} permission contains unknown descriptor field: ${key}`,
      );
    }
    if (typeof value !== "boolean") {
      throw new TypeError(`${apiName} permission.${key} must be boolean`);
    }
    (descriptor as Record<string, unknown>)[key] = value;
  }
  return [descriptor];
}

export function normalizePermissionList(
  permissions: unknown,
  apiName: string,
): PermissionDescriptorObject[] {
  if (!Array.isArray(permissions) || permissions.length === 0) {
    throw new TypeError(
      `${apiName} permissions must be a non-empty array of permission names or descriptors`,
    );
  }
  return permissions.flatMap((entry) =>
    normalizePermissionDescriptors(entry, apiName),
  );
}

export function normalizePermissionOrigin(
  origin: unknown,
  apiName: string,
): string | undefined {
  if (origin === undefined) return undefined;
  if (typeof origin !== "string" || origin.trim().length === 0) {
    throw new TypeError(`${apiName} origin must be a non-empty HTTP(S) URL`);
  }
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new TypeError(`${apiName} origin must be a valid HTTP(S) URL`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new TypeError(`${apiName} origin must use http: or https:`);
  }
  return parsed.origin;
}

export function normalizeGeolocation(
  coords: unknown,
  apiName: string,
): { latitude: number; longitude: number; accuracy: number } | null {
  if (coords === null) return null;
  validatePublicApiOptions("Page.setGeolocation", coords);
  const record = coords as GeolocationCoordinates;
  if (
    typeof record.latitude !== "number" ||
    typeof record.longitude !== "number"
  ) {
    throw new TypeError(
      `${apiName} requires finite numeric latitude and longitude`,
    );
  }
  if (record.latitude < -90 || record.latitude > 90) {
    throw new TypeError(`${apiName} latitude must be between -90 and 90`);
  }
  if (record.longitude < -180 || record.longitude > 180) {
    throw new TypeError(`${apiName} longitude must be between -180 and 180`);
  }
  return {
    latitude: record.latitude,
    longitude: record.longitude,
    accuracy: record.accuracy ?? 1,
  };
}
