# Sistema Financeiro Simples — Especificação Técnica

---

## Índice de Navegação

Use este índice para localizar rapidamente o que você precisa implementar.

| #   | Seção                   | Consultar quando...                                             |
| --- | ----------------------- | --------------------------------------------------------------- |
| 1   | **Visão Geral**         | Precisar entender o propósito do sistema                        |
| 2   | **Stack e Estrutura**   | Configurar o projeto, criar pastas, instalar dependências       |
| 3   | **Banco de Dados**      | Criar tabelas, migrations, configurar Supabase                  |
| 4   | **API Backend**         | Implementar rotas, controllers, services, validações            |
| 5   | **Design Tokens**       | Configurar Tailwind, cores, fontes, espaçamentos                |
| 6   | **Componentes**         | Criar componentes visuais (Card, Button, Input, etc.)           |
| 7   | **Tela Principal**      | Montar o layout da página, blocos de entradas/saídas/resultado  |
| 8   | **Jornadas do Usuário** | Implementar fluxos completos (adicionar, editar, excluir, etc.) |
| 9   | **Estados e Feedbacks** | Implementar loading, empty, erro, confirmações                  |
| 10  | **Responsividade**      | Ajustar breakpoints e layout mobile/tablet/desktop              |
| 11  | **Configurações**       | Preferências do usuário e comportamentos padrão                 |

---

## 1. Visão Geral

O sistema é um controle financeiro minimalista que substitui planilhas. O usuário vê o mês atual com entradas, saídas e saldo. Pode adicionar itens, marcar como pago/recebido e navegar entre meses.

**Princípios:**

- Prioridade absoluta: funcionamento perfeito em mobile
- Simplicidade: uma única tela principal, sem menus complexos
- Performance: carregamento rápido, interações instantâneas
- Backend obrigatório: frontend nunca acessa banco diretamente
- Feedback satisfatório: cada interação deve ser visualmente gratificante
- Área de toque generosa: todos os elementos interativos têm área mínima de 48px

**Fase atual:** v0.1 (Planilha Digital) — sem autenticação, sem categorias, sem relatórios.

---

## 2. Stack e Estrutura

### Tecnologias

| Camada   | Tecnologia                                                         |
| -------- | ------------------------------------------------------------------ |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend  | Node.js, TypeScript, Fastify, Zod                                  |
| Banco    | Supabase (PostgreSQL)                                              |
| Deploy   | Vercel (front), Railway/Render (back), Supabase (db)               |

### Filosofia de Componentes

**Regra fundamental:** Usar shadcn/ui como base sempre que possível. Customizar via Tailwind config e className, nunca hardcode inline. Criar componentes novos apenas quando não existir equivalente no shadcn.

| Componente    | Origem    | Como customizar                               |
| ------------- | --------- | --------------------------------------------- |
| Button        | shadcn/ui | Variantes customizadas no tailwind.config     |
| Input         | shadcn/ui | Extend de estilos via className               |
| Card          | shadcn/ui | Customizar via tailwind.config                |
| Dialog        | shadcn/ui | Usar para confirmações                        |
| Sheet         | shadcn/ui | Base para Bottomsheet                         |
| Switch        | shadcn/ui | Usar para toggles                             |
| Drawer        | shadcn/ui | Para configurações mobile                     |
| StatusCircle  | **NOVO**  | Componente customizado (não existe no shadcn) |
| InputMoeda    | **NOVO**  | Wrapper do Input com máscara                  |
| ItemLista     | **NOVO**  | Composição de componentes                     |
| Totalizadores | **NOVO**  | Composição de componentes                     |

### Dependências Frontend

```json
{
  "dependencies": {
    "@radix-ui/react-icons": "^1.3.0",
    "framer-motion": "^11.0.0",
    "date-fns": "^3.0.0",
    "react-currency-input-field": "^3.8.0",
    "zustand": "^4.5.0"
  }
}
```

### Estrutura de Pastas

```
/projeto
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/           # shadcn/ui (gerado pelo CLI)
│   │   │   │   ├── StatusCircle.tsx
│   │   │   │   ├── ItemLista.tsx
│   │   │   │   ├── InputMoeda.tsx
│   │   │   │   ├── Totalizadores.tsx
│   │   │   │   └── ...
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   ├── stores/
│   │   │   └── styles/
│   │   ├── tailwind.config.js
│   │   └── components.json       # config shadcn
│   │
│   └── api/
│       ├── src/
│       │   ├── controllers/
│       │   ├── services/
│       │   ├── repositories/
│       │   ├── schemas/
│       │   ├── routes/
│       │   ├── middleware/
│       │   └── lib/
│       └── package.json
│
├── package.json
└── README.md
```

