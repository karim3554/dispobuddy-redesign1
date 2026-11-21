/**
 * Dispo Buddy — Local Preview Affiliate Attribution
 * Reproduces the client-side ?ref= / ?aff= / ?affiliate= / ?affid= 90-day
 * attribution cookie + localStorage + window.DBAffiliate API locally.
 * Does NOT fire live network beacons to production.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'dispobuddy_affiliate';
  var COOKIE_NAME = 'dispobuddy_ref';
  var TTL_DAYS = 90;

  function setCookie(name, value, days) {
    try {
      var d = new Date();
      d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
      document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
    } catch (e) {}
  }

  function getCookie(name) {
    try {
      var parts = document.cookie.split(';');
      for (var i = 0; i < parts.length; i++) {
        var kv = parts[i].trim().split('=');
        if (kv[0] === name) return decodeURIComponent(kv[1] || '');
      }
    } catch (e) {}
    return '';
  }

  function loadAttr() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || !obj.id) return null;
      if (obj.landed_at && Date.now() - obj.landed_at > TTL_DAYS * 86400000) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return obj;
    } catch (e) {
      return null;
    }
  }

  function saveAttr(obj) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); } catch (e) {}
  }

  function clearAttr() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    setCookie(COOKIE_NAME, '', -1);
  }

  function normalizeId(raw) {
    if (!raw) return '';
    return String(raw).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 64);
  }

  function readRefParam() {
    try {
      var params = new URLSearchParams(window.location.search);
      var candidates = ['ref', 'aff', 'affiliate', 'affid'];
      for (var i = 0; i < candidates.length; i++) {
        var v = params.get(candidates[i]);
        if (v) return normalizeId(v);
      }
    } catch (e) {}
    return '';
  }

  var incomingRef = readRefParam();
  var existing = loadAttr();
  var cookieRef = normalizeId(getCookie(COOKIE_NAME));

  if (incomingRef) {
    var params = new URLSearchParams(window.location.search);
    saveAttr({
      id: incomingRef,
      landed_at: Date.now(),
      landing_page: window.location.pathname + window.location.search,
      referrer: document.referrer || '',
      utm_source: params.get('utm_source') || '',
      utm_medium: params.get('utm_medium') || '',
      utm_campaign: params.get('utm_campaign') || ''
    });
    setCookie(COOKIE_NAME, incomingRef, TTL_DAYS);
  } else if (!existing && cookieRef) {
    saveAttr({
      id: cookieRef,
      landed_at: Date.now(),
      landing_page: window.location.pathname,
      referrer: document.referrer || ''
    });
  }

  function getAttribution() { return loadAttr(); }
  function getId() {
    var a = loadAttr();
    return a ? a.id : '';
  }
  function attachToPayload(data) {
    if (!data || typeof data !== 'object') return data;
    var a = loadAttr();
    if (!a || !a.id) return data;
    data.affiliate_id = a.id;
    data.affiliate_landed = a.landed_at || null;
    data.affiliate_landing_page = a.landing_page || '';
    if (a.referrer && !data.referrer) data.referrer = a.referrer;
    return data;
  }

  window.DBAffiliate = {
    getId: getId,
    getAttribution: getAttribution,
    attachToPayload: attachToPayload,
    clear: clearAttr
  };

  function prefillReferred() {
    var refId = getId();
    if (!refId) return;
    ['referredBy', 'jRef'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && !el.value) el.value = refId;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', prefillReferred);
  } else {
    prefillReferred();
  }
})();

