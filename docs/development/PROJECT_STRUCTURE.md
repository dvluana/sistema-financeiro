# 📁 Estrutura e Organização do Projeto

## Visão Geral

Este documento descreve a organização dos arquivos e diretórios do Sistema Financeiro.

---

## Estrutura de Diretórios

```
sistema-financeiro/
│
├── 📄 README.md                    # Visão geral e instruções básicas
├── 📄 package.json                 # Configuração do monorepo
├── 📄 .gitignore                   # Arquivos ignorados pelo git
├── 📄 .eslintrc.json              # Configuração do linter
├── 📄 .prettierrc                 # Configuração de formatação
├── 📄 .prettierignore             # Arquivos ignorados pelo prettier
├── 📄 Procfile                    # Configuração do Heroku
│
├── 📂 apps/                       # Aplicações do monorepo
│   ├── 📂 api/                   # Backend (Node.js/Fastify)
│   │   ├── 📂 src/
│   │   │   ├── 📂 constants/     # Constantes e configurações
│   │   │   ├── 📂 lib/          # Bibliotecas e utilitários
│   │   │   ├── 📂 middleware/   # Middlewares do Fastify
│   │   │   ├── 📂 repositories/ # Camada de dados
│   │   │   ├── 📂 routes/       # Definição de rotas
│   │   │   ├── 📂 schemas/      # Validação com Zod
│   │   │   ├── 📂 scripts/      # Scripts de desenvolvimento
│   │   │   ├── 📂 services/     # Lógica de negócio
│   │   │   ├── 📂 types/        # TypeScript types
│   │   │   └── 📄 server.ts     # Entry point da API
│   │   ├── 📂 tests/            # Testes (a implementar)
│   │   ├── 📄 package.json
│   │   └── 📄 tsconfig.json
│   │
│   └── 📂 web/                   # Frontend (React/Vite)
│       ├── 📂 public/           # Assets públicos
│       ├── 📂 src/
│       │   ├── 📂 components/   # Componentes React
│       │   │   └── 📂 ui/      # Componentes shadcn/ui
│       │   ├── 📂 hooks/       # Custom React hooks
│       │   ├── 📂 lib/         # Utilitários e API client
│       │   ├── 📂 pages/       # Páginas/Views
│       │   ├── 📂 stores/      # Estado global (Zustand)
│       │   ├── 📂 styles/      # CSS global
│       │   ├── 📄 App.tsx      # Componente principal
│       │   └── 📄 main.tsx     # Entry point
│       ├── 📄 package.json
│       ├── 📄 tsconfig.json
│       └── 📄 vite.config.ts
│
├── 📂 docs/                      # Documentação completa
│   ├── 📄 README.md             # Índice da documentação
│   ├── 📂 architecture/         # Arquitetura e design
│   │   └── 📄 ARCHITECTURE.md   # Especificação técnica
│   ├── 📂 database/             # Documentação do banco
│   │   ├── 📄 006_README.md
│   │   ├── 📄 010_RLS_README.md
│   │   ├── 📄 APLICAR_RLS.md
│   │   └── 📄 EXEMPLOS_RLS.md
│   ├── 📂 development/          # Guias de desenvolvimento
│   │   ├── 📄 IMPROVEMENTS_REPORT.md
│   │   └── 📄 PROJECT_STRUCTURE.md (este arquivo)
│   └── 📂 features/             # Documentação de features
│       ├── 📄 AGRUPADORES_BUSINESS_RULES.md
│       ├── 📄 CONTEXTO_LANCAMENTO_RAPIDO_IA.md
│       ├── 📄 GAPS_LANCAMENTO_RAPIDO.md
│       ├── 📄 MELHORIAS_LANCAMENTO_RAPIDO.md
│       ├── 📄 TESTE_LANCAMENTO_RAPIDO.md
│       └── 📄 WHATSAPP_INTEGRATION.md
│
├── 📂 scripts/                   # Scripts do projeto
│   └── 📄 kill-ports.sh         # Limpa portas em uso
│
└── 📂 supabase/                  # Configuração do Supabase
    └── 📂 migrations/           # Scripts SQL de migração
        ├── 📄 001_initial_schema.sql
        ├── 📄 002_auth_schema.sql
        ├── 📄 003_performance_indexes.sql
        ├── 📄 004_google_calendar_tokens.sql
        ├── 📄 005_lancamentos_agrupados.sql
        ├── 📄 006_agrupadores_constraints.sql
        ├── 📄 006_perfis_workspaces.sql
        ├── 📄 007_fix_agrupador_architecture.sql
        ├── 📄 008_agrupador_valor_modo.sql
        ├── 📄 009_filhos_sem_concluido.sql
        ├── 📄 010_enable_rls.sql
        ├── 📄 010_validate_rls.sql
        ├── 📄 011_dashboard_optimizations.sql
        └── 📄 012_perfis_limit_constraint.sql
```