### Variáveis de Ambiente

**apps/api/.env**

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
PORT=3333
```

**apps/web/.env**

```
VITE_API_URL=http://localhost:3333
```

---

## 3. Banco de Dados

### Tabela: lancamentos

```sql
CREATE TYPE tipo_lancamento AS ENUM ('entrada', 'saida');

CREATE TABLE lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo tipo_lancamento NOT NULL,
  nome VARCHAR(100) NOT NULL,
  valor DECIMAL(12,2) NOT NULL CHECK (valor > 0),
  concluido BOOLEAN DEFAULT FALSE,
  data_prevista DATE,
  mes VARCHAR(7) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lancamentos_mes ON lancamentos(mes);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_updated_at
  BEFORE UPDATE ON lancamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### Tabela: configuracoes

```sql
CREATE TABLE configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave VARCHAR(50) UNIQUE NOT NULL,
  valor JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO configuracoes (chave, valor) VALUES
  ('entradas_auto_recebido', 'false'),
  ('saidas_auto_pago', 'false'),
  ('mostrar_concluidos_discretos', 'true');
```

### Campos

| Campo         | Tipo          | Descrição               |
| ------------- | ------------- | ----------------------- |
| id            | UUID          | PK, auto-gerado         |
| tipo          | ENUM          | 'entrada' ou 'saida'    |
| nome          | VARCHAR(100)  | Descrição do lançamento |
| valor         | DECIMAL(12,2) | Valor em reais, > 0     |
| concluido     | BOOLEAN       | Se foi pago/recebido    |
| data_prevista | DATE          | Dia previsto (opcional) |
| mes           | VARCHAR(7)    | Formato "YYYY-MM"       |

---

## 4. API Backend

### Endpoints

| Método | Rota                           | Descrição                           |
| ------ | ------------------------------ | ----------------------------------- |
| GET    | /api/lancamentos?mes=YYYY-MM   | Lista lançamentos com totalizadores |
| POST   | /api/lancamentos               | Cria lançamento                     |
| PUT    | /api/lancamentos/:id           | Atualiza lançamento                 |
| PATCH  | /api/lancamentos/:id/concluido | Alterna status                      |
| DELETE | /api/lancamentos/:id           | Remove lançamento                   |
| GET    | /api/configuracoes             | Lista configurações                 |
| PUT    | /api/configuracoes/:chave      | Atualiza configuração               |

### Schemas Zod

```typescript
import { z } from "zod";

export const tipoLancamento = z.enum(["entrada", "saida"]);

export const criarLancamentoSchema = z.object({
  tipo: tipoLancamento,
  nome: z.string().min(1).max(100),
  valor: z.number().positive(),
  mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  concluido: z.boolean().optional().default(false),
  data_prevista: z.string().nullable().optional(),
});

export const atualizarLancamentoSchema = z.object({
  nome: z.string().min(1).max(100).optional(),
  valor: z.number().positive().optional(),
  data_prevista: z.string().nullable().optional(),
});
```

### Resposta GET /api/lancamentos

```typescript
interface LancamentoResponse {
  mes: string;
  entradas: Lancamento[];
  saidas: Lancamento[];
  totais: {
    entradas: number;
    jaEntrou: number;
    faltaEntrar: number;
    saidas: number;
    jaPaguei: number;
    faltaPagar: number;
    saldo: number;
  };
}
```

### Cálculo de Totalizadores (Service)

```typescript
function calcularTotais(entradas: Lancamento[], saidas: Lancamento[]) {
  const totalEntradas = entradas.reduce((sum, e) => sum + e.valor, 0);
  const jaEntrou = entradas
    .filter((e) => e.concluido)
    .reduce((sum, e) => sum + e.valor, 0);
  const faltaEntrar = totalEntradas - jaEntrou;

  const totalSaidas = saidas.reduce((sum, s) => sum + s.valor, 0);
  const jaPaguei = saidas
    .filter((s) => s.concluido)
    .reduce((sum, s) => sum + s.valor, 0);
  const faltaPagar = totalSaidas - jaPaguei;

  return {
    entradas: totalEntradas,
    jaEntrou,
    faltaEntrar,
    saidas: totalSaidas,
    jaPaguei,
    faltaPagar,
    saldo: totalEntradas - totalSaidas,
  };
}
```

