/* ==========================================================================
   DispoBuddy — Shared Leaflet Buyers Map Core (style-variant/)
   Reused by both buyers-map.html and the homepage Active Markets section
   to guarantee identical buyer-demand data, markers, popups, and OSM attribution.
   ========================================================================== */
(function (global) {
  'use strict';

  var GEO = {
    'Phoenix,AZ':[33.4484,-112.0740],'Mesa,AZ':[33.4152,-111.8315],'Tucson,AZ':[32.2226,-110.9747],
    'Scottsdale,AZ':[33.4942,-111.9261],'Chandler,AZ':[33.3062,-111.8413],'Gilbert,AZ':[33.3528,-111.7890],
    'Tempe,AZ':[33.4255,-111.9400],
    'Dallas,TX':[32.7767,-96.7970],'Houston,TX':[29.7604,-95.3698],'San Antonio,TX':[29.4241,-98.4936],
    'Austin,TX':[30.2672,-97.7431],'Fort Worth,TX':[32.7555,-97.3308],
    'Tampa,FL':[27.9506,-82.4572],'Orlando,FL':[28.5383,-81.3792],'Jacksonville,FL':[30.3322,-81.6557],
    'Miami,FL':[25.7617,-80.1918],'St Petersburg,FL':[27.7676,-82.6403],
    'Louisville,KY':[38.2527,-85.7585],'Lexington,KY':[38.0406,-84.5037],
    'Nashville,TN':[36.1627,-86.7816],'Memphis,TN':[35.1495,-90.0490],
    'Knoxville,TN':[35.9606,-83.9207],'Chattanooga,TN':[35.0456,-85.3097],
    'Atlanta,GA':[33.7490,-84.3880],'Savannah,GA':[32.0809,-81.0912],'Augusta,GA':[33.4735,-81.9748],
    'Las Vegas,NV':[36.1699,-115.1398],'Denver,CO':[39.7392,-104.9903],
    'Indianapolis,IN':[39.7684,-86.1581],'Columbus,OH':[39.9612,-82.9988],
    'Charlotte,NC':[35.2271,-80.8431],'Raleigh,NC':[35.7796,-78.6382],
    'Kansas City,MO':[39.0997,-94.5786],'St Louis,MO':[38.6270,-90.1994],
    'Oklahoma City,OK':[35.4676,-97.5164],'Tulsa,OK':[36.1540,-95.9928],
    'Albuquerque,NM':[35.0844,-106.6504],'Salt Lake City,UT':[40.7608,-111.8910],
    'Boise,ID':[43.6150,-116.2023],'Portland,OR':[45.5155,-122.6789],
    'Seattle,WA':[47.6062,-122.3321],'Sacramento,CA':[38.5816,-121.4944],
    'Los Angeles,CA':[34.0522,-118.2437],'San Diego,CA':[32.7157,-117.1611]
  };

  var geoQueue = [];
  var geoProcessing = false;

  function getCoords(city, state) {
    var key = city + ',' + state;
    if (GEO[key]) return Promise.resolve(GEO[key]);
    return new Promise(function (resolve) {
      geoQueue.push({ city: city, state: state, resolve: resolve });
      processGeoQueue();
    });
  }

  function processGeoQueue() {
    if (geoProcessing || geoQueue.length === 0) return;
    geoProcessing = true;
    var item = geoQueue.shift();
    var url = 'https://nominatim.openstreetmap.org/search?q=' +
      encodeURIComponent(item.city + ', ' + item.state + ', USA') +
      '&format=json&limit=1';
    fetch(url, { headers: { 'User-Agent': 'DispoBuddyBuyersMap/1.0' } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data && data.length > 0) {
          var coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
          GEO[item.city + ',' + item.state] = coords;
          item.resolve(coords);
        } else {
          item.resolve(null);
        }
      })
      .catch(function () { item.resolve(null); })
      .finally(function () {
        geoProcessing = false;
        setTimeout(processGeoQueue, 1100);
      });
  }

  function fmtK(n) {
    if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return '$' + Math.round(n / 1000) + 'K';
    return '$' + n;
  }

  function markerColor(count) {
    if (count >= 15) return '#F7941D';
    if (count >= 5) return '#29ABE2';
    return '#94A3B8';
  }

  function shortTimelineLabel(label) {
    if (/immediate/i.test(label)) return 'Immediate (0-30d)';
    if (/short/i.test(label)) return 'Short-Term (31-90d)';
    if (/long/i.test(label)) return 'Long-Term (90d+)';
    return label;
  }

  function fetchBuyerDemand() {
    var urls = ['https://dispobuddy.com/api/buyer-demand', '/api/buyer-demand'];
    var idx = 0;
    function tryNext() {
      if (idx >= urls.length) return Promise.resolve(null);
      var url = urls[idx++];
      return fetch(url)
        .then(function (res) {
          if (!res.ok) return tryNext();
          return res.json();
        })
        .then(function (json) {
          if (json && json.markets && json.markets.length > 0) return json;
          return tryNext();
        })
        .catch(function () { return tryNext(); });
    }
    return tryNext();
  }

  function buildPopupHtml(m, ctaTarget) {
    var dealTags = m.dealTypes
      ? Object.entries(m.dealTypes).map(function (entry) {
          return '<span class="popup-deal-tag">' + entry[0] + ': ' + entry[1] + '</span>';
        }).join('')
      : '';

    var propTags = m.propertyTypes
      ? Object.entries(m.propertyTypes).map(function (entry) {
          return '<span class="popup-deal-tag" style="background:rgba(41,171,226,.14);color:#63CBF5">' + entry[0] + ': ' + entry[1] + '</span>';
        }).join('')
      : '';

    var priceStr = m.priceRange ? fmtK(m.priceRange.min) + ' - ' + fmtK(m.priceRange.max) : '';
    var entryStr = m.entryRange ? fmtK(m.entryRange.min) + ' - ' + fmtK(m.entryRange.max) : '';

    var tlTags = m.timelines
      ? Object.entries(m.timelines).map(function (entry) {
          return '<span class="popup-deal-tag" style="background:rgba(34,197,94,.14);color:#4ADE80">' + shortTimelineLabel(entry[0]) + ': ' + entry[1] + '</span>';
        }).join('')
      : '';

    var html =
      '<div class="popup-title">' + m.label + '</div>' +
      '<div class="popup-count">' + m.buyerCount + ' Active Buyers</div>';

    if (dealTags) html += '<div class="popup-section"><div class="popup-section-label">Deal Types</div><div class="popup-deals">' + dealTags + '</div></div>';
    if (propTags) html += '<div class="popup-section"><div class="popup-section-label">Property Types</div><div class="popup-deals">' + propTags + '</div></div>';
    if (priceStr) html += '<div class="popup-section"><div class="popup-section-label">Price Range</div><div class="popup-price">' + priceStr + '</div></div>';
    if (entryStr) html += '<div class="popup-section"><div class="popup-section-label">Entry Range</div><div class="popup-price">' + entryStr + '</div></div>';
    if (tlTags) html += '<div class="popup-section"><div class="popup-section-label">Purchase Timeline</div><div class="popup-deals">' + tlTags + '</div></div>';

    var targetAttr = ctaTarget ? ' target="' + ctaTarget + '"' : '';
    html += '<a href="submit-deal.html"' + targetAttr + ' class="popup-cta">Have a deal in ' + m.city + '? Submit it.</a>';
    return html;
  }

  function attachMapA11y(map) {
    function markSvg(svg) {
      if (!svg || svg.tagName.toLowerCase() !== 'svg') return;
      if (svg.hasAttribute('aria-label') || svg.hasAttribute('aria-labelledby')) return;
      if (svg.querySelector('a, button, [tabindex]:not([tabindex="-1"])')) return;
      if (svg.getAttribute('aria-hidden') !== 'true') svg.setAttribute('aria-hidden', 'true');
      if (svg.getAttribute('focusable') !== 'false') svg.setAttribute('focusable', 'false');
    }
    function sync(root) {
      if (!root) return;
      if (root.tagName && root.tagName.toLowerCase() === 'svg') { markSvg(root); return; }
      if (root.querySelectorAll) root.querySelectorAll('svg').forEach(markSvg);
    }
    var overlayPane = map.getPane('overlayPane');
    var attributionEl = map.getContainer().querySelector('.leaflet-control-attribution');
    sync(overlayPane);
    sync(attributionEl);

    if ('MutationObserver' in global) {
      var obs = new MutationObserver(function (mutations) {
        for (var i = 0; i < mutations.length; i++) {
          var nodes = mutations[i].addedNodes;
          for (var j = 0; j < nodes.length; j++) {
            if (nodes[j].nodeType === 1) sync(nodes[j]);
          }
        }
      });
      if (overlayPane) obs.observe(overlayPane, { childList: true });
      if (attributionEl) obs.observe(attributionEl, { childList: true, subtree: true });
      global.addEventListener('pagehide', function () { obs.disconnect(); }, { once: true });
    }
  }

  function createBaseMap(elOrId, options) {
    var opts = Object.assign({
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
      touchZoom: true
    }, options || {});
    var map = global.L.map(elOrId, opts).setView([39.5, -98.35], 4);
    global.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(map);
    attachMapA11y(map);
    return map;
  }

  function renderMarketMarkers(map, markets, existingMarkers, ctaTarget) {
    if (existingMarkers && existingMarkers.length) {
      existingMarkers.forEach(function (obj) { map.removeLayer(obj.marker); });
    }
    var created = [];
    var tasks = markets.map(function (m) {
      return getCoords(m.city, m.state).then(function (coords) {
        if (!coords) return;
        var color = markerColor(m.buyerCount);
        var radius = Math.max(8, Math.min(28, 6 + m.buyerCount * 0.7));
        var marker = global.L.circleMarker(coords, {
          radius: radius,
          fillColor: color,
          color: '#FFFFFF',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(map);

        marker.bindPopup(buildPopupHtml(m, ctaTarget), {
          maxWidth: Math.min(290, Math.max(220, global.innerWidth - 56))
        });
        created.push({ marker: marker, label: m.label, state: m.state });
      });
    });
    return Promise.all(tasks).then(function () { return created; });
  }

  /* ── HOMEPAGE EMBEDDED BUYERS MAP INITIALIZER ─────────────────────────── */
  function initHomepageMap() {
    var mapEl = document.getElementById('svHomeMap');
    if (!mapEl || !global.L) return;

    var loadingEl = document.getElementById('svHomeMapLoading');
    var countEl = document.getElementById('svHomeMapCount');

    var initialZoom = global.innerWidth < 640 ? 3 : 4;
    var map = createBaseMap(mapEl, {
      scrollWheelZoom: true,
      touchZoom: true,
      dragging: true,
      tap: true
    });
    map.setView([38.8, -97.5], initialZoom);

    var invalidateTimer = null;
    function safeInvalidate() {
      if (invalidateTimer) clearTimeout(invalidateTimer);
      invalidateTimer = setTimeout(function () {
        map.invalidateSize({ animate: false });
      }, 120);
    }

    if ('ResizeObserver' in global) {
      var ro = new ResizeObserver(safeInvalidate);
      ro.observe(mapEl);
    }
    global.addEventListener('resize', safeInvalidate, { passive: true });
    if ('IntersectionObserver' in global) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0] && entries[0].isIntersecting) {
          safeInvalidate();
          io.disconnect();
        }
      }, { threshold: 0.05 });
      io.observe(mapEl);
    }
    setTimeout(safeInvalidate, 250);

    fetchBuyerDemand().then(function (data) {
      if (!data || !data.markets || !data.markets.length) {
        if (loadingEl) {
          loadingEl.innerHTML = '<div class="sv-map-error">Live buyer data is temporarily unavailable. <a href="buyers-map.html">Open Full Buyers Map</a></div>';
        }
        return;
      }
      if (countEl) {
        countEl.textContent = data.totalBuyers + ' buyers · ' + data.markets.length + ' markets';
      }
      if (loadingEl) loadingEl.classList.add('hidden');
      safeInvalidate();
      renderMarketMarkers(map, data.markets, [], null);
    });
  }

  global.DispoBuddyMap = {
    GEO: GEO,
    getCoords: getCoords,
    fmtK: fmtK,
    markerColor: markerColor,
    shortTimelineLabel: shortTimelineLabel,
    fetchBuyerDemand: fetchBuyerDemand,
    buildPopupHtml: buildPopupHtml,
    createBaseMap: createBaseMap,
    renderMarketMarkers: renderMarketMarkers,
    initHomepageMap: initHomepageMap
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomepageMap);
  } else {
    initHomepageMap();
  }
})(window);

