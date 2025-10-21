/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-54d0af47'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();

  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "404.html",
    "revision": "4ad147c62bcb096dadc92781920722c0"
  }, {
    "url": "assets/activity-gmKAYkWf.js",
    "revision": null
  }, {
    "url": "assets/AdminObras-D0QwQy_S.js",
    "revision": null
  }, {
    "url": "assets/AdminUsuarios-CwxkXEME.js",
    "revision": null
  }, {
    "url": "assets/AdvancedAnalytics-Bdtp5w92.js",
    "revision": null
  }, {
    "url": "assets/AdvancedDashboard-B_ZmGU00.js",
    "revision": null
  }, {
    "url": "assets/AdvancedFilters-BsM0aqbI.js",
    "revision": null
  }, {
    "url": "assets/alert-CkY9rBm2.js",
    "revision": null
  }, {
    "url": "assets/alert-dialog-BhN7omEj.js",
    "revision": null
  }, {
    "url": "assets/ApprovalWorkflow-dfLHvvFg.js",
    "revision": null
  }, {
    "url": "assets/AreaChart-DXIwQj-7.js",
    "revision": null
  }, {
    "url": "assets/arrow-left-BkoLeRXl.js",
    "revision": null
  }, {
    "url": "assets/ArrowDownTrayIcon-B4b9T2_C.js",
    "revision": null
  }, {
    "url": "assets/badge-D7MevKLB.js",
    "revision": null
  }, {
    "url": "assets/BarChart-B85vMFGs.js",
    "revision": null
  }, {
    "url": "assets/barSelectors-CDgexaR-.js",
    "revision": null
  }, {
    "url": "assets/bell-DXbPHone.js",
    "revision": null
  }, {
    "url": "assets/building-2-IPA7dVli.js",
    "revision": null
  }, {
    "url": "assets/calendar-DSEz8gb9.js",
    "revision": null
  }, {
    "url": "assets/card-B-gOWI0G.js",
    "revision": null
  }, {
    "url": "assets/CartesianChart-C7asu0GT.js",
    "revision": null
  }, {
    "url": "assets/chart-column-C3li6U1D.js",
    "revision": null
  }, {
    "url": "assets/check-y2lT4DlG.js",
    "revision": null
  }, {
    "url": "assets/checkbox-D8vi58De.js",
    "revision": null
  }, {
    "url": "assets/circle-alert-BjJ2XkjT.js",
    "revision": null
  }, {
    "url": "assets/circle-check-big-_cPI0xYU.js",
    "revision": null
  }, {
    "url": "assets/circle-x-CkNSsPNH.js",
    "revision": null
  }, {
    "url": "assets/clock-BIWYhZCK.js",
    "revision": null
  }, {
    "url": "assets/ComposedChart-FUJ2nYZ1.js",
    "revision": null
  }, {
    "url": "assets/CoordinationDashboard-C6kQmw43.js",
    "revision": null
  }, {
    "url": "assets/CostAnalysis-DH7BQ4NR.js",
    "revision": null
  }, {
    "url": "assets/createLucideIcon-BMAB3HFj.js",
    "revision": null
  }, {
    "url": "assets/CreateRequirement-nIoo60Ht.js",
    "revision": null
  }, {
    "url": "assets/currency-t9KodpE5.js",
    "revision": null
  }, {
    "url": "assets/CyclicInventory-BRJaJxGa.js",
    "revision": null
  }, {
    "url": "assets/Dashboard-BIzr10ui.js",
    "revision": null
  }, {
    "url": "assets/DeviceManagement-GIN3KSwD.js",
    "revision": null
  }, {
    "url": "assets/dialog-CL4S-W9V.js",
    "revision": null
  }, {
    "url": "assets/dollar-sign-cf_3GC7t.js",
    "revision": null
  }, {
    "url": "assets/download-DUhoaavi.js",
    "revision": null
  }, {
    "url": "assets/dropdown-menu-CtNcEU2W.js",
    "revision": null
  }, {
    "url": "assets/Entradas-bBIGhRa6.js",
    "revision": null
  }, {
    "url": "assets/es-C9XHcgig.js",
    "revision": null
  }, {
    "url": "assets/ExclamationTriangleIcon-D4mnAHJ5.js",
    "revision": null
  }, {
    "url": "assets/eye-CS-BK8x9.js",
    "revision": null
  }, {
    "url": "assets/eye-off-4sWNTssR.js",
    "revision": null
  }, {
    "url": "assets/file-text-HVftF3Av.js",
    "revision": null
  }, {
    "url": "assets/funnel-goUTD27D.js",
    "revision": null
  }, {
    "url": "assets/FunnelIcon-BeJjkX48.js",
    "revision": null
  }, {
    "url": "assets/GeofenceManagement-Dy59EhOE.js",
    "revision": null
  }, {
    "url": "assets/GPSControls-DJ6adYbo.js",
    "revision": null
  }, {
    "url": "assets/GPSManagement-CSGEsVd-.js",
    "revision": null
  }, {
    "url": "assets/GPSMap-CnYCEriU.js",
    "revision": null
  }, {
    "url": "assets/GPSReports-CwXPcz9f.js",
    "revision": null
  }, {
    "url": "assets/gpsService-BELHFYZa.js",
    "revision": null
  }, {
    "url": "assets/GPSTracking-DTKLEyAD.js",
    "revision": null
  }, {
    "url": "assets/html2canvas.esm-QH1iLAAe.js",
    "revision": null
  }, {
    "url": "assets/index-BJn6Fb8u.js",
    "revision": null
  }, {
    "url": "assets/index-Cmq9WAeb.js",
    "revision": null
  }, {
    "url": "assets/index-DGXBGZuQ.js",
    "revision": null
  }, {
    "url": "assets/index-VimOGhGs.css",
    "revision": null
  }, {
    "url": "assets/index-xKSxfmSR.js",
    "revision": null
  }, {
    "url": "assets/index.es-BE1iSGLC.js",
    "revision": null
  }, {
    "url": "assets/jspdf.plugin.autotable-_iArhvRZ.js",
    "revision": null
  }, {
    "url": "assets/KPIIndicators-DNHNFa4T.js",
    "revision": null
  }, {
    "url": "assets/label-Caac4oLB.js",
    "revision": null
  }, {
    "url": "assets/LazyTemplateEditor-DwdD9vyI.js",
    "revision": null
  }, {
    "url": "assets/Legend-mi-JK1ec.js",
    "revision": null
  }, {
    "url": "assets/Line-DL_WXEM-.js",
    "revision": null
  }, {
    "url": "assets/LineChart-jXLg0gNM.js",
    "revision": null
  }, {
    "url": "assets/loader-circle-DTQr66C2.js",
    "revision": null
  }, {
    "url": "assets/LoanManagement-BtInLwUX.js",
    "revision": null
  }, {
    "url": "assets/LocationManager-Bu2c9O_L.js",
    "revision": null
  }, {
    "url": "assets/LogisticsDashboard-9LMg2Ttc.js",
    "revision": null
  }, {
    "url": "assets/MagnifyingGlassIcon-DLnaATxK.js",
    "revision": null
  }, {
    "url": "assets/mail-DSoq2h0T.js",
    "revision": null
  }, {
    "url": "assets/map-pin-o6xejd_N.js",
    "revision": null
  }, {
    "url": "assets/materiales-CSUxeW-_.js",
    "revision": null
  }, {
    "url": "assets/Materiales-uHn36dXq.js",
    "revision": null
  }, {
    "url": "assets/navigation-CdbbQ-Bo.js",
    "revision": null
  }, {
    "url": "assets/numberGenerator-C0I-bWRm.js",
    "revision": null
  }, {
    "url": "assets/OrdenesCompra-VLRvbzKu.js",
    "revision": null
  }, {
    "url": "assets/package-BC2HRjBy.js",
    "revision": null
  }, {
    "url": "assets/pen-line-2z2apZu4.js",
    "revision": null
  }, {
    "url": "assets/Perfil-CwgE870P.js",
    "revision": null
  }, {
    "url": "assets/PieChart-DyfpKU1T.js",
    "revision": null
  }, {
    "url": "assets/plus-DwyE1jSP.js",
    "revision": null
  }, {
    "url": "assets/PlusIcon-B9idGC6V.js",
    "revision": null
  }, {
    "url": "assets/PredictiveReports-DrAFN5CD.js",
    "revision": null
  }, {
    "url": "assets/ProductionDashboard-n_iWE-ec.js",
    "revision": null
  }, {
    "url": "assets/progress-CXAALPs2.js",
    "revision": null
  }, {
    "url": "assets/purify.es-CQJ0hv7W.js",
    "revision": null
  }, {
    "url": "assets/RealTimeMetrics-Dz8Ht3Au.js",
    "revision": null
  }, {
    "url": "assets/refresh-cw-DlJNr8S9.js",
    "revision": null
  }, {
    "url": "assets/ReorderConfiguration-B0GMOhPe.js",
    "revision": null
  }, {
    "url": "assets/Reportes-BALc4zLk.js",
    "revision": null
  }, {
    "url": "assets/requerimientos-BJYGBORk.js",
    "revision": null
  }, {
    "url": "assets/Requerimientos-DUknMmE5.js",
    "revision": null
  }, {
    "url": "assets/requerimientosMateriales-DfrTwPbM.js",
    "revision": null
  }, {
    "url": "assets/RequirementsTracking-EuClzhm2.js",
    "revision": null
  }, {
    "url": "assets/ReturnManagement-BXecfD-A.js",
    "revision": null
  }, {
    "url": "assets/RoleBasedDashboard-7tCpHJUO.js",
    "revision": null
  }, {
    "url": "assets/rotate-ccw-BT7kFBWK.js",
    "revision": null
  }, {
    "url": "assets/route-CrBE0sEi.js",
    "revision": null
  }, {
    "url": "assets/Salidas-Cj1tdArm.js",
    "revision": null
  }, {
    "url": "assets/save-CnVXr9iM.js",
    "revision": null
  }, {
    "url": "assets/search-Bh7l-4iM.js",
    "revision": null
  }, {
    "url": "assets/Select-D4c8mnO6.js",
    "revision": null
  }, {
    "url": "assets/separator-DjfSvBEy.js",
    "revision": null
  }, {
    "url": "assets/settings-CcOVuHSq.js",
    "revision": null
  }, {
    "url": "assets/shield-AToeim--.js",
    "revision": null
  }, {
    "url": "assets/signal--_UtOirl.js",
    "revision": null
  }, {
    "url": "assets/SolicitudesCompra-BRo9Eh7H.js",
    "revision": null
  }, {
    "url": "assets/solicitudesCompra-sEozFuXS.js",
    "revision": null
  }, {
    "url": "assets/square-pen-Bqmo3cYS.js",
    "revision": null
  }, {
    "url": "assets/Stock-I8q9X_3M.js",
    "revision": null
  }, {
    "url": "assets/stockAlerts-DNTeaATg.js",
    "revision": null
  }, {
    "url": "assets/subDays-NMRVbZEN.js",
    "revision": null
  }, {
    "url": "assets/switch-DnO6iWc8.js",
    "revision": null
  }, {
    "url": "assets/Table-CzMZMQdz.js",
    "revision": null
  }, {
    "url": "assets/tabs-CcEXYSUl.js",
    "revision": null
  }, {
    "url": "assets/TemplateEditor-CvAo_S7i.js",
    "revision": null
  }, {
    "url": "assets/TemplateEditor-DjbYlo0b.css",
    "revision": null
  }, {
    "url": "assets/Templates-DPUWU_Fp.js",
    "revision": null
  }, {
    "url": "assets/textarea-J2y0jiLF.js",
    "revision": null
  }, {
    "url": "assets/TileLayer-DGeqmiAy.js",
    "revision": null
  }, {
    "url": "assets/trash-2-BmwIm10r.js",
    "revision": null
  }, {
    "url": "assets/trending-down-DFYf4LjK.js",
    "revision": null
  }, {
    "url": "assets/trending-up-D5xFNXKa.js",
    "revision": null
  }, {
    "url": "assets/triangle-alert-BfjautSC.js",
    "revision": null
  }, {
    "url": "assets/truck-Da50mHxq.js",
    "revision": null
  }, {
    "url": "assets/useGPSData-AlEOHLSF.js",
    "revision": null
  }, {
    "url": "assets/usePhotoCapture-W7bIDgQ1.js",
    "revision": null
  }, {
    "url": "assets/user-yBMUiQrm.js",
    "revision": null
  }, {
    "url": "assets/users-BSz2P5Sd.js",
    "revision": null
  }, {
    "url": "assets/useWebSocket-CkA5gAyW.js",
    "revision": null
  }, {
    "url": "assets/useWebSocket-Dgihpmma.css",
    "revision": null
  }, {
    "url": "assets/VehicleList-4xft8x1H.js",
    "revision": null
  }, {
    "url": "assets/WarehouseDashboard-2xohEc2e.js",
    "revision": null
  }, {
    "url": "assets/x-Dqtr2QKS.js",
    "revision": null
  }, {
    "url": "assets/xlsx-BBWTpfDg.js",
    "revision": null
  }, {
    "url": "assets/zap-Bf5vl1gF.js",
    "revision": null
  }, {
    "url": "favicon.svg",
    "revision": "b5028a266deeb0ea578e3fdec6792ee3"
  }, {
    "url": "health-check.html",
    "revision": "1887eb1057e008d2ad0c745673840519"
  }, {
    "url": "icons/icon-128x128.png",
    "revision": "2e52a01001d9c2e459d5f47f75b9c162"
  }, {
    "url": "icons/icon-128x128.svg",
    "revision": "3fd5999061e74ae8adc7562f83d48423"
  }, {
    "url": "icons/icon-144x144.png",
    "revision": "7e08285396dfb3fec298c0b8cf8b13e8"
  }, {
    "url": "icons/icon-144x144.svg",
    "revision": "957b12bca47763d9f7f08c3f2d537cac"
  }, {
    "url": "icons/icon-152x152.png",
    "revision": "4221b69b4c91152ec41d865891b07dbb"
  }, {
    "url": "icons/icon-152x152.svg",
    "revision": "0fb4ecb1330b85809275e7a6dc93c588"
  }, {
    "url": "icons/icon-192x192-maskable.png",
    "revision": "b9d344235c90b30d9550228fdd18f806"
  }, {
    "url": "icons/icon-192x192-maskable.svg",
    "revision": "7ca625ea39909e69ac5593f2ccde0df2"
  }, {
    "url": "icons/icon-192x192.png",
    "revision": "a4eda5e6fa0c69c169d69813179f9315"
  }, {
    "url": "icons/icon-192x192.svg",
    "revision": "d1066f252a602c5e58e6f0b47e9a2e67"
  }, {
    "url": "icons/icon-384x384.png",
    "revision": "ff15cc609adbce2f7fa6c7e4bff53fec"
  }, {
    "url": "icons/icon-384x384.svg",
    "revision": "23ff3f92aa8dfd143dc990447ec6f12a"
  }, {
    "url": "icons/icon-512x512-maskable.png",
    "revision": "084035bac4ea0493fa6247b8a2859fbf"
  }, {
    "url": "icons/icon-512x512-maskable.svg",
    "revision": "66455383f20d450a8ad2898c6e104d7c"
  }, {
    "url": "icons/icon-512x512.png",
    "revision": "fbb26f4db78750f6a9ad759a21903b6d"
  }, {
    "url": "icons/icon-512x512.svg",
    "revision": "8db8174fbc00031f1cc1b8a2e3f78159"
  }, {
    "url": "icons/icon-72x72.png",
    "revision": "7441b9d681ed9938292712de94e1c02c"
  }, {
    "url": "icons/icon-72x72.svg",
    "revision": "0862b4549fc20e651ef23861f661da34"
  }, {
    "url": "icons/icon-96x96.png",
    "revision": "198fd62621a994df527e156996fe7737"
  }, {
    "url": "icons/icon-96x96.svg",
    "revision": "a7dff4417f1de05a391606fee68646b3"
  }, {
    "url": "icons/icon-base.svg",
    "revision": "4aa13a3eb68ed436f75463a80dc5ba4f"
  }, {
    "url": "index.html",
    "revision": "950dd00f007e9cea16de44e4c6a16439"
  }, {
    "url": "registerSW.js",
    "revision": "19fa0c1e511712b202aac4754065e25b"
  }, {
    "url": "manifest.webmanifest",
    "revision": "3e4230b14e13bba18d9bb05b7326efd6"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("/ALMCONT/index.html"), {
    denylist: [/^\/_/, /\/[^/?]+\.[^/]+$/]
  }));

}));
