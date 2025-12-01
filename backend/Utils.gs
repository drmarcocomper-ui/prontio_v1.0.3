/**
 * Utils.gs
 * Funções utilitárias e padronizações gerais.
 */

function prontioSuccess_(data) {
  return createApiResponse_(true, data, []);
}

function prontioError_(msg) {
  return createApiResponse_(false, null, [msg]);
}

// Geração simples de ID
function generateId_(prefix) {
  var ts = new Date().getTime();
  var rand = Math.floor(Math.random() * 1000);
  return prefix + "_" + ts + "_" + rand;
}