---

## 5. Design Tokens

### Tailwind Config Completo

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        rosa: {
          DEFAULT: "#FF385C",
          hover: "#E31C5F",
          pressed: "#D70466",
          light: "#FFF0F3",
        },
        verde: {
          DEFAULT: "#008A05",
          light: "#22C55E",
          bg: "#E8F5E9",
        },
        vermelho: {
          DEFAULT: "#D93025",
          bg: "#FFEBEE",
        },
        neutro: {
          900: "#222222",
          600: "#717171",
          400: "#9CA3AF",
          300: "#DDDDDD",
          200: "#EBEBEB",
          100: "#F7F7F7",
          0: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"',
        ],
      },
      fontSize: {
        "titulo-mes": ["24px", { fontWeight: "600", lineHeight: "1.2" }],
        "titulo-card": ["18px", { fontWeight: "600", lineHeight: "1.3" }],
        corpo: ["16px", { fontWeight: "400", lineHeight: "1.5" }],
        "corpo-medium": ["16px", { fontWeight: "500", lineHeight: "1.5" }],
        pequeno: ["14px", { fontWeight: "400", lineHeight: "1.4" }],
        "pequeno-medium": ["14px", { fontWeight: "500", lineHeight: "1.4" }],
        micro: ["13px", { fontWeight: "400", lineHeight: "1.3" }],
        destaque: ["24px", { fontWeight: "700", lineHeight: "1.2" }],
        botao: ["16px", { fontWeight: "600", lineHeight: "1" }],
      },
      borderRadius: {
        card: "12px",
        botao: "9999px", // full rounded (pill)
        input: "12px",
        bottomsheet: "24px",
        status: "9999px", // full rounded
      },
      spacing: {
        touch: "48px", // área de toque mínima
        "touch-lg": "56px", // área de toque para ações principais
      },
      minHeight: {
        touch: "48px",
        "touch-lg": "56px",
      },
      minWidth: {
        touch: "48px",
        "touch-lg": "56px",
      },
      keyframes: {
        "scale-pop": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.15)" },
          "100%": { transform: "scale(1)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "scale-pop": "scale-pop 300ms ease-out",
        "fade-in": "fade-in 200ms ease-out",
      },
    },
  },
};
```

### Variáveis CSS (globals.css)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 97%; /* #F7F7F7 */
    --foreground: 0 0% 13%; /* #222222 */
    --card: 0 0% 100%; /* #FFFFFF */
    --card-foreground: 0 0% 13%;
    --primary: 350 100% 60%; /* #FF385C */
    --primary-foreground: 0 0% 100%;
    --secondary: 0 0% 87%; /* #DDDDDD */
    --secondary-foreground: 0 0% 13%;
    --muted: 0 0% 92%; /* #EBEBEB */
    --muted-foreground: 0 0% 44%; /* #717171 */
    --destructive: 4 74% 49%; /* #D93025 */
    --destructive-foreground: 0 0% 100%;
    --border: 0 0% 87%; /* #DDDDDD */
    --input: 0 0% 87%;
    --ring: 350 100% 60%; /* #FF385C */
    --radius: 12px;
  }
}
```

### Customização do shadcn Button

Ao instalar o Button do shadcn, customizar as variantes em `components/ui/button.tsx`:

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-botao font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-rosa text-white hover:bg-rosa-hover active:bg-rosa-pressed",
        secondary: "bg-neutro-100 text-neutro-900 hover:bg-neutro-200",
        ghost: "text-neutro-600 hover:bg-neutro-100 hover:text-neutro-900",
        destructive: "text-vermelho hover:underline",
        link: "text-rosa underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-touch-lg px-8 rounded-botao", // 56px altura, pill
        sm: "min-h-touch px-6 rounded-botao", // 48px altura, pill
        icon: "min-h-touch min-w-touch rounded-botao", // 48x48, pill
        "icon-lg": "min-h-touch-lg min-w-touch-lg rounded-botao", // 56x56
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

---

## 6. Componentes

### Filosofia de Área de Toque

Todos os elementos interativos seguem estas regras:

