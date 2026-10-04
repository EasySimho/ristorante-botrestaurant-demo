/* Gestione dati e moduli. Questo file è controllato dal servizio, non dall'IA. */
(async () => {
  const status = message => document.querySelectorAll('.form-status').forEach(el => { el.textContent = message; });
  try {
    const response = await fetch('site-data.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Impossibile caricare i dati del ristorante.');
    const data = await response.json(), p = data.profile;
    const asset = id => data.assets[id] || '';
    document.querySelectorAll('[data-bind]').forEach(el => { el.textContent = p[el.dataset.bind] || ''; });
    document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
    document.title = p.name;
    const hero = document.querySelector('[data-hero]');
    if (hero && asset(p.heroAsset)) { hero.src = asset(p.heroAsset); hero.hidden = false; document.querySelector('[data-placeholder]')?.setAttribute('hidden', ''); }
    const menu = document.querySelector('[data-menu]');
    if (menu) {
      menu.replaceChildren();
      for (const line of (p.menu || '').split('\n').filter(Boolean)) { const el = document.createElement('div'); el.className = 'menu-line'; el.textContent = line; menu.append(el); }
      if (!menu.children.length) { const el = document.createElement('p'); el.className = 'menu-empty'; el.textContent = asset(p.menuAsset) ? 'Scopri le nostre proposte nel menu allegato.' : 'Contattaci per scoprire le proposte della cucina.'; menu.append(el); }
    }
    const pdf = document.querySelector('[data-menu-pdf]');
    if (pdf && asset(p.menuAsset)) { pdf.href = asset(p.menuAsset); pdf.hidden = false; }
    const gallery = document.querySelector('[data-gallery]');
    if (gallery) { for (const id of p.gallery || []) if (asset(id)) { const image = document.createElement('img'); image.src = asset(id); image.alt = 'Fotografia del ristorante'; image.loading = 'lazy'; gallery.append(image); } gallery.hidden = !gallery.children.length; }
    const phone = document.querySelector('[data-phone]');
    if (phone) { phone.textContent = p.phone; phone.href = `tel:${p.phone.replace(/[^+\d]/g, '')}`; phone.hidden = !p.phone; }
    const email = document.querySelector('[data-email]');
    if (email) { email.textContent = p.email; email.href = `mailto:${p.email}`; email.hidden = !p.email; }
    const map = document.querySelector('[data-map]');
    if (map) { map.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`; map.hidden = !p.address; }
    const privacy = document.querySelector('[data-privacy]');
    if (privacy && /^https:\/\//.test(p.privacyUrl)) { privacy.href = p.privacyUrl; privacy.hidden = false; }
    const endpointUrl = data.endpoint ? new URL(data.endpoint) : null;
    const isLocal = endpointUrl && ['localhost', '127.0.0.1'].includes(endpointUrl.hostname);
    const pageLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
    const available = endpointUrl && (!isLocal || pageLocal);
    if (!available) { const notice = document.querySelector('[data-service-notice]'); if (notice) { notice.textContent = 'Per prenotare o chiedere informazioni, contattaci al numero indicato.'; notice.hidden = false; } }
    document.querySelectorAll('form[data-kind]').forEach(form => {
      form.hidden = form.dataset.kind === 'booking' ? !p.bookingEnabled : !p.callbackEnabled;
      form.querySelector('button').disabled = !available;
      let requestId = crypto.randomUUID();
      const date = form.querySelector('[name=date]');
      if (date) { const now = new Date(); const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000); date.min = local.toISOString().slice(0, 10); }
      form.addEventListener('submit', async event => {
        event.preventDefault();
        if (!available || !form.reportValidity()) return;
        const button = form.querySelector('button'), output = form.querySelector('.form-status');
        button.disabled = true; output.textContent = 'Invio in corso…';
        const fields = Object.fromEntries(new FormData(form));
        const payload = { ...fields, kind: form.dataset.kind, consent: fields.consent === 'on', requestId };
        if (fields.people) payload.people = Number(fields.people);
        try {
          const result = await fetch(data.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(20000) });
          const body = await result.json();
          if (!result.ok) throw Error(body.error || 'Invio non riuscito. Riprova tra poco.');
          output.textContent = form.dataset.kind === 'booking' ? 'Richiesta ricevuta. Il ristorante ti contatterà per confermare.' : 'Richiesta ricevuta. Il ristorante ti richiamerà.';
          form.reset(); requestId = crypto.randomUUID();
        } catch (error) { output.textContent = error.name === 'TimeoutError' ? 'Non abbiamo ancora conferma dell’invio. Riprova: la richiesta non verrà duplicata.' : error.message; }
        finally { button.disabled = false; }
      });
    });
  } catch (error) { status(error.message); }
})();
