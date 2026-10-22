/**
 * Connettore ufficiale PR FESR ed Energia / Ambiente Regione Emilia-Romagna
 * Fonti: Feed RSS ufficiali certificati della Regione Emilia-Romagna
 */

export async function fetchFesrEr() {
  const sources = [
    {
      url: 'https://fesr.regione.emilia-romagna.it/opportunita/bandi/RSS',
      ente: 'Regione Emilia-Romagna',
      programma: 'PR FESR 2021-2027',
      categoria: 'Regione ER',
      sourceType: 'regione_er',
    },
    {
      url: 'https://energia.regione.emilia-romagna.it/bandi/RSS',
      ente: 'Regione Emilia-Romagna',
      programma: 'PR FESR / PNRR Transizione Ecologica',
      categoria: 'Regione ER',
      sourceType: 'regione_er',
    }
  ];

  const results = [];
  const errors = [];

  for (const s of sources) {
    try {
      const res = await fetch(s.url, {
        headers: {
          'User-Agent': 'RE-Funding-Intelligence-Bot/1.0 (+https://osservatorio-urbano.github.io/osservatorio-bandi-re)',
          'Accept': 'application/rss+xml, application/rdf+xml, application/xml, text/xml'
        },
        signal: AbortSignal.timeout(12000)
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const xml = await res.text();
      const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

      for (const itemXml of itemMatches) {
        const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
        const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
        const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i);
        const dateMatch = itemXml.match(/<(?:dc:date|pubDate)>([\s\S]*?)<\/(?:dc:date|pubDate)>/i);

        const titolo = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
        const url = linkMatch ? linkMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
        const descrizione = descMatch ? descMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').trim() : '';
        const pubDateRaw = dateMatch ? dateMatch[1].trim() : '';

        if (!titolo || !url) continue;

        // Estrai o stima data di scadenza dal testo se presente
        let scadenza = '';
        let scadenza_tipo = 'sportello';
        const dateRegex = /(?:scadenza|entro il|fino al)\s*(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})/i;
        const dm = descrizione.match(dateRegex) || titolo.match(dateRegex);
        if (dm) {
          scadenza = `${dm[3]}-${dm[2]}-${dm[1]}`;
          scadenza_tipo = 'data';
        }

        results.push({
          titolo,
          ente: s.ente,
          programma: s.programma,
          categoria: s.categoria,
          sourceType: s.sourceType,
          descrizione: descrizione || titolo,
          beneficiari: 'Comuni, Unioni di Comuni ed Enti Locali dell\'Emilia-Romagna, Imprese e Organismi di Ricerca',
          dotazione: '',
          contributo_max: '',
          cofinanziamento: '',
          scadenza,
          scadenza_tipo,
          url,
          note: `Acquisito da feed ufficiale Regione Emilia-Romagna (${s.url}) il ${new Date().toISOString().split('T')[0]}. Data pubblicazione fonte: ${pubDateRaw || 'n.d.'}`
        });
      }
    } catch (err) {
      errors.push({ source: s.url, error: err.message });
    }
  }

  return { sourceId: 'regione_er_fesr', items: results, errors };
}
