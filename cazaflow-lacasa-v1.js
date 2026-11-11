/* cazaflow-lacasa-v1.js - ajustes só da sub-conta La Casa Decor
 * Liga html.cz-lacasa quando a URL é da sub-conta fOkHeDMZ7xEflTL8hKUC.
 * Todo o visual fica no CSS (regras começam com html.cz-lacasa).
 * Confere a cada 500ms porque o GHL troca de sub-conta sem recarregar.
 */
(function () {
  if (window.__czLaCasa) return;
  window.__czLaCasa = true;

  var LOCATION_ID = 'fOkHeDMZ7xEflTL8hKUC';
  var html = document.documentElement;

  function isLaCasa() {
    return location.pathname.indexOf('/v2/location/' + LOCATION_ID + '/') === 0 ||
      location.pathname === '/v2/location/' + LOCATION_ID;
  }

  function check() {
    var on = isLaCasa();
    if (html.classList.contains('cz-lacasa') !== on) html.classList.toggle('cz-lacasa', on);
  }

  setInterval(check, 500);
  check();
})();
