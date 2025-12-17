/**
 * Script de debug para identificar problemas no parsing
 */

import 'dotenv/config'

// Simula o preprocessTexto
function preprocessTexto(texto: string): string {
  let result = texto;

  // Detecta se é formato de tabela (com tabs) e preserva estrutura
  const temTabs = result.includes('\t');
  if (temTabs) {
    // Formato de tabela com tabs - apenas normaliza valores
    result = result.replace(
      /R\$\s*(\d{1,3}(?:\.\d{3})+),(\d{2})/g,
      (_, inteiro, decimal) => {
        const valorSemPonto = inteiro.replace(/\./g, "");
        return `R$ ${valorSemPonto}.${decimal}`;
      }
    );
    
    // Normaliza valores sem R$ (3.750,00 -> 3750.00)
    result = result.replace(
      /(\d{1,3}(?:\.\d{3})+),(\d{2})\b/g,
      (_, inteiro, decimal) => {
        const valorSemPonto = inteiro.replace(/\./g, "");
        return `${valorSemPonto}.${decimal}`;
      }
    );
    
    return result;
  }

  return result;
}

// Casos problemáticos identificados
const casosTeste = [
  "Stant Manutenção\tR$ 597,00",
  "Rafael\tR$ 400,00",
  "Projeto Dockr 1/2\tR$ 765,90",
  "Projeto Dockr 2/2\tR$ 765,90",
];

console.log('🔍 Analisando casos problemáticos:\n');

casosTeste.forEach((caso, index) => {
  console.log(`${index + 1}. Input: "${caso}"`);
  
  const processado = preprocessTexto(caso);
  console.log(`   Processado: "${processado}"`);
  
  // Testa extração de valor
  let valorMatch = processado.match(/R?\$?\s*(\d+(?:\.\d+)?)\s*$/);
  if (!valorMatch) {
    valorMatch = processado.match(/(\d+,\d{2})\s*$/);
    if (valorMatch) {
      valorMatch[1] = valorMatch[1].replace(',', '.');
    }
  }
  
  console.log(`   Valor extraído: ${valorMatch ? valorMatch[1] : 'FALHOU'}`);
  
  // Testa extração de nome
  let resto = processado
    .replace(/\s*(\d{1,2})?\s*(\d+(?:\.\d{1,2})?)\s*$/, "")
    .trim();
  resto = resto.replace(/\t+/g, " ").replace(/\s+/g, " ").trim();
  resto = resto.replace(/R\$\s*$/i, "").trim();
  
  console.log(`   Nome extraído: "${resto}"`);
  console.log('');
});

console.log('\n🔬 Análise do problema:');
console.log('1. Valores com vírgula sem R$ não estão sendo detectados');
console.log('2. Rafael pode estar sendo filtrado por ser muito curto');
console.log('3. Projeto Dockr pode ter problema no nome com vírgula');