- Área mínima: 48x48px
- Ações principais: 56px de altura
- Botões sempre com cantos 100% arredondados (pill/rounded-full)
- Espaçamento interno generoso

### Button (shadcn customizado)

| Variante    | Uso                       | Estilo                           |
| ----------- | ------------------------- | -------------------------------- |
| default     | Ações principais (Salvar) | Fundo rosa, texto branco, h-56px |
| secondary   | Ações secundárias         | Fundo cinza claro, h-48px        |
| ghost       | Adicionar item            | Sem fundo, texto cinza, h-48px   |
| destructive | Excluir                   | Apenas texto vermelho            |

```
Todos os botões:
- Border-radius: 9999px (pill, rounded-full)
- Min-height: 48px (sm) ou 56px (default)
- Padding horizontal: 24px (sm) ou 32px (default)
- Fonte: 16px/600
```

### StatusCircle (componente novo)

Componente customizado para marcar itens como concluídos. Não existe no shadcn.

```
Estrutura:
- Container touch: 48x48px (área de toque)
- Círculo visual: 28px diâmetro
- Centralizado no container

Estados:
- Pendente: círculo com borda 2px #DDDDDD, fundo transparente
- Hover: borda muda para #FF385C
- Concluído: fundo #FF385C, ícone check branco

Animação (marcar):
1. Scale pop: 1 → 1.15 → 1 (300ms)
2. Fundo preenche com rosa (200ms)
3. Check desenha (200ms, delay 100ms)

Animação (desmarcar):
1. Fade out do check e fundo (150ms)
```

**Implementação:**

```tsx
// components/StatusCircle.tsx
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

interface StatusCircleProps {
  checked: boolean;
  onChange: () => void;
}

export function StatusCircle({ checked, onChange }: StatusCircleProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="flex items-center justify-center min-w-touch min-h-touch"
      aria-label={checked ? "Marcar como pendente" : "Marcar como concluído"}
    >
      <motion.div
        className="relative w-7 h-7 rounded-status"
        whileTap={{ scale: 0.95 }}
        animate={checked ? { scale: [1, 1.15, 1] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="absolute inset-0 rounded-status border-2"
          animate={{
            borderColor: checked ? "transparent" : "#DDDDDD",
            backgroundColor: checked ? "#FF385C" : "transparent",
          }}
          whileHover={{ borderColor: checked ? "transparent" : "#FF385C" }}
          transition={{ duration: 0.2 }}
        />

        <AnimatePresence>
          {checked && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15, delay: 0.1 }}
            >
              <Check className="w-4 h-4 text-white" strokeWidth={3} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </button>
  );
}
```

### Card (shadcn customizado)

```
- Background: branco
- Border: 1px #DDDDDD
- Border-radius: 12px (rounded-card)
- Padding: 20px
- Sem sombra
```

### Input (shadcn customizado)

```
- Min-height: 48px
- Border: 1px #DDDDDD
- Border-radius: 12px (rounded-input)
- Padding: 0 16px
- Fonte: 16px/400
- Focus: border 2px #222222

Label:
- Fonte: 14px/500 #222222
- Margin-bottom: 8px
```

### InputMoeda (componente novo)

Wrapper do Input com máscara de moeda brasileira.

```tsx
// components/InputMoeda.tsx
import CurrencyInput from "react-currency-input-field";
import { Label } from "@/components/ui/label";

interface InputMoedaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function InputMoeda({ label, value, onChange }: InputMoedaProps) {
  return (
    <div className="space-y-2">
      <Label className="text-pequeno-medium text-neutro-900">{label}</Label>
      <CurrencyInput
        className="flex min-h-touch w-full rounded-input border border-neutro-300 bg-white px-4 text-corpo text-neutro-900 focus:border-2 focus:border-neutro-900 focus:outline-none"
        placeholder="R$ 0,00"
        prefix="R$ "
        decimalsLimit={2}
        decimalSeparator=","
        groupSeparator="."
        value={value}
        onValueChange={(val) => onChange(val || "")}
      />
    </div>
  );
}
```

### Sheet/Bottomsheet (shadcn customizado)

Usar o Sheet do shadcn com side="bottom" e customizações:

```
- Border-radius: 24px (só topo)
- Padding: 24px
- Max-height: 90vh
- Handle: 40px × 4px, #DDDDDD, radius full, margin-top 8px

Desktop (>1024px):
- Comporta como Dialog centralizado
- Width: 420px
- Border-radius: 16px (todos os lados)
```

