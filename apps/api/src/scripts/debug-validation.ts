/**
 * Script de debug para verificar validação de tipo
 */

// Simula a função normalizarTexto
function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Simula validarTipo
function validarTipo(
  tipoIA: 'entrada' | 'saida',
  textoOriginal: string,
  nome?: string
): 'entrada' | 'saida' {
  const textoN = normalizarTexto(textoOriginal);
  const nomeN = nome ? normalizarTexto(nome) : '';

  console.log(`  Debug validarTipo:`);
  console.log(`    tipoIA: ${tipoIA}`);
  console.log(`    textoOriginal: "${textoOriginal}"`);
  console.log(`    textoNormalizado: "${textoN}"`);
  console.log(`    nome: "${nome}"`);
  console.log(`    nomeNormalizado: "${nomeN}"`);

  const PALAVRAS_ENTRADA_CRITICAS = [
    'salario',
    'holerite',
    '13o',
    'decimo terceiro',
    'ferias',
    'freela',
    'freelance',
    'freelancer',
    'dividendo',
    'dividendos',
    'rendimento',
    'rendimentos',
    'juros',
    'resgate',
    'investimento',
    'investimentos',
    'acoes',
    'fii',
    'fiis',
    'cdb',
    'poupanca',
    'lucro',
    'comissao',
    'bonus',
    'reembolso',
  ];

  // Verifica no texto
  for (const palavra of PALAVRAS_ENTRADA_CRITICAS) {
    if (textoN.includes(palavra)) {
      console.log(`    ✓ Encontrou "${palavra}" no texto normalizado`);
      if (tipoIA === 'saida') {
        console.log(`    → Corrigindo de saida para entrada`);
        return 'entrada';
      }
      return tipoIA;
    }
  }

  // Verifica no nome
  if (nomeN) {
    for (const palavra of PALAVRAS_ENTRADA_CRITICAS) {
      if (nomeN.includes(palavra)) {
        console.log(`    ✓ Encontrou "${palavra}" no nome normalizado`);
        if (tipoIA === 'saida') {
          console.log(`    → Corrigindo de saida para entrada`);
          return 'entrada';
        }
        return tipoIA;
      }
    }
  }

  console.log(`    ✗ Nenhuma palavra-chave encontrada`);
  return tipoIA;
}

// Testes
console.log('='.repeat(60));
console.log('DEBUG: Verificando normalização e validação');
console.log('='.repeat(60));
console.log('');

// Teste 1: "salário 5000"
console.log('Teste 1: "salário 5000" com nome "Salário"');
const result1 = validarTipo('saida', 'salário 5000', 'Salário');
console.log(`  Resultado: ${result1}`);
console.log(`  Esperado: entrada`);
console.log(`  ${result1 === 'entrada' ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log('');

// Teste 2: Verificação isolada de normalização
console.log('Verificação de normalização:');
console.log(`  "salário" → "${normalizarTexto('salário')}"`);
console.log(`  "Salário" → "${normalizarTexto('Salário')}"`);
console.log(`  "salário 5000" → "${normalizarTexto('salário 5000')}"`);
console.log(`  "salário 5000".includes("salario") → ${normalizarTexto('salário 5000').includes('salario')}`);
console.log('');

// Teste 3: "freela 5k"
console.log('Teste 2: "freela 5k" com nome "Freela"');
const result2 = validarTipo('saida', 'freela 5k', 'Freela');
console.log(`  Resultado: ${result2}`);
console.log(`  Esperado: entrada`);
console.log(`  ${result2 === 'entrada' ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log('');

// Teste 4: "dividendos 150"
console.log('Teste 3: "dividendos 150" com nome "Dividendos"');
const result3 = validarTipo('saida', 'dividendos 150', 'Dividendos');
console.log(`  Resultado: ${result3}`);
console.log(`  Esperado: entrada`);
console.log(`  ${result3 === 'entrada' ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log('');

console.log('='.repeat(60));
console.log('Se todos passaram aqui, o problema está na chamada dentro do serviço');
console.log('='.repeat(60));
