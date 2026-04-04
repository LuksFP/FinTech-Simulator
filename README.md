# MyFinance — FinTech Simulator

Aplicação web de gerenciamento financeiro pessoal com autenticação, banco de dados em tempo real e exportação de dados. Construída com React, TypeScript, Tailwind CSS e Supabase.

## Funcionalidades

### Dashboard
- Cards de **saldo atual**, **total de entradas** e **total de saídas**
- Indicador de **variação % vs mês anterior** nos cards de entradas e saídas
- **Alerta automático** quando despesas superam 80% da receita do mês
- Gráfico de **pizza** — proporção entradas x saídas por categoria
- Gráfico de **barras** — evolução mensal de entradas e saídas
- Gráfico de **categorias** (PieChart) com breakdown de gastos por categoria
- **Previsão de saldo** para os próximos 6 meses baseada em recorrências ativas

### Meta de Economia
- Definir **meta mensal** de economia
- Barra de **progresso visual** com percentual concluído
- Celebração ao atingir a meta

### Orçamento por Categoria
- Criar **limites de gasto** por categoria
- **Barra de progresso** mostrando quanto do orçamento já foi consumido no mês
- Alerta visual quando o limite está próximo ou ultrapassado

### Transações
- Cadastro de **entradas e saídas** com descrição, valor, data e categoria
- **Busca em tempo real** por descrição
- Filtros por **tipo** (todos/entradas/saídas) e **período** (7 dias/30 dias/mês atual/mês anterior/personalizado)
- Ordenação por **data** ou **valor**
- Edição e exclusão de transações
- **Importação via CSV** com mapeamento de colunas
- Exportação para **PDF** com resumo mensal e tabela de transações
- Exportação para **Excel (.xlsx)**

### Múltiplas Contas Bancárias
- Cadastro de **contas bancárias** com nome, banco e tipo (corrente/poupança/investimento/carteira)
- **Cards de resumo** com saldo por conta
- **Seletor de conta** ao criar transações para vincular a operação

### Categorias
- Categorias do **sistema** (pré-definidas) e **personalizadas** por usuário
- Cada categoria tem nome, **ícone** (Lucide Icons) e **cor**
- Criação, edição e exclusão de categorias próprias

### Transações Recorrentes
- Cadastro com frequência **diária**, **semanal**, **mensal** ou **anual**
- Ativar/desativar cada recorrência individualmente
- Visualização da **próxima data de vencimento**
- Impacto mensal estimado exibido na previsão de saldo

### Relatórios
- Comparativo de **entradas e saídas dos últimos 6 meses**
- Breakdown de **despesas por categoria** com percentual e valor
- Breakdown de **receitas por categoria** com percentual e valor
- Exportação do relatório em **PDF**

### Notificações por Email
- **Alerta de gastos** enviado quando despesas atingem 80% do limite configurado
- **Resumo mensal** enviado automaticamente no último dia do mês
- Configuração do email e limite diretamente no dashboard
- Powered by **Resend** via Supabase Edge Functions

### Simulador de Investimentos
- Simulação de **rendimento composto** com aporte inicial, aporte mensal, taxa de juros e prazo
- Gráfico de evolução do patrimônio mês a mês

### Onboarding
- **Wizard de boas-vindas** guiando o usuário pelos primeiros passos (criar categoria, meta, primeira transação)
- Aparece apenas uma vez, na primeira sessão após o cadastro

### Perfil
- Edição de **nome completo** e **avatar**
- Dados salvos na tabela `profiles` via Supabase

### Autenticação
- Login e cadastro com **email e senha**
- Login com **Google OAuth**
- **Recuperação de senha** por email
- Indicador de **força da senha** no cadastro
- Mensagens de erro em português para todos os casos

### PWA (Progressive Web App)
- **Instalável** em dispositivos móveis e desktop via `manifest.json`
- **Service Worker** para cache offline de assets estáticos

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript |
| Build | Vite |
| Estilo | Tailwind CSS + shadcn/ui |
| Animações | Framer Motion |
| Gráficos | Recharts |
| PDF | jsPDF + jspdf-autotable |
| Excel | xlsx |
| Email | Resend (via Edge Function) |
| Backend / Auth | Supabase (PostgreSQL + Auth + Realtime) |
| Deploy | Vercel |

## Banco de Dados

### Tabelas
| Tabela | Descrição |
|---|---|
| `transactions` | Transações financeiras do usuário |
| `categories` | Categorias do sistema e personalizadas |
| `financial_goals` | Metas mensais de economia |
| `recurring_transactions` | Transações recorrentes agendadas |
| `profiles` | Perfil do usuário (nome, avatar) |
| `budgets` | Limites de orçamento por categoria |
| `bank_accounts` | Contas bancárias do usuário |

### Segurança
- **Row Level Security (RLS)** ativo em todas as tabelas
- Cada usuário acessa **apenas seus próprios dados**
- Categorias do sistema (`user_id = null`) visíveis para todos
- Trigger automático cria perfil ao cadastrar novo usuário

## Como rodar localmente

**Pré-requisitos:** Node.js 18+

```bash
# Clone o repositório
git clone https://github.com/LuksFP/FinTech-Simulator.git
cd FinTech-Simulator

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Preencha .env com suas credenciais do Supabase

# Inicie o servidor de desenvolvimento
npm run dev
```

## Testes

```bash
npm test          # executa todos os testes unitários (Vitest)
npm run test:watch  # modo watch
```

Testes unitários cobrem as funções puras em `src/lib/`:
- `formatters` — formatação de moeda e data
- `dateRange` — cálculo de intervalos por período
- `recurringCalculations` — impacto mensal e previsão de saldo
- `authErrors` — tradução de erros de autenticação

## Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<sua-anon-key>
VITE_SUPABASE_PROJECT_ID=<project-id>
```

Disponíveis em **supabase.com** → seu projeto → Settings → API.

Para habilitar notificações por email, configure também no Supabase:

```
RESEND_API_KEY=<sua-chave-resend>
```

## Google OAuth

Para habilitar login com Google:

1. Acesse **console.cloud.google.com** → APIs & Services → Credentials
2. Crie um **OAuth 2.0 Client ID** (Web application)
3. Em **Authorized redirect URIs** adicione:
   ```
   https://<project-id>.supabase.co/auth/v1/callback
   ```
4. No **Supabase Dashboard** → Authentication → Providers → Google
5. Cole o **Client ID** e **Client Secret**
6. Em Authentication → URL Configuration adicione seu domínio Vercel nos **Redirect URLs**

## Deploy

O projeto está configurado para deploy automático na **Vercel** via GitHub. Cada push na branch `main` dispara um novo deploy.