### ItemLista (componente novo)

```tsx
// components/ItemLista.tsx
interface ItemListaProps {
  nome: string;
  valor: number;
  dataPrevista?: string;
  concluido: boolean;
  onToggle: () => void;
  onEdit: () => void;
}

export function ItemLista({
  nome,
  valor,
  dataPrevista,
  concluido,
  onToggle,
  onEdit,
}: ItemListaProps) {
  return (
    <div className="flex items-center gap-2 min-h-[64px] border-b border-neutro-200 last:border-0">
      <StatusCircle checked={concluido} onChange={onToggle} />

      <button
        type="button"
        onClick={onEdit}
        className={`flex-1 flex justify-between items-start py-3 text-left min-h-touch ${
          concluido ? "opacity-50" : ""
        }`}
      >
        <div className="flex flex-col">
          <span className="text-corpo text-neutro-900 truncate">{nome}</span>
          {dataPrevista && (
            <span className="text-micro text-neutro-400">
              Dia {new Date(dataPrevista).getDate()}
            </span>
          )}
        </div>
        <span className="text-corpo-medium text-neutro-900">
          {formatarMoeda(valor)}
        </span>
      </button>
    </div>
  );
}
```

### Totalizadores (componente novo)

```tsx
// components/Totalizadores.tsx
interface TotalizadoresProps {
  labelEsquerda: string;
  valorEsquerda: number;
  labelDireita: string;
  valorDireita: number;
}

export function Totalizadores({
  labelEsquerda,
  valorEsquerda,
  labelDireita,
  valorDireita,
}: TotalizadoresProps) {
  return (
    <div className="flex border-t border-neutro-200 pt-4 mt-4">
      <div className="flex-1">
        <p className="text-micro text-neutro-600">{labelEsquerda}</p>
        <p className="text-titulo-card text-neutro-900">
          {formatarMoeda(valorEsquerda)}
        </p>
      </div>
      <div className="flex-1 text-right">
        <p className="text-micro text-neutro-600">{labelDireita}</p>
        <p className="text-titulo-card text-neutro-900">
          {formatarMoeda(valorDireita)}
        </p>
      </div>
    </div>
  );
}
```

### Switch (shadcn)

Usar o Switch do shadcn para toggles no formulário.

```
Customização:
- Thumb: branco
- Track ativo: #FF385C
- Track inativo: #DDDDDD
- Área de toque do container: 48px altura
```

### Navegação de Mês (ícones)

Usar botões com variant="ghost" size="icon":

```
- Área de toque: 48x48px
- Ícone: ChevronLeft / ChevronRight (24px)
- Cor: #222222
- Hover: background #F7F7F7
- Rounded: full
```

---

## 7. Tela Principal

### Layout Geral

```
Estrutura vertical:
┌─────────────────────────────────┐
│         Cabeçalho (64px)        │
├─────────────────────────────────┤
│      Card Entradas              │
├─────────────────────────────────┤
│      Card Saídas                │
├─────────────────────────────────┤
│      Card Resultado             │
└─────────────────────────────────┘

- Background página: #F7F7F7
- Padding horizontal: 16px
- Gap entre cards: 16px
- Padding bottom: 32px (safe area)
- Max-width (desktop): 720px, centralizado
```

### Cabeçalho

```
- Altura: 64px
- Background: branco
- Padding horizontal: 8px

Layout:
[Botão ←] [    Novembro 2025    ] [Botão →] [⚙️]

- Botões navegação: 48x48px, ghost, rounded-full
- Título: 24px/600 #222222, centralizado
- Botão config: 48x48px, ghost, ícone Settings 20px
```

### Card Entradas

```
- Título: "Entradas" (18px/600)
- Lista de itens (ItemLista)
- Totalizadores: "Já entrou" | "Falta entrar"
- Botão: "Adicionar entrada" (ghost, full-width, 48px)
```

### Card Saídas

```
- Título: "Saídas" (18px/600)
- Lista de itens (ItemLista)
- Totalizadores: "Já paguei" | "Falta pagar"
- Botão: "Adicionar saída" (ghost, full-width, 48px)
```

### Card Resultado

