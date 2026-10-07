// Hands the personal subscription to the Happ app: happ://add/<subscription URL>.
// Only subscription URLs of this VEYRO instance are accepted (no open redirect into other configs).
//   #<https://…/api/sub/TOKEN>  — served by the VEYRO server itself: the URL must be on this origin
//   #t=TOKEN                    — served from a static host (infra/scripts/publish-web.sh): config.js lists the
//                                 server's names (VEYRO_API); the first that answers from this network is used
(function () {
  var msg = document.getElementById('msg');
  var btn = document.getElementById('open');
  var raw = '';
  try { raw = decodeURIComponent(location.hash.slice(1)); } catch (e) { raw = ''; }
  var TOKEN = /^[A-Za-z0-9_-]{32}$/;
  var bases = (window.VEYRO_API || []).map(function (b) { return String(b).replace(/\/+$/, ''); });

  function fail() {
    msg.textContent = 'Ссылка недействительна. Откройте её снова из VEYRO. / Invalid link — open it again from VEYRO.';
    msg.className = 'err';
    btn.style.display = 'none';
  }
  function hand(sub) {
    var target = 'happ://add/' + sub;
    btn.href = target;
    btn.style.display = '';
    // keep the token out of history / referrers once handed over
    try { history.replaceState(null, '', location.pathname); } catch (e) { /* ignore */ }
    setTimeout(function () { location.href = target; }, 150);
    setTimeout(function () {
      msg.textContent = 'Если Happ не открылся — установите его и нажмите «Открыть в Happ». / If Happ did not open, install it and tap “Open in Happ”.';
    }, 2000);
  }
  function probe(base) {
    var ctl = new AbortController();
    setTimeout(function () { ctl.abort(); }, 10000);
    return fetch(base + '/api/vpn/ping', { cache: 'no-store', signal: ctl.signal }).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return base;
    });
  }

  if (raw.indexOf('t=') === 0 && bases.length) {
    var token = raw.slice(2);
    if (!TOKEN.test(token)) return fail();
    btn.style.display = 'none';
    // all names at once: the main one wins if it answers; a spare wins once the main one failed or stayed silent 2.5 s more
    var done = false;
    function win(base) { if (!done) { done = true; hand(base + '/api/sub/' + token); } }
    var primary = probe(bases[0]);
    var spares = Promise.any(bases.slice(1).map(probe));
    primary.then(win, function () {
      spares.then(win, function () {
        msg.textContent = 'Нет связи с VEYRO. Проверьте интернет и откройте ссылку снова. / No connection to VEYRO — check your internet and try again.';
        msg.className = 'err';
      });
    });
    spares.then(function (b) { setTimeout(function () { win(b); }, 2500); }, function () { /* the main name decides */ });
    return;
  }
  var prefix = location.origin + '/api/sub/';
  if (raw.indexOf(prefix) === 0 && TOKEN.test(raw.slice(prefix.length))) return hand(raw);
  fail();
})();
