/* 
  PRONTIO - JS Global
  - Inicializações simples
  - Comportamentos comuns
  (Regras de negócio SEMPRE no backend / API)
*/

document.addEventListener("DOMContentLoaded", () => {
  const userSpan = document.getElementById("userName");

  if (userSpan) {
    // No futuro, isso pode vir da API (ex: dados do médico logado)
    userSpan.textContent = "Dr. Marco Antônio Comper";
  }

  // Aqui podem entrar outros comportamentos globais leves,
  // como abertura/fechamento de menus, toasts, etc.
});
