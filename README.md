# MyFinance — FinTech Simulator

Aplicação web de gerenciamento financeiro pessoal com autenticação, banco de dados em tempo real e exportação de dados. Construída com React, TypeScript, Tailwind CSS e Supabase.

## Funcionalidades

### Dashboard
- Cards de **saldo atual**, **total de entradas** e **total de saídas**
- Indicador de **variação % vs mês anterior** nos cards de entradas e saídas
- **Alerta automático** quando despesas superam 90% da receita do mês
- Gráfico de **pizza** — proporção entradas x saídas
- Gráfico de **linha** — evolução diária do saldo no mês

### Meta de Economia
- Definir **meta mensal** de economia
- Barra de **progresso visual** com percentual concluído
- Celebração ao atingir a meta

### Transações
- Cadastro de **entradas e saídas** com descrição, valor, data e categoria
- **Busca em tempo real** por descrição
- Filtros por **tipo** (todos/entradas/saídas) e **período** (hoje/semana/mês/personalizado)
- Ordenação por **data** ou **valor**
- Edição e exclusão de transações
- Exportação para **CSV**, **Excel (.xlsx)** e **PDF**

### Categorias
- Categorias do **sistema** (pré-definidas) e **personalizadas** por usuário
- Cada categoria tem nome, **ícone** (Lucide Icons) e **cor**
- Criação, edição e exclusão de categorias próprias

### Transações Recorrentes
- Cadastro com frequência **diária**, **semanal**, **mensal** ou **anual**
- Ativar/desativar cada recorrência individualmente
- Visualização da **próxima data de vencimento**

### Relatórios
- Comparativo de **entradas e saídas dos últimos 6 meses**
- Breakdown de **despesas por categoria** com percentual e valor
- Breakdown de **receitas por categoria** com percentual e valor

### Autenticação
- Login e cadastro com **email e senha**
- Login com **Google OAuth**
- **Recuperação de senha** por email
- Indicador de **força da senha** no cadastro
- Mensagens de erro em português para todos os casos (email já cadastrado, senha errada, email não confirmado, rate limit, etc.)

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript |
| Build | Vite |
| Estilo | Tailwind CSS + shadcn/ui |
| Animações | Framer Motion |
| Gráficos | Recharts |
| Backend / Auth | Supabase (PostgreSQL + Auth) |
| Deploy | Vercel |

## Banco de Dados

### Tabelas
| Tabela | Descrição |
|---|---|
| `transactions` | Transações financeiras do usuário |
| `categories` | Categorias do sistema e personalizadas |
| `financial_goals` | Metas mensais de economia |
| `recurring_transactions` | Transações recorrentes agendadas |
| `profiles` | Perfil do usuário (nome, etc.) |

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

## Variáveis de Ambiente

```env
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<sua-anon-key>
VITE_SUPABASE_PROJECT_ID=<project-id>
```

Disponíveis em **supabase.com** → seu projeto → Settings → API.

## Google OAuth

Para habilitar login com Google:

1. Acesse **console.cloud.google.com** → APIs & Services → Credentials
2. Crie um **OAuth 2.0 Client ID** (Web application)
3. Em **Authorized redirect URIs** adicione:
   ```
   https://pvouegghhzpkhkrffyxj.supabase.co/auth/v1/callback
   ```
4. No **Supabase Dashboard** → Authentication → Providers → Google
5. Cole o **Client ID** e **Client Secret**
6. Em Authentication → URL Configuration adicione seu domínio Vercel nos **Redirect URLs**

## Deploy

O projeto está configurado para deploy automático na **Vercel** via GitHub. Cada push na branch `main` dispara um novo deploy.
