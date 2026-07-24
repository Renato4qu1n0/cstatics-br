/* ============================================================
   CSTATICS BRASIL — Formulário de contato
   Envia via e-mail do usuário (mailto) — funciona sem backend.
   Para envio inline (AJAX), preencha FORM_ENDPOINT com um serviço
   como Web3Forms/Formspree; o mailto vira fallback automático.
   ============================================================ */
(function () {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const FORM_ENDPOINT = ''; // ex.: "https://api.web3forms.com/submit" (deixe vazio para usar mailto)
  const TO = 'cstaticsbr@protonmail.com';
  const SUBJECTS = {
    sugestao: 'Sugestão de tática',
    correcao: 'Correção/atualização',
    parceria: 'Parceria',
    outro: 'Contato'
  };

  const msgEl = document.getElementById('formMessage');
  const show = (text, type) => {
    if (!msgEl) return;
    msgEl.textContent = text;
    msgEl.className = 'form-message show ' + type;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const nome = (fd.get('name') || '').toString().trim();
    const email = (fd.get('email') || '').toString().trim();
    const assunto = SUBJECTS[fd.get('subject')] || 'Contato';
    const mensagem = (fd.get('message') || '').toString().trim();

    if (!nome || !email || !mensagem) {
      show('Preencha nome, e-mail e mensagem.', 'error');
      return;
    }

    // Caminho AJAX (só se um endpoint estiver configurado)
    if (FORM_ENDPOINT) {
      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ nome, email, assunto, mensagem })
        });
        if (res.ok) {
          show('Mensagem enviada. Obrigado — a equipe responde por e-mail.', 'success');
          form.reset();
          return;
        }
      } catch (_) { /* cai no mailto abaixo */ }
    }

    // Padrão: abre o app de e-mail com tudo pronto
    const subject = `[CSTatics] ${assunto} — ${nome}`;
    const body = `Nome: ${nome}\nE-mail: ${email}\nAssunto: ${assunto}\n\n${mensagem}`;
    window.location.href = `mailto:${TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    show(`Abrindo seu app de e-mail com a mensagem pronta. Se nada abrir, escreva para ${TO}.`, 'success');
  });
})();
