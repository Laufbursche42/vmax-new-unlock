// Report-issue footer hook: shared across every unlock / update / FW page and the tools.
// Hooks on the footer "Fehler melden" link (data-t="footIssue" / "footReport" / #link-report) and
// replaces its href with a prefilled GitHub issue including scooter / page / build + the debug log.
// If the log is too long for a URL, it goes to the clipboard with an instruction.
//
// Expected page conventions:
//   - a <a data-t="footIssue"> link in the footer (canonical shell; tools use footReport / #link-report)
//   - a #log element whose textContent is the human-visible debug log
//   - optional: window.BUILD (string) and a #build-ver element
//   - LANG global (string "de" or "en") - fallback: document.documentElement.lang or "en"
(function () {
  'use strict';
  var REPO = 'Laufbursche42/Laufbursche42';
  var ISSUES = 'https://github.com/' + REPO + '/issues/new';
  var MAX_URL_BODY = 2500;

  function fence() { return String.fromCharCode(96, 96, 96); }
  function getLang() { try { return (window.LANG || document.documentElement.getAttribute('lang') || 'en').toLowerCase(); } catch (e) { return 'en'; } }
  function pageSlug() {
    try {
      var p = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean).pop();
      return p || location.host || 'page';
    } catch (e) { return 'page'; }
  }
  function pageUrl() { try { return location.origin + location.pathname; } catch (e) { return ''; } }
  function brandSub() {
    var el = document.querySelector('[data-t="brandSub"]');
    return el ? (el.textContent || '').trim() : '';
  }
  function build() { try { return (window.BUILD || (document.getElementById('build-ver') || {}).textContent || '').trim(); } catch (e) { return ''; } }
  function getLog() {
    var el = document.getElementById('log');
    return el ? (el.textContent || '').trim() : '';
  }

  function body(logEmbedded, logText, hintText) {
    var isDe = getLang() === 'de';
    var lines = [];
    if (isDe) {
      lines.push('**Scooter:** ' + (brandSub() || '(bitte eintragen)'));
      lines.push('**Seite:** ' + pageSlug() + ' - ' + pageUrl());
      lines.push('**Build:** ' + (build() || '(unbekannt)'));
      lines.push('');
      lines.push('---');
      lines.push('');
      lines.push('**Dein Anliegen:**');
      lines.push('');
      lines.push('(bitte beschreiben)');
      lines.push('');
      lines.push('**Welche App- oder Firmware-Version nutzt du? (falls bekannt)**');
      lines.push('');
    } else {
      lines.push('**Scooter:** ' + (brandSub() || '(please fill in)'));
      lines.push('**Page:** ' + pageSlug() + ' - ' + pageUrl());
      lines.push('**Build:** ' + (build() || '(unknown)'));
      lines.push('');
      lines.push('---');
      lines.push('');
      lines.push('**Your request:**');
      lines.push('');
      lines.push('(please describe)');
      lines.push('');
      lines.push('**Which app or firmware version are you on? (if known)**');
      lines.push('');
    }
    if (logEmbedded) {
      lines.push(isDe ? '**Debug-Log (automatisch angehängt):**' : '**Debug log (attached automatically):**');
      lines.push('');
      lines.push(fence());
      lines.push(logText);
      lines.push(fence());
    } else {
      lines.push(isDe ? '**Debug-Log:**' : '**Debug log:**');
      lines.push('');
      lines.push(hintText);
      lines.push('');
      lines.push(fence());
      lines.push(isDe ? '(hier einfügen - Strg+V)' : '(paste here - Ctrl+V)');
      lines.push(fence());
    }
    return lines.join('\n');
  }

  function openIssue(bodyText) {
    var isDe = getLang() === 'de';
    var title = '[' + pageSlug() + '] ' + (isDe ? 'Rückmeldung' : 'Feedback');
    var url = ISSUES + '?title=' + encodeURIComponent(title) + '&body=' + encodeURIComponent(bodyText);
    var a = document.createElement('a');
    a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function copyToClipboard(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(txt);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement('textarea');
        ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.focus(); ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) resolve(); else reject(new Error('execCommand failed'));
      } catch (e) { reject(e); }
    });
  }

  function onReportClick(e) {
    e.preventDefault();
    var logText = getLog();
    var isDe = getLang() === 'de';
    if (logText.length === 0) {
      openIssue(body(false, '', isDe ? '(kein Debug-Log vorhanden - Debug-Log auf der Seite einschalten und erneut Fehler melden)' : '(no debug log found - enable debug log on this page and click Report again)'));
      return;
    }
    if (logText.length <= MAX_URL_BODY) {
      openIssue(body(true, logText, ''));
      return;
    }
    copyToClipboard(logText).then(function () {
      openIssue(body(false, '', isDe ? '(Dein Debug-Log wurde in die Zwischenablage kopiert - unten mit Strg+V einfügen)' : '(your debug log was copied to the clipboard - paste it below with Ctrl+V)'));
    }).catch(function () {
      openIssue(body(false, '', isDe ? '(Debug-Log war zu lang für die URL und Zwischenablage schlug fehl - bitte das Log auf der Seite manuell mit dem Kopieren-Knopf kopieren und hier einfügen)' : '(debug log too long for the URL and clipboard failed - please copy the log manually with the Copy button on the page and paste it here)'));
    });
  }

  function hookLink() {
    // Hook both canonical shell (footIssue) and lb-tool-web / lb-webpatcher (footReport, #link-report).
    var links = document.querySelectorAll('[data-t="footIssue"], [data-t="footReport"], #link-report');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      a.setAttribute('href', '#');
      a.setAttribute('role', 'button');
      a.addEventListener('click', onReportClick);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hookLink);
  } else {
    hookLink();
  }
})();