---

## Convenções de Nomenclatura

### Arquivos TypeScript/JavaScript
- **PascalCase** para componentes React: `LancamentoSheet.tsx`
- **camelCase** para utilitários: `formatCurrency.ts`
- **kebab-case** para rotas e schemas: `auth.routes.ts`, `lancamento.schema.ts`
- **Sufixo descritivo**: `.service.ts`, `.repository.ts`, `.routes.ts`

### Arquivos de Documentação
- **UPPERCASE** para documentos importantes: `README.md`, `ARCHITECTURE.md`
- **Underscore** para separar palavras: `IMPROVEMENTS_REPORT.md`
- **Sufixo descritivo**: `_RULES.md`, `_REPORT.md`, `_TEST.md`

### Migrations SQL
- **Numeração sequencial**: `001_`, `002_`, etc.
- **Snake_case** para nomes: `initial_schema.sql`
- **Descritivo e específico**: `enable_rls.sql`, `dashboard_optimizations.sql`

---

## Organização por Camadas

### Backend (API)

```
routes/ → services/ → repositories/ → database
```

1. **Routes**: Define endpoints e validações de entrada
2. **Services**: Contém lógica de negócio
3. **Repositories**: Acesso direto ao banco de dados
4. **Schemas**: Validação de dados com Zod

### Frontend (Web)

```
pages/ → components/ → stores/ → api/
```

1. **Pages**: Containers principais
2. **Components**: Elementos reutilizáveis
3. **Stores**: Estado global (Zustand)
4. **Lib**: API client e utilitários

---

## Padrões de Organização

### ✅ Boas Práticas Implementadas
- Separação clara entre frontend e backend
- Documentação organizada por categoria
- Migrations numeradas sequencialmente
- Componentes organizados por tipo
- TypeScript em todo o projeto

### ⚠️ Melhorias Necessárias
- [ ] Adicionar pasta `tests/` em ambas aplicações
- [ ] Criar pasta `packages/` para código compartilhado
- [ ] Adicionar `.github/workflows/` para CI/CD
- [ ] Implementar estrutura de testes E2E
- [ ] Criar pasta `config/` para configurações centralizadas

---

## Arquivos Importantes

### Configuração
- `.eslintrc.json` - Regras de linting
- `.prettierrc` - Formatação de código
- `tsconfig.json` - Configuração TypeScript
- `vite.config.ts` - Build do frontend
- `Procfile` - Deploy no Heroku

### Documentação Principal
- `README.md` - Ponto de entrada
- `docs/README.md` - Índice da documentação
- `docs/architecture/ARCHITECTURE.md` - Especificação técnica
- `docs/development/IMPROVEMENTS_REPORT.md` - Melhorias pendentes

---

## Comandos Úteis

```bash
# Navegar pela estrutura
find . -type d -name "node_modules" -prune -o -type f -name "*.md" -print

# Contar arquivos por tipo
find apps -name "*.ts" -o -name "*.tsx" | wc -l

# Ver estrutura em árvore (requer tree instalado)
tree -I 'node_modules|dist|build' -L 3

# Limpar arquivos de build
npm run clean
```

---

*Última atualização: 17/12/2024*
