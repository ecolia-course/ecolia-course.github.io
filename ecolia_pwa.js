/* ECOLIA — ecolia_pwa.js : enregistrement du service worker + invite de mise à jour + tutoriel d'installation iOS.
   Fichier INDÉPENDANT, sans dépendance. Dans index.html, avant </body> :
       <script src="ecolia_pwa.js"></script>
   (et RETIRER l'ancien code d'enregistrement du service worker / d'invite de mise à jour, pour éviter les doublons)
   Bouton manuel possible :  onclick="ecoliaShowIOSGuide()"  */
(function () {
  'use strict';
  var SW_URL = 'sw.js';

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  function bar(id, html, bottom) {
    if (document.getElementById(id)) return null;
    var d = document.createElement('div');
    d.id = id;
    d.setAttribute('role', 'dialog');
    d.style.cssText = 'position:fixed;left:8px;right:8px;' + bottom + ';z-index:99999;background:#0b3a3a;color:#fff;' +
      'border-radius:12px;padding:12px 14px;font:15px/1.4 system-ui,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.35)';
    d.innerHTML = html;
    document.body.appendChild(d);
    return d;
  }
  var BTN = 'background:#fff;color:#0b3a3a;border:0;border-radius:8px;padding:8px 14px;font-weight:700;margin:8px 8px 0 0;font-size:15px';

  /* ───── 1) Service worker + invite de mise à jour (seulement quand une VRAIE nouvelle version attend) ───── */
  if ('serviceWorker' in navigator) {
    var hadController = !!navigator.serviceWorker.controller;   // faux à la toute première visite : pas d'invite
    var refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController || refreshing) return;                 // 1re installation : rien à recharger
      refreshing = true;
      location.reload();
    });
    var showUpdate = function (worker) {
      var d = bar('ecolia-update',
        '<div>Une nouvelle version d\'ECOLIA est prête.</div>' +
        '<button id="ecolia-update-ok" style="' + BTN + '">Mettre à jour</button>' +
        '<button id="ecolia-update-no" style="' + BTN + 'background:transparent;color:#fff;border:1px solid #fff">Plus tard</button>', 'top:8px');
      if (!d) return;
      document.getElementById('ecolia-update-ok').onclick = function () { worker.postMessage({ type: 'SKIP_WAITING' }); d.remove(); };
      document.getElementById('ecolia-update-no').onclick = function () { d.remove(); };
    };
    window.addEventListener('load', function () {
      navigator.serviceWorker.register(SW_URL).then(function (reg) {
        if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);
        reg.addEventListener('updatefound', function () {
          var w = reg.installing;
          if (!w) return;
          w.addEventListener('statechange', function () {
            if (w.state === 'installed' && navigator.serviceWorker.controller) showUpdate(w);
          });
        });
        window.ecoliaCheckUpdate = function () { return reg.update(); };
      }).catch(function () { /* hors ligne : on réessaiera au prochain lancement */ });
    });
  }

  /* ───── 2) Tutoriel d'installation iOS (Safari n'envoie jamais « beforeinstallprompt ») ───── */
  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var standalone = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  var inApp = /FBAN|FBAV|Instagram|WhatsApp|Messenger|TikTok|Line\/|MicroMessenger|Snapchat/i.test(ua);

  window.ecoliaShowIOSGuide = function () {
    var corps = inApp
      ? '<b>Ouvre ECOLIA dans Safari</b> : touche « ⋯ » ou l\'icône de navigateur, puis « Ouvrir dans Safari ». Ensuite, installe l\'application.'
      : '<b>Installer ECOLIA sur ton iPhone / iPad</b><ol style="margin:6px 0 0 18px;padding:0">' +
        '<li>Touche le bouton <b>Partager</b> (carré avec une flèche vers le haut).</li>' +
        '<li>Fais défiler et touche <b>« Sur l\'écran d\'accueil »</b>.</li>' +
        '<li>Touche <b>Ajouter</b>.</li></ol>';
    var d = bar('ecolia-ios', corps + '<div><button id="ecolia-ios-ok" style="' + BTN + '">J\'ai compris</button>' +
      '<button id="ecolia-ios-never" style="' + BTN + 'background:transparent;color:#fff;border:1px solid #fff">Ne plus afficher</button></div>', 'bottom:12px');
    if (!d) return;
    document.getElementById('ecolia-ios-ok').onclick = function () { d.remove(); };
    document.getElementById('ecolia-ios-never').onclick = function () { store('ecolia_ios_guide', 'never'); d.remove(); };
  };

  if (isIOS && !standalone && store('ecolia_ios_guide') !== 'never') {
    window.addEventListener('load', function () { setTimeout(window.ecoliaShowIOSGuide, 2500); });
  }
})();
