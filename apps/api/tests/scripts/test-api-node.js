/**
 * Script Node.js para testar a API diretamente
 */

const texto = `Loumar	R$ 3.750,00
WKM UX/UI	R$ 2.400,00
WKM Social Media	R$ 1.650,00
Stant 1	R$ 2.298,50
Stant 2	R$ 2.298,50
Horas Extras Stant Nov	R$ 1.194,00
Horas Extras Stant Nov	R$ 1.194,00
Stant Manutenção	R$ 597,00
Com Sorte	R$ 3.880,00
MSD Servicos	R$ 10.440,00
Topfarm	R$ 873
Clayton	R$ 730
Rafael	R$ 400,00
Projeto Jasmine LP 1/2	R$ 1.125,00
Projeto Jasmine LP 2/2	R$ 1.125,00
Projeto Sistema PP	R$ 8.250,00
Projeto Dockr 1/2	R$ 765,90
Projeto Dockr 2/2	R$ 765,90
Projeto Jasmine Site 50%	R$ 2.125,00
"Projeto Jasmine Site 50%	"	R$ 2.125,00`;

async function testarAPI() {
  console.log('🔍 Testando API diretamente...\n');

  // Primeiro faz login
  console.log('📝 Fazendo login...');
  
  let token;
  try {
    // Tenta fazer login
    const loginRes = await fetch('http://localhost:3333/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'teste@teste.com',
        senha: '123456'
      })
    });

    if (!loginRes.ok) {
      // Se falhar, cria usuário
      console.log('Criando usuário de teste...');
      const regRes = await fetch('http://localhost:3333/auth/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: 'Teste',
          email: 'teste@teste.com',
          senha: '123456'
        })
      });
      const regData = await regRes.json();
      if (regData.token) {
        token = regData.token;
        console.log('✅ Usuário criado e autenticado');
        return;
      }

      // Tenta login novamente
      const loginRes2 = await fetch('http://localhost:3333/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'teste@teste.com',
          senha: '123456'
        })
      });
      const data = await loginRes2.json();
      token = data.token;
    } else {
      const data = await loginRes.json();
      token = data.token;
    }
  } catch (err) {
    console.error('❌ Erro ao fazer login:', err.message);
    return;
  }

  console.log('🔑 Token obtido:', token?.substring(0, 20) + '...\n');

  // Testa parse de lançamentos
  console.log('📤 Enviando texto para API...');
  console.log('   Texto tem', texto.split('\n').length, 'linhas\n');

  try {
    const response = await fetch('http://localhost:3333/api/ai/parse-lancamentos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        texto: texto,
        mes: '2024-12'
      })
    });

    const result = await response.json();
    
    console.log('📥 Resposta da API:');
    
    if (result.lancamentos) {
      console.log(`   ✅ ${result.lancamentos.length} lançamentos processados\n`);
      
      // Mostra resumo
      let totalEntradas = 0;
      let totalSaidas = 0;
      
      result.lancamentos.forEach((l, i) => {
        const tipo = l.tipo === 'entrada' ? '💚' : '💔';
        console.log(`   ${i + 1}. ${tipo} ${l.nome}: R$ ${l.valor}`);
        
        if (l.tipo === 'entrada') {
          totalEntradas += l.valor;
        } else {
          totalSaidas += l.valor;
        }
      });
      
      console.log('\n💰 Totais:');
      console.log(`   Entradas: R$ ${totalEntradas.toFixed(2)}`);
      console.log(`   Saídas: R$ ${totalSaidas.toFixed(2)}`);
      
      console.log('\n📊 Taxa de processamento:');
      const esperado = 20;
      const processados = result.lancamentos.length;
      const taxa = (processados / esperado) * 100;
      console.log(`   ${taxa.toFixed(1)}% (${processados}/${esperado})`);
      
      if (taxa === 100) {
        console.log('\n✅ API funcionando perfeitamente!');
      } else {
        console.log('\n⚠️ API processou parcialmente');
      }
    } else {
      console.log('❌ Erro:', result.error || JSON.stringify(result));
    }
  } catch (err) {
    console.error('❌ Erro ao chamar API:', err);
  }
}

testarAPI();
