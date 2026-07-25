// Acessibilidade: ícones do Font Awesome são decorativos — esconde do leitor de tela
document.querySelectorAll('i[class*="fa-"]:not([aria-hidden])').forEach((i) => i.setAttribute('aria-hidden', 'true'));

// Copiar link (botões com [data-copy-link]) — usado nas páginas de detalhe
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-copy-link]');
  if (!btn) return;
  const url = btn.getAttribute('data-copy-link') || window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Link copiado!';
    setTimeout(() => { btn.innerHTML = original; }, 2000);
  }).catch(() => {});
});
