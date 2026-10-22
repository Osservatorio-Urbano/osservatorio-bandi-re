/**
 * Connettore Fondazioni Territoriali: Fondazione Manodori (Reggio Emilia) e Fondazione Cariparma
 */

export async function fetchFondazioni() {
  const sources = [
    {
      id: 'fondazione_manodori',
      name: 'Fondazione Cassa di Risparmio Pietro Manodori',
      url: 'https://fondazionemanodori.it/bandi',
      categoria: 'Fondazioni',
      sourceType: 'fondazioni',
      linkPrefix: 'https://www.fondazionemanodori.it',
    },
    {
      id: 'fondazione_cariparma',
      name: 'Fondazione Cariparma',
      url: 'https://www.fondazionecariparma.it/bandi',
      categoria: 'Fondazioni',
      sourceType: 'fondazioni',
      linkPrefix: 'https://www.fondazionecariparma.it',
    }
  ];

  const results = [];
  const errors = [];

  for (const s of sources) {
    try {
      const res = await fetch(s.url, {
        headers: {
          'User-Agent': 'RE-Funding-Intelligence-Bot/1.0 (+https://osservatorio-urbano.github.io/osservatorio-bandi-re)',
          'Accept': 'text/html,application/xhtml+xml'
        },
        signal: AbortSignal.timeout(12000)
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const html = await res.text();

      // Estrai link a bandi
      // Cerca pattern tipo href="..." con 'bando' o 'contributi'
      const hrefRegex = /href="([^"]*(?:bando|contribut|erogazion)[^"]*)"/gi;
      const foundLinks = new Set();
      let match;

      while ((match = hrefRegex.exec(html)) !== null) {
        let rawLink = match[1];
        if (rawLink.startsWith('/')) {
          rawLink = s.linkPrefix + rawLink;
        }
        if (rawLink.startsWith('http') && !rawLink.endsWith('.pdf') && !rawLink.includes('/category/') && !rawLink.includes('/tag/') && rawLink !== s.url) {
          foundLinks.add(rawLink);
        }
      }

      // Estrai anche intestazioni di bandi presenti nella pagina
      const hRegex = /<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi;
      let hMatch;
      const titles = [];
      while ((hMatch = hRegex.exec(html)) !== null) {
        const clean = hMatch[1].replace(/<[^>]+>/g, '').trim();
        if (clean.toLowerCase().includes('bando') || clean.toLowerCase().includes('welfare') || clean.toLowerCase().includes('contribut')) {
          titles.push(clean);
        }
      }

      const uniqueTitles = Array.from(new Set(titles));

      if (uniqueTitles.length > 0) {
        for (const title of uniqueTitles) {
          results.push({
            titolo: title,
            ente: s.name,
            programma: 'Erogazioni istituzionali e bandi territoriali',
            categoria: s.categoria,
            sourceType: s.sourceType,
            descrizione: `Bando ed erogazione territoriale promossa da ${s.name} a sostegno di welfare, cultura, sostenibilità ed educazione nel territorio di riferimento.`,
            beneficiari: 'Enti pubblici locali, Ambiti Territoriali Sociali, Enti del Terzo Settore e Fondazioni',
            dotazione: '',
            contributo_max: '',
            cofinanziamento: 'Contributo a fondo perduto secondo criteri del regolamento erogazioni',
            scadenza: '',
            scadenza_tipo: 'sportello',
            url: Array.from(foundLinks)[0] || s.url,
            note: `Acquisito da portale ufficiale ${s.name} (${s.url}) il ${new Date().toISOString().split('T')[0]}.`
          });
        }
      } else if (foundLinks.size > 0) {
        for (const link of Array.from(foundLinks).slice(0, 3)) {
          const derivedTitle = link.split('/').filter(Boolean).pop().replace(/-/g, ' ').toUpperCase();
          results.push({
            titolo: `Bando ${derivedTitle}`,
            ente: s.name,
            programma: 'Bandi territoriali e contributi',
            categoria: s.categoria,
            sourceType: s.sourceType,
            descrizione: `Iniziativa di finanziamento promossa da ${s.name}.`,
            beneficiari: 'Enti locali, Terzo Settore, Scuole ed Enti no-profit',
            dotazione: '',
            contributo_max: '',
            cofinanziamento: '',
            scadenza: '',
            scadenza_tipo: 'sportello',
            url: link,
            note: `Acquisito da portale ufficiale ${s.name} (${link}) il ${new Date().toISOString().split('T')[0]}.`
          });
        }
      }
    } catch (err) {
      errors.push({ source: s.url, error: err.message });
    }
  }

  return { sourceId: 'fondazioni_territoriali', items: results, errors };
}