```
- Linha: "Entradas" ........ R$ X.XXX,XX
- Linha: "Saídas" .......... R$ X.XXX,XX
- Divisor: 1px #EBEBEB
- Linha: "Saldo" ........... R$ X.XXX,XX

Saldo:
- Fonte: 24px/700
- Cor positivo: #008A05
- Cor negativo: #D93025
- Cor zero: #222222
```

---

## 8. Jornadas do Usuário

### Jornada 1: Primeiro Acesso

**Contexto:** Usuário abre o app pela primeira vez.

**Fluxo:**

1. App carrega mostrando o mês atual
2. Blocos de entradas e saídas mostram empty state
3. Card resultado mostra R$ 0,00 em todos os valores
4. Usuário vê imediatamente os botões "Adicionar entrada" e "Adicionar saída"

**Empty state:**

- Mensagem: "Nenhuma entrada ainda" / "Nenhuma saída ainda"
- Cor: #717171
- Centralizado no card
- Botão adicionar visível abaixo

**Não existe:** tutorial, onboarding, configuração inicial.

---

### Jornada 2: Adicionar uma Entrada

**Contexto:** Usuário quer registrar dinheiro que vai entrar.

**Fluxo:**

1. Usuário toca no botão "Adicionar entrada"
2. Bottomsheet sobe com animação (200ms ease-out)
3. Formulário aparece:
   - Título: "Nova entrada" (18px/600)
   - Campo: "O que entrou?" (Input texto, obrigatório)
   - Campo: "Quanto?" (InputMoeda, obrigatório)
   - Campo: "Dia previsto" (Input número 1-31, opcional, placeholder "Ex: 15")
   - Toggle: "Já recebi" (Switch, default conforme config do usuário)
   - Botão: "Salvar" (primário, 56px altura, full-width, pill)
4. Usuário preenche os campos
5. Usuário toca em "Salvar"
6. Requisição: POST /api/lancamentos
   ```json
   {
     "tipo": "entrada",
     "nome": "Salário",
     "valor": 5000.0,
     "mes": "2025-11",
     "concluido": true,
     "data_prevista": "2025-11-05"
   }
   ```
7. Backend salva e retorna mês atualizado com totalizadores
8. Bottomsheet fecha com animação
9. Novo item aparece na lista de entradas
10. Se "Já recebi" estava ligado, StatusCircle aparece preenchido
11. Totalizadores atualizam instantaneamente

**Validação:**

- Nome: obrigatório, máx 100 caracteres
- Valor: obrigatório, > 0
- Mensagem de erro inline abaixo do campo

---

### Jornada 3: Adicionar uma Saída

**Contexto:** Usuário quer registrar uma conta ou gasto.

**Fluxo:** Idêntico à Jornada 2, com diferenças:

- Título: "Nova saída"
- Campo nome: "O que foi?"
- Campo data: "Dia de vencimento"
- Toggle: "Já paguei"
- Endpoint: POST /api/lancamentos com `tipo: "saida"`

---

### Jornada 4: Marcar Entrada como Recebida

**Contexto:** Dinheiro entrou na conta, usuário quer marcar.

**Fluxo:**

1. Usuário visualiza entrada na lista com StatusCircle vazio
2. Usuário toca no StatusCircle
3. Feedback tátil imediato (haptic, se disponível)
4. Animação do StatusCircle:
   - Scale pop (1 → 1.15 → 1)
   - Preenchimento com rosa
   - Check aparece
5. Requisição: PATCH /api/lancamentos/:id/concluido
6. Backend alterna `concluido` para `true` e retorna mês atualizado
7. Item fica com opacity 0.5 (se config ativa)
8. Totalizador "Já entrou" aumenta
9. Totalizador "Falta entrar" diminui

**Duração total da interação:** ~400ms

---

### Jornada 5: Desmarcar Entrada

**Contexto:** Usuário marcou por engano ou dinheiro não entrou ainda.

**Fluxo:**

1. Usuário toca no StatusCircle preenchido
2. Animação reversa:
   - Check desaparece (fade out)
   - Fundo desfaz
   - Borda volta
3. Requisição: PATCH /api/lancamentos/:id/concluido
4. Backend alterna para `false`
5. Totalizadores atualizam inversamente

---

### Jornada 6: Marcar Saída como Paga

**Contexto:** Usuário pagou uma conta.

**Fluxo:** Idêntico à Jornada 4, com:

- Totalizador "Já paguei" aumenta
- Totalizador "Falta pagar" diminui

---

### Jornada 7: Desmarcar Saída

