// Teste específico para Rafael
const texto = "Rafael	R$ 400,00";
const processado = "Rafael	R$ 400.00"; // após processamento

// Extrai apenas o nome
const nome = processado
  .replace(/R\$?\s*\d+(?:\.\d{3})*,\d{2}\s*$/, "")
  .replace(/\s*\d+(?:\.\d{1,2})?\s*$/, "")
  .replace(/\t+/g, " ")
  .trim();

console.log('Texto original:', texto);
console.log('Nome extraído:', nome);
console.log('Teste regex nome simples:', /^[A-Z][a-z]+$/.test(nome));
console.log('Primeira letra maiúscula:', /^[A-Z]/.test(nome));

// Simula a lógica atual
const nomeSimples = /^[A-Z][a-z]+$/.test(nome);
console.log('Nome simples?', nomeSimples);

if (nomeSimples) {
  console.log('✅ Deveria ser ENTRADA');
} else {
  console.log('❌ Será SAÍDA (problema!)');
}
