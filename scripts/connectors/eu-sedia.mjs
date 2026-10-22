/**
 * Connettore ufficiale European Commission Funding & Tenders Opportunities (API SEDIA)
 * Endpoint ufficiale: https://api.tech.ec.europa.eu/search-api/prod/rest/search?apiKey=SEDIA
 */

export async function fetchEuSedia() {
  const url = 'https://api.tech.ec.europa.eu/search-api/prod/rest/search?apiKey=SEDIA&text=urban+cities+climate+digital+social';
  const results = [];
  const errors = [];

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'RE-Funding-Intelligence-Bot/1.0 (+https://osservatorio-urbano.github.io/osservatorio-bandi-re)',
      },
      body: JSON.stringify({
        pageSize: 12,
        pageNumber: 1
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    const items = data.results || [];

    for (const item of items) {
      const meta = item.metadata || {};
      const rawTitle = (meta.title?.[0] || item.title || '').trim();
      const rawUrl = item.url || meta.url?.[0] || '';
      const rawDesc = (meta.description?.[0] || '').replace(/<[^>]+>/g, '').trim();
      const rawProg = (meta.esST_programmes?.[0] || meta.DATASOURCE?.[0] || 'Horizon Europe / Programmi UE').trim();
      const rawDate = meta.esDA_endDate?.[0] || meta.deadlineDate?.[0] || '';

      if (!rawTitle || !rawUrl) continue;

      let deadline = '';
      let deadlineType = 'sportello';
      if (rawDate && /^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
        deadline = rawDate.split('T')[0];
        deadlineType = 'data';
      }

      results.push({
        titolo: rawTitle,
        ente: 'Commissione Europea',
        programma: rawProg,
        categoria: 'UE',
        sourceType: 'ue',
        descrizione: rawDesc || `Opportunità di finanziamento e bando europeo per l'innovazione, la sostenibilità e la transizione urbana.`,
        beneficiari: 'Autorità locali e regionali, Città, Università, Centri di ricerca e Consorzi pubblico-privati',
        dotazione: '',
        contributo_max: '',
        cofinanziamento: 'Cofinanziamento UE standard (fino al 70-100% dei costi ammissibili)',
        scadenza: deadline,
        scadenza_tipo: deadlineType,
        url: rawUrl,
        note: `Acquisito via API ufficiale SEDIA (European Commission Funding & Tenders Portal) il ${new Date().toISOString().split('T')[0]}.`
      });
    }
  } catch (err) {
    errors.push({ source: 'SEDIA_EC', error: err.message });
  }

  return { sourceId: 'ec_funding_tenders', items: results, errors };
}
