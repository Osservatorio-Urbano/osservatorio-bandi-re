/**
 * Connettore ufficiale PA Digitale 2026 - PNRR Misura 1 e Misura 2
 * Fonte: Dipartimento per la trasformazione digitale / Dipartimento della funzione pubblica
 * URL ufficiale: https://areariservata.padigitale2026.gov.it/Pa_digitale2026_avvisi
 */

const MONTHS_IT = {
  gennaio: '01',
  febbraio: '02',
  marzo: '03',
  aprile: '04',
  maggio: '05',
  giugno: '06',
  luglio: '07',
  agosto: '08',
  settembre: '09',
  ottobre: '10',
  novembre: '11',
  dicembre: '12',
};

function parseItalianDate(dateStr) {
  if (!dateStr || dateStr === 'null') return '';
  const parts = dateStr.trim().toLowerCase().split(/\s+/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = MONTHS_IT[parts[1]] || '01';
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return '';
}

export async function fetchPaDigitale() {
  const url = 'https://areariservata.padigitale2026.gov.it/Pa_digitale2026_avvisi';
  const results = [];
  const errors = [];

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'RE-Funding-Intelligence-Bot/1.0 (+https://osservatorio-urbano.github.io/osservatorio-bandi-re)',
        'Accept': 'text/html,application/xhtml+xml'
      },
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const html = await res.text();

    // Regex per estrarre i blocchi OutputData:[...]
    const regex = /OutputData:\[([^\]]+)\]/g;
    let match;

    while ((match = regex.exec(html)) !== null) {
      const block = match[1];
      const props = {};
      const pairs = block.split(/,\s*(?=[a-zA-Z0-9_]+=)/);
      for (const p of pairs) {
        const eqIdx = p.indexOf('=');
        if (eqIdx !== -1) {
          const key = p.substring(0, eqIdx).trim();
          const val = p.substring(eqIdx + 1).trim();
          props[key] = val;
        }
      }

      const id = props.id || '';
      const name = (props.name || '').replace(/&#8211;/g, '–').replace(/&#8220;/g, '“').replace(/&#8221;/g, '”').replace(/&amp;/g, '&');
      const parentName = props.parentName || 'PNRR Trasformazione Digitale';
      const entePromotore = props.entePromotore || 'Dipartimento per la trasformazione digitale';
      const destinatari = props.soggettiDestinatariString || props.soggettiDestinatari || 'Comuni ed Enti Locali';
      const startDate = parseItalianDate(props.startDate);
      const endDate = parseItalianDate(props.endDate);
      const statusRaw = (props.status || '').toUpperCase();

      if (!name) continue;

      const officialUrl = id
        ? `https://areariservata.padigitale2026.gov.it/Pa_digitale2026_dettagli_avviso?id=${id}`
        : 'https://padigitale2026.gov.it/avvisi/';

      results.push({
        titolo: name,
        ente: entePromotore,
        programma: `PNRR · ${parentName}`,
        categoria: 'Nazionale/PNRR',
        sourceType: 'nazionale_pnrr',
        descrizione: `Avviso pubblico PNRR ${parentName} destinato a: ${destinatari}. Apertura: ${startDate || 'n.d.'}. Scadenza: ${endDate || 'n.d.'}.`,
        beneficiari: destinatari,
        dotazione: '',
        contributo_max: '',
        cofinanziamento: '100% fondo perduto (contributo forfettario a voucher PNRR)',
        scadenza: endDate,
        scadenza_tipo: endDate ? 'data' : 'sportello',
        url: officialUrl,
        rawStatus: statusRaw,
        note: `Acquisito da portale ufficiale PA Digitale 2026 il ${new Date().toISOString().split('T')[0]}. Stato ufficiale: ${statusRaw}. Data apertura: ${startDate}. Scadenza: ${endDate}.`
      });
    }
  } catch (err) {
    errors.push({ source: url, error: err.message });
  }

  return { sourceId: 'pa_digitale_2026', items: results, errors };
}
