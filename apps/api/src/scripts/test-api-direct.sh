#!/bin/bash

# Teste direto da API de lançamento rápido

echo "🔍 Testando API diretamente..."

TEXTO='Loumar	R$ 3.750,00
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
Rafael	R$ 400,00'

# Primeiro precisa fazer login para pegar o token
echo "📝 Fazendo login..."
TOKEN=$(curl -s -X POST http://localhost:3333/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@teste.com","senha":"123456"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Erro ao fazer login. Criando usuário de teste..."
  curl -s -X POST http://localhost:3333/auth/registrar \
    -H "Content-Type: application/json" \
    -d '{"nome":"Teste","email":"teste@teste.com","senha":"123456"}' > /dev/null
  
  TOKEN=$(curl -s -X POST http://localhost:3333/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"teste@teste.com","senha":"123456"}' | grep -o '"token":"[^"]*' | cut -d'"' -f4)
fi

echo "🔑 Token obtido: ${TOKEN:0:20}..."

# Agora testa o parse de lançamentos
echo "📤 Enviando texto para API..."
RESPONSE=$(curl -s -X POST http://localhost:3333/api/ai/parse-lancamentos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"texto\":\"$TEXTO\",\"mes\":\"2024-12\"}")

echo ""
echo "📥 Resposta da API:"
echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"

# Conta quantos lançamentos foram retornados
TOTAL=$(echo "$RESPONSE" | grep -o '"tipo"' | wc -l)
echo ""
echo "📊 Total de lançamentos processados: $TOTAL"

if [ "$TOTAL" -eq "13" ]; then
  echo "✅ API funcionando corretamente!"
else
  echo "❌ API retornou $TOTAL lançamentos, esperado 13"
fi
