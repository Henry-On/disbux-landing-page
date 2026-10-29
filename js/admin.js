/**
 * Legacy single-page admin bundle, retired.
 *
 * The portal now lives at /admin/ as ES modules under /admin/js/. This stub
 * only exists so cached copies of the old admin.html bounce forward instead
 * of running stale code.
 */
(() => {
  "use strict";
  window.location.replace("/admin/");
})();
