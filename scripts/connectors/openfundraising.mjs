/**
 * Connettore Open Fundraising (Osservatorio Bandi Fondazioni Erogative Italiane)
 * Portale: https://www.openfundraising.it/bandi
 * Copertura: Fondazioni di Origine Bancaria (FOB), Fondazioni d'Impresa (es. Fondazione Unipolis, A2A),
 * Fondazioni di Comunità e Imprese Filantropiche Nazionali e Territoriali.
 */

function decodeHtml(html) {
  if (!html) return '';
  return html
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchOpenFundraising() {
  const items = [];
  const errors = [];
  const seenIds = new Set();

  const endpoints = [
    'https://www.openfundraising.it/bandi',
    'https://www.openfundraising.it/bandi?table=fob',
    'https://www.openfundraising.it/bandi?table=impresa_famiglia_filantropiche',
    'https://www.openfundraising.it/bandi?table=fondazioni_comunita'
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
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
      const cardRegex = /<article class="bando-card[^"]*"[^>]*data-bando-id="([^"]+)"[\s\S]*?<\/article>/g;
      let match;

      while ((match = cardRegex.exec(html)) !== null) {
        const rawCard = match[0];
        const bandoId = match[1];

        if (seenIds.has(bandoId)) continue;
        seenIds.add(bandoId);

        const titleMatch = rawCard.match(/<div class="title">([\s\S]*?)<\/div>/);
        const subMatch = rawCard.match(/<div class="sub">([\s\S]*?)<\/div>/);
        const ambitoMatch = rawCard.match(/<strong>Ambito:<\/strong>\s*([^<]+)/);
        const terrMatch = rawCard.match(/<strong>Territorio:<\/strong>\s*([^<]+)/);
        const scdMatch = rawCard.match(/<strong>Scadenza:<\/strong>\s*([^<]+)/);
        const maxMatch = rawCard.match(/<strong>Max:<\/strong>\s*([^<]+)/);
        const fonteMatch = rawCard.match(/<a class="btn btn-secondary"\s+href="([^"]+)"/);

        const titolo = decodeHtml(titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '') : `Bando Fondazione #${bandoId}`);
        const ente = decodeHtml(subMatch ? subMatch[1].replace(/<[^>]+>/g, '') : 'Fondazione Erogativa');
        const ambito = decodeHtml(ambitoMatch ? ambitoMatch[1] : 'Generale / Welfare');
        const territorio = decodeHtml(terrMatch ? terrMatch[1] : 'Nazionale');
        const scadenzaRaw = scdMatch ? scdMatch[1].trim() : '';
        const maxAmount = maxMatch ? maxMatch[1].trim() : '';
        let officialUrl = fonteMatch ? fonteMatch[1].trim() : `https://www.openfundraising.it/bandi/${bandoId}`;

        // Normalizza link mailto o non validi verso scheda di riferimento
        if (officialUrl.startsWith('mailto:')) {
          officialUrl = `https://www.openfundraising.it/bandi/${bandoId}`;
        }

        // Valida e formatta scadenza (YYYY-MM-DD)
        let scadenza = '';
        let scadenzaTipo = 'sportello';
        if (/^\d{4}-\d{2}-\d{2}$/.test(scadenzaRaw)) {
          scadenza = scadenzaRaw;
          scadenzaTipo = 'data';
        }

        const dotazioneFormatted = maxAmount && !isNaN(Number(maxAmount))
          ? `€ ${Number(maxAmount).toLocaleString('it-IT')}`
          : (maxAmount ? `€ ${maxAmount}` : 'Da regolamento di erogazione');

        items.push({
          titolo: titolo,
          ente: ente,
          programma: `Bandi Fondazioni ed Erogazioni Filantropiche (${ambito})`,
          categoria: 'Fondazioni',
          sourceType: 'fondazioni',
          descrizione: `Opportunità promossa da ${ente} in ambito ${ambito}. Territorio di ammissibilità o priorità: ${territorio}. Contributo massimo erogabile: ${dotazioneFormatted}.`,
          beneficiari: 'Enti locali, Terzo Settore, Partenariati pubblico-privati, Istituti scolastici ed Enti non profit',
          dotazione: dotazioneFormatted,
          contributo_max: dotazioneFormatted,
          cofinanziamento: 'Contributo a fondo perduto / cofinanziamento secondo regolamento erogativo',
          scadenza: scadenza,
          scadenza_tipo: scadenzaTipo,
          url: officialUrl,
          note: `Monitorato tramite Open Fundraising (openfundraising.it/bandi/${bandoId}) per ${ente}. Territorio: ${territorio}. Rilevato il ${new Date().toISOString().split('T')[0]}.`
        });
      }
    } catch (err) {
      errors.push({ source: url, error: err.message });
    }
  }

  // 2. Controllo dedicato Fondazione Unipolis
  try {
    const unipolisUrl = 'https://www.fondazioneunipolis.org/site/news/';
    const uRes = await fetch(unipolisUrl, {
      headers: {
        'User-Agent': 'RE-Funding-Intelligence-Bot/1.0 (+https://osservatorio-urbano.github.io/osservatorio-bandi-re)',
        'Accept': 'text/html,application/xhtml+xml'
      },
      signal: AbortSignal.timeout(10000)
    });

    if (uRes.ok) {
      const uHtml = await uRes.text();
      // Trova notizie relative a nuovi bandi o call
      const bandoMatches = [...uHtml.matchAll(/<a[^>]+href="([^"]*(?:bando|call|pop|act)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
      for (const bm of bandoMatches.slice(0, 3)) {
        const link = bm[1];
        const rawTitle = decodeHtml(bm[2].replace(/<[^>]+>/g, ''));
        if (rawTitle.length > 10 && !rawTitle.toLowerCase().includes('leggi')) {
          items.push({
            titolo: `Fondazione Unipolis: ${rawTitle}`,
            ente: 'Fondazione Unipolis',
            programma: 'Bandi Nazionali Fondazione Unipolis (Welfare, Mobilità sostenibile, Disuguaglianze)',
            categoria: 'Fondazioni',
            sourceType: 'fondazioni',
            descrizione: `Iniziativa e bando erogativo nazionale promosso da Fondazione Unipolis a contrasto delle disuguaglianze e per la sostenibilità sociale e mobilità.`,
            beneficiari: 'Enti del Terzo Settore, Enti locali, Fondazioni e organizzazioni non profit',
            dotazione: 'Secondo regolamento del bando',
            contributo_max: 'Secondo regolamento del bando',
            cofinanziamento: 'A fondo perduto secondo bando Unipolis',
            scadenza: '',
            scadenza_tipo: 'sportello',
            url: link.startsWith('http') ? link : `https://www.fondazioneunipolis.org${link}`,
            note: `Rilevato da portale ufficiale Fondazione Unipolis (${unipolisUrl}) il ${new Date().toISOString().split('T')[0]}.`
          });
        }
      }
    }
  } catch (uErr) {
    // Silenzioso o tracciato negli errori
    errors.push({ source: 'https://www.fondazioneunipolis.org', error: uErr.message });
  }

  return { sourceId: 'openfundraising_fondazioni', items, errors };
}