**Contexto:** Conta ainda não foi paga.

**Fluxo:** Idêntico à Jornada 5, com totalizadores de saída.

---

### Jornada 8: Editar um Item

**Contexto:** Usuário quer corrigir nome, valor ou data.

**Fluxo:**

1. Usuário toca na área do item (nome/valor), NÃO no StatusCircle
2. Bottomsheet sobe com formulário preenchido:
   - Título: "Editar entrada" ou "Editar saída"
   - Campos preenchidos com valores atuais
   - Toggle mostra estado atual de concluído
   - Botão "Salvar" (primário)
   - Botão "Excluir" (texto vermelho, abaixo do salvar)
3. Usuário altera o que precisar
4. Usuário toca em "Salvar"
5. Requisição: PUT /api/lancamentos/:id
6. Backend atualiza e retorna mês
7. Bottomsheet fecha
8. Item atualiza na lista
9. Totalizadores recalculam se valor mudou

---

### Jornada 9: Excluir um Item

**Contexto:** Usuário quer remover um lançamento.

**Fluxo:**

1. Dentro do bottomsheet de edição, usuário toca em "Excluir"
2. Dialog de confirmação aparece (AlertDialog do shadcn):
   - Título: "Excluir este item?"
   - Descrição: nome do item
   - Botão "Cancelar" (secondary)
   - Botão "Excluir" (destructive)
3. Usuário toca em "Excluir"
4. Requisição: DELETE /api/lancamentos/:id
5. Backend remove e retorna mês atualizado
6. Dialog fecha
7. Bottomsheet fecha
8. Item desaparece da lista (fade out)
9. Totalizadores atualizam

**Alternativa (swipe):**

- Usuário pode arrastar item para esquerda
- Revela botão vermelho "Excluir"
- Toque no botão abre o mesmo dialog de confirmação

---

### Jornada 10: Navegar para Mês Anterior

**Contexto:** Usuário quer ver meses passados.

**Fluxo:**

1. Usuário toca na seta esquerda no cabeçalho
2. Calcula mês anterior (ex: 2025-11 → 2025-10)
3. Requisição: GET /api/lancamentos?mes=2025-10
4. Conteúdo faz crossfade (150ms)
5. Título atualiza para "Outubro 2025"
6. Cards mostram dados do mês anterior
7. Se mês vazio, mostra empty states

---

### Jornada 11: Navegar para Mês Seguinte

**Contexto:** Usuário quer planejar meses futuros.

**Fluxo:** Idêntico à Jornada 10, mas incrementando o mês.

**Sem limite:** Usuário pode navegar quantos meses quiser para frente ou para trás.

---

### Jornada 12: Navegar por Swipe (Mobile)

**Contexto:** Usuário quer navegar de forma mais natural.

**Fluxo:**

1. Usuário faz swipe horizontal na área dos cards
2. Swipe para direita → mês anterior
3. Swipe para esquerda → próximo mês
4. Threshold: 50px de deslocamento
5. Animação: slide + fade
6. Mesmo comportamento das setas

---

### Jornada 13: Acessar Configurações

**Contexto:** Usuário quer mudar comportamentos padrão.

**Fluxo:**

1. Usuário toca no ícone de engrenagem no cabeçalho
2. Drawer abre da direita (mobile) ou modal (desktop)
3. Opções disponíveis:
   - Toggle: "Marcar entradas como recebidas automaticamente"
   - Toggle: "Marcar saídas como pagas automaticamente"
   - Toggle: "Mostrar itens concluídos com menos destaque"
4. Cada toggle faz requisição: PUT /api/configuracoes/:chave
5. Mudanças aplicam imediatamente

---

### Jornada 14: Visualizar Histórico

**Contexto:** Usuário quer ver situação de meses passados.

**Fluxo:**

1. Usuário navega para mês desejado (setas ou swipe)
2. Cada mês é independente
3. Dados antigos são editáveis (flexibilidade)
4. Não existe consolidação automática entre meses

---

## 9. Estados e Feedbacks

### Empty State

```
Quando lista vazia:
- Mensagem centralizada
- "Nenhuma entrada ainda" / "Nenhuma saída ainda"
- Cor: #717171
- Botão adicionar visível abaixo
```

### Loading State

```
- Skeleton nos cards
- 3 linhas de skeleton por card
- Animação pulse
- Cor: #EBEBEB
- Border-radius igual aos componentes
```

