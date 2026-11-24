import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeGeolocation,
  normalizePermissionDescriptors,
  normalizePermissionList,
  normalizePermissionOrigin,
  validatePermissionSetting,
} from "../../dist/src/driver/permissions.js";

test("normalizePermissionDescriptors maps reason keys and CDP camelCase aliases", () => {
  assert.deepEqual(normalizePermissionDescriptors("location", "test"), [
    { name: "geolocation" },
  ]);
  assert.deepEqual(normalizePermissionDescriptors("clipboard", "test"), [
    { name: "clipboard-read" },
    { name: "clipboard-write" },
  ]);
  assert.deepEqual(
    normalizePermissionDescriptors("clipboardReadWrite", "test"),
    [{ name: "clipboard-read" }, { name: "clipboard-write" }],
  );
  assert.deepEqual(
    normalizePermissionDescriptors("clipboardSanitizedWrite", "test"),
    [{ name: "clipboard-write" }],
  );
  assert.deepEqual(
    normalizePermissionDescriptors("pan_tilt_zoom_microphone", "test"),
    [{ name: "camera", panTiltZoom: true }, { name: "microphone" }],
  );
  assert.deepEqual(normalizePermissionDescriptors("midiSysex", "test"), [
    { name: "midi", sysex: true },
  ]);
  assert.deepEqual(normalizePermissionDescriptors("local_fonts", "test"), [
    { name: "local-fonts" },
  ]);
  assert.deepEqual(
    normalizePermissionDescriptors("window_management", "test"),
    [{ name: "window-management" }],
  );
  assert.deepEqual(normalizePermissionDescriptors("storage_access", "test"), [
    { name: "storage-access" },
  ]);
  assert.deepEqual(
    normalizePermissionDescriptors("local_network_access", "test"),
    [{ name: "local-network-access" }],
  );
  assert.deepEqual(normalizePermissionDescriptors("notifications", "test"), [
    { name: "notifications" },
  ]);
});

test("normalizePermissionDescriptors validates descriptor objects", () => {
  assert.deepEqual(
    normalizePermissionDescriptors({ name: "midi", sysex: true }, "test"),
    [{ name: "midi", sysex: true }],
  );
  assert.throws(
    () => normalizePermissionDescriptors("", "test"),
    /must be a non-empty string/,
  );
  assert.throws(
    () =>
      normalizePermissionDescriptors({ name: "midi", unknown: true }, "test"),
    /unknown descriptor field: unknown/,
  );
  assert.throws(
    () =>
      normalizePermissionDescriptors({ name: "midi", sysex: "yes" }, "test"),
    /permission\.sysex must be boolean/,
  );
});

test("normalizePermissionList flattens and rejects empty arrays", () => {
  assert.deepEqual(normalizePermissionList(["location", "clipboard"], "test"), [
    { name: "geolocation" },
    { name: "clipboard-read" },
    { name: "clipboard-write" },
  ]);
  assert.throws(
    () => normalizePermissionList([], "test"),
    /must be a non-empty array/,
  );
});

test("validatePermissionSetting and normalizePermissionOrigin reject invalid inputs", () => {
  assert.equal(validatePermissionSetting("granted", "test"), "granted");
  assert.equal(validatePermissionSetting("denied", "test"), "denied");
  assert.equal(validatePermissionSetting("prompt", "test"), "prompt");
  assert.throws(
    () => validatePermissionSetting("allow", "test"),
    /must be one of granted, denied, prompt/,
  );

  assert.equal(normalizePermissionOrigin(undefined, "test"), undefined);
  assert.equal(
    normalizePermissionOrigin("https://example.com/path?a=1", "test"),
    "https://example.com",
  );
  assert.throws(
    () => normalizePermissionOrigin("file:///tmp/test.html", "test"),
    /must use http: or https:/,
  );
  assert.throws(
    () => normalizePermissionOrigin("not-a-url", "test"),
    /must be a valid HTTP\(S\) URL/,
  );
});

test("normalizeGeolocation validates bounds and accepts null", () => {
  assert.equal(normalizeGeolocation(null, "page.setGeolocation"), null);
  assert.deepEqual(
    normalizeGeolocation(
      { latitude: 37.7749, longitude: -122.4194 },
      "page.setGeolocation",
    ),
    { latitude: 37.7749, longitude: -122.4194, accuracy: 1 },
  );
  assert.deepEqual(
    normalizeGeolocation(
      { latitude: 0, longitude: 0, accuracy: 25 },
      "page.setGeolocation",
    ),
    { latitude: 0, longitude: 0, accuracy: 25 },
  );
  assert.throws(
    () =>
      normalizeGeolocation(
        { latitude: 91, longitude: 0 },
        "page.setGeolocation",
      ),
    /latitude must be between -90 and 90/,
  );
  assert.throws(
    () =>
      normalizeGeolocation(
        { latitude: 0, longitude: 181 },
        "page.setGeolocation",
      ),
    /longitude must be between -180 and 180/,
  );
  assert.throws(
    () =>
      normalizeGeolocation(
        { latitude: 0, longitude: 0, accuracy: 0 },
        "page.setGeolocation",
      ),
    /accuracy must be a positive number/,
  );
});
