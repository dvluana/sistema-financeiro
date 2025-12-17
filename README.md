# Sistema Financeiro Simples

Sistema de controle financeiro minimalista que substitui planilhas. O usuário vê o mês atual com entradas, saídas e saldo.

## Stack

| Camada   | Tecnologia                                                    |
| -------- | ------------------------------------------------------------- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend  | Node.js, TypeScript, Fastify, Zod                             |
| Banco    | Supabase (PostgreSQL)                                         |

## Estrutura do Projeto

```
/sistema-financeiro
├── apps/
│   ├── web/                    # Frontend React
│   │   ├── src/
│   │   │   ├── components/     # Componentes React
│   │   │   │   └── ui/         # shadcn/ui components
│   │   │   ├── pages/          # Páginas
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── lib/            # Utilitários e API client
│   │   │   ├── stores/         # Zustand stores
│   │   │   └── styles/         # CSS global
│   │   └── ...
│   │
│   └── api/                    # Backend Fastify
│       ├── src/
│       │   ├── controllers/    # Controllers (não usado - rotas diretas)
│       │   ├── services/       # Lógica de negócio
│       │   ├── repositories/   # Acesso a dados
│       │   ├── schemas/        # Schemas Zod
│       │   ├── routes/         # Definição de rotas
│       │   └── lib/            # Utilitários (Supabase client)
│       └── ...
│
├── supabase/
│   └── migrations/             # SQL migrations
│
└── package.json                # Monorepo config
```

## 📚 Documentação

A documentação completa do projeto está organizada na pasta `docs/`:

- 📐 **[Arquitetura e Especificações](./docs/architecture/ARCHITECTURE.md)** - Detalhes técnicos completos
- 🚀 **[Features](./docs/features/)** - Documentação de funcionalidades
- 🛠️ **[Desenvolvimento](./docs/development/)** - Guias e relatórios de desenvolvimento
- 🗄️ **[Banco de Dados](./docs/database/)** - Migrations e segurança

👉 **[Ver índice completo da documentação](./docs/README.md)**

## Como rodar

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

**apps/api/.env**
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
PORT=3333
```

**apps/web/.env**
```env
VITE_API_URL=http://localhost:3333
```

### 3. Criar tabelas no Supabase

Execute o SQL em `supabase/migrations/001_initial_schema.sql` no Supabase SQL Editor.

### 4. Rodar em desenvolvimento

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3333

## API Endpoints

| Método | Rota                           | Descrição                           |
| ------ | ------------------------------ | ----------------------------------- |
| GET    | /api/lancamentos?mes=YYYY-MM   | Lista lançamentos com totalizadores |
| POST   | /api/lancamentos               | Cria lançamento                     |
| PUT    | /api/lancamentos/:id           | Atualiza lançamento                 |
| PATCH  | /api/lancamentos/:id/concluido | Alterna status                      |
| DELETE | /api/lancamentos/:id           | Remove lançamento                   |
| GET    | /api/configuracoes             | Lista configurações                 |
| PUT    | /api/configuracoes/:chave      | Atualiza configuração               |

## Funcionalidades

- Adicionar entradas e saídas
- Marcar/desmarcar como pago/recebido
- Editar e excluir lançamentos
- Navegar entre meses (botões e swipe)
- Configurações do usuário
- Totalizadores automáticos
- Design responsivo (mobile-first)
