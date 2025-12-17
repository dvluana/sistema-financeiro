# 📚 Documentação do Sistema Financeiro

## Estrutura da Documentação

### 📐 [Arquitetura](./architecture/)
- [ARCHITECTURE.md](./architecture/ARCHITECTURE.md) - Especificação técnica completa do sistema

### 🚀 [Features](./features/)
- [AGRUPADORES_BUSINESS_RULES.md](./features/AGRUPADORES_BUSINESS_RULES.md) - Regras de negócio dos agrupadores
- [CONTEXTO_LANCAMENTO_RAPIDO_IA.md](./features/CONTEXTO_LANCAMENTO_RAPIDO_IA.md) - Contexto do lançamento rápido com IA
- [GAPS_LANCAMENTO_RAPIDO.md](./features/GAPS_LANCAMENTO_RAPIDO.md) - Gaps identificados no lançamento rápido
- [MELHORIAS_LANCAMENTO_RAPIDO.md](./features/MELHORIAS_LANCAMENTO_RAPIDO.md) - Melhorias propostas para lançamento rápido
- [TESTE_LANCAMENTO_RAPIDO.md](./features/TESTE_LANCAMENTO_RAPIDO.md) - Casos de teste do lançamento rápido
- [WHATSAPP_INTEGRATION.md](./features/WHATSAPP_INTEGRATION.md) - Integração com WhatsApp

### 🛠️ [Desenvolvimento](./development/)
- [IMPROVEMENTS_REPORT.md](./development/IMPROVEMENTS_REPORT.md) - Relatório completo de melhorias e otimizações
- [PROJECT_STRUCTURE.md](./development/PROJECT_STRUCTURE.md) - Estrutura e organização do projeto

### 🗄️ [Banco de Dados](./database/)
- [006_README.md](./database/006_README.md) - Documentação da migração 006
- [010_RLS_README.md](./database/010_RLS_README.md) - Documentação do Row Level Security
- [APLICAR_RLS.md](./database/APLICAR_RLS.md) - Guia para aplicar RLS
- [EXEMPLOS_RLS.md](./database/EXEMPLOS_RLS.md) - Exemplos de implementação RLS

---

## Navegação Rápida

### Para Desenvolvedores
1. Começar pelo [README principal](../README.md) para visão geral
2. Consultar [ARCHITECTURE.md](./architecture/ARCHITECTURE.md) para detalhes técnicos
3. Ver [IMPROVEMENTS_REPORT.md](./development/IMPROVEMENTS_REPORT.md) para tarefas pendentes

### Para Features
1. [Lançamento Rápido com IA](./features/CONTEXTO_LANCAMENTO_RAPIDO_IA.md)
2. [Agrupadores](./features/AGRUPADORES_BUSINESS_RULES.md)
3. [Integração WhatsApp](./features/WHATSAPP_INTEGRATION.md)

### Para Banco de Dados
1. [Migrations](../supabase/migrations/) - Scripts SQL
2. [Row Level Security](./database/010_RLS_README.md) - Segurança
3. [Exemplos RLS](./database/EXEMPLOS_RLS.md) - Casos de uso

---

## Convenções de Documentação

### Nomenclatura de Arquivos
- `README.md` - Índices e visões gerais
- `FEATURE_NAME.md` - Documentação de features específicas
- `*_RULES.md` - Regras de negócio
- `*_REPORT.md` - Relatórios e análises
- `*_TEST.md` - Casos de teste

### Estrutura dos Documentos
1. **Título** - Nome claro da documentação
2. **Resumo** - Breve descrição (2-3 linhas)
3. **Contexto** - Quando necessário
4. **Conteúdo Principal** - Bem organizado com headers
5. **Exemplos** - Sempre que possível
6. **Referências** - Links para arquivos relacionados

### Atualizações
- Sempre atualizar este índice ao adicionar nova documentação
- Manter links relativos funcionando
- Adicionar data de última atualização em documentos críticos

---

*Última atualização: 17/12/2024*