### Error State

```
- Toast no topo
- Background: #222222
- Texto: branco
- Mensagem: "Não foi possível salvar"
- Botão: "Tentar de novo"
- Auto-dismiss: 5 segundos
- Ícone X para fechar
```

### Success Feedback

```
- Não usar toast para sucesso
- O item aparecendo na lista É o feedback
- Animação do StatusCircle É o feedback
- Totalizadores atualizando É o feedback
```

### Confirmação de Exclusão

```
- AlertDialog do shadcn
- Overlay escuro
- Card branco centralizado
- Título: "Excluir este item?"
- Descrição: nome do item
- Botões com área de toque adequada
```

---

## 10. Responsividade

### Mobile (< 640px) — PRIORIDADE

```
- Cards: largura total
- Margens laterais: 16px
- Gap entre cards: 16px
- Bottomsheet: sobe da base
- Drawer: da direita
- Swipe navigation: ativo
- Áreas de toque: mínimo 48px
```

### Tablet (640px - 1024px)

```
- Cards Entradas e Saídas: lado a lado, 50% cada
- Card Resultado: largura total abaixo
- Gap: 16px
- Bottomsheet: mantém comportamento mobile
```

### Desktop (> 1024px)

```
- Container: max-width 720px, centralizado
- Bottomsheet → Dialog centralizado, 420px
- Drawer → Dialog lateral
- Navegação por teclado (setas)
```

---

## 11. Configurações

### Opções Disponíveis

| Configuração                 | Descrição                        | Default |
| ---------------------------- | -------------------------------- | ------- |
| entradas_auto_recebido       | Novas entradas já vêm marcadas   | false   |
| saidas_auto_pago             | Novas saídas já vêm marcadas     | false   |
| mostrar_concluidos_discretos | Itens concluídos com opacity 50% | true    |

### UI de Configurações

```
Drawer/Dialog com:
- Título: "Configurações"
- Lista de toggles (Switch do shadcn)
- Cada toggle com label + descrição
- Salva automaticamente ao alterar
```

### Armazenamento

```
- Primário: Supabase (tabela configuracoes)
- Cache: localStorage para acesso rápido
- Sync: quando há conexão
```

---

## Checklist de Implementação

### Etapa 1: Setup

- [ ] Criar estrutura monorepo
- [ ] Configurar workspaces
- [ ] Inicializar frontend (Vite + React + TS)
- [ ] Inicializar backend (Fastify + TS)
- [ ] Instalar shadcn/ui
- [ ] Configurar Tailwind com tokens customizados
- [ ] Instalar Framer Motion
- [ ] Instalar dependências adicionais

### Etapa 2: shadcn Components

- [ ] Instalar Button e customizar variantes (pill, tamanhos)
- [ ] Instalar Input e customizar
- [ ] Instalar Card e customizar
- [ ] Instalar Sheet (para bottomsheet)
- [ ] Instalar Dialog (para confirmações)
- [ ] Instalar Switch (para toggles)
- [ ] Instalar Drawer (para configurações)

### Etapa 3: Banco

- [ ] Executar SQL no Supabase
- [ ] Configurar client no backend
- [ ] Testar conexão

### Etapa 4: Backend

- [ ] Criar schemas Zod
- [ ] Criar repositories
- [ ] Criar services
- [ ] Criar controllers
- [ ] Criar rotas
- [ ] Configurar CORS
- [ ] Testar todos os endpoints

### Etapa 5: Componentes Novos

- [ ] Criar StatusCircle com animações
- [ ] Criar InputMoeda
- [ ] Criar ItemLista
- [ ] Criar Totalizadores

### Etapa 6: Tela Principal

- [ ] Montar layout
- [ ] Implementar cabeçalho com navegação
- [ ] Implementar cards
- [ ] Conectar com API

### Etapa 7: Jornadas

- [ ] Adicionar entrada
- [ ] Adicionar saída
- [ ] Marcar/desmarcar
- [ ] Editar
- [ ] Excluir
- [ ] Navegar meses
- [ ] Swipe navigation

### Etapa 8: Configurações

- [ ] Criar drawer/dialog
- [ ] Implementar toggles
- [ ] Sincronizar com backend

### Etapa 9: Polish

- [ ] Testar em mobile real
- [ ] Verificar áreas de toque
- [ ] Verificar animações
- [ ] Testar performance
