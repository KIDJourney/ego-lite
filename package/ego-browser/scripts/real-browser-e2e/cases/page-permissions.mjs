export function pagePermissionsCase() {
  return `
    const task = await taskSpace(taskName);
    const page = await newPageAt(task, baseUrl + "/?page-permissions=" + Date.now());
    try {
      const origin = new URL(await page.url()).origin;

      // 1. Deny location before requesting it: must resolve as denied without user handoff.
      await task.setPermission("location", "denied", { origin });
      assertEqual(
        await page.evaluate(async () => (await navigator.permissions.query({ name: "geolocation" })).state),
        "denied",
        "task.setPermission denies geolocation for the origin"
      );
      const deniedPosition = await page.evaluate(() => new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve({ ok: true }),
          (err) => resolve({ ok: false, code: err.code }),
          { timeout: 3000 }
        );
      }));
      assertEqual(deniedPosition.ok, false, "denied geolocation does not succeed");
      assertEqual(deniedPosition.code, 1, "denied geolocation reports PERMISSION_DENIED");

      // 2. Grant geolocation + notifications without clobbering, and set coordinates.
      await task.grantPermissions(["geolocation", "notifications"], { origin });
      await page.setGeolocation({ latitude: 37.7749, longitude: -122.4194, accuracy: 25 });
      const grantedPosition = await page.evaluate(() => new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({
            ok: true,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }),
          (err) => resolve({ ok: false, code: err.code, message: err.message }),
          { timeout: 3000 }
        );
      }));
      assertEqual(grantedPosition.ok, true, "granted geolocation resolves with override");
      assertEqual(grantedPosition.latitude, 37.7749, "geolocation latitude matches override");
      assertEqual(grantedPosition.longitude, -122.4194, "geolocation longitude matches override");
      assertEqual(grantedPosition.accuracy, 25, "geolocation accuracy matches override");
      assertEqual(
        await page.evaluate(() => Notification.permission),
        "granted",
        "grantPermissions grants notifications alongside geolocation"
      );

      // 3. Clear overrides and verify resetPermissions restores prompt state.
      await page.setGeolocation(null);
      await task.resetPermissions();
      assertEqual(
        await page.evaluate(async () => (await navigator.permissions.query({ name: "geolocation" })).state),
        "prompt",
        "resetPermissions restores geolocation permission to prompt"
      );

      // 4. Verify task.cdp("Browser.getVersion") succeeds via Page-session fallback.
      const version = await task.cdp("Browser.getVersion");
      assert(typeof version?.product === "string" && version.product.length > 0, "task.cdp Browser.getVersion returns product");
    } finally {
      await page.setGeolocation(null).catch(() => {});
      await task.resetPermissions().catch(() => {});
      await page.close().catch(() => {});
    }
  `;
}
