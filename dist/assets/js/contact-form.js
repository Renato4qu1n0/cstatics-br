document.getElementById('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData);

  try {
    // Usar Formspree ou similar para receber emails
    const response = await fetch('https://formspree.io/f/SEU_FORM_ID', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const messageEl = document.getElementById('formMessage');
    
    if (response.ok) {
      messageEl.textContent = '✓ Mensagem enviada com sucesso!';
      messageEl.classList.add('success');
      e.target.reset();
    } else {
      messageEl.textContent = '✗ Erro ao enviar. Tente novamente.';
      messageEl.classList.add('error');
    }
  } catch (error) {
    document.getElementById('formMessage').textContent = '✗ Erro ao conectar. Tente novamente.';
    document.getElementById('formMessage').classList.add('error');
  }
});