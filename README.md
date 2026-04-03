# MyFinance — FinTech Simulator

Aplicação web de gerenciamento financeiro pessoal, construída com React, TypeScript, Tailwind CSS e Supabase.

## Funcionalidades

### Dashboard
- Cards de resumo com **saldo atual**, **total de entradas** e **total de saídas**
- Indicador de **variação percentual vs mês anterior** nos cards de entradas e saídas
- **Alerta automático** quando as despesas do mês superam 90% (ou 100%) da receita
- Gráfico de **pizza** com proporção entradas x saídas
- Gráfico de **linha** com evolução diária do saldo no mês

### Meta de Economia
- Definir uma **meta mensal** de economia
- Barra de progresso mostrando quanto já foi economizado
- Celebração ao atingir a meta

### Transações
- Cadastro de **entradas e saídas** com descrição, valor, data e categoria
- **Busca em tempo real** por descrição
- Filtros por **tipo** (entradas/saídas/todos) e **período** (hoje, semana, mês, personalizado)
- Ordenação por **data** ou **valor**
- Edição e exclusão de transações
- Exportação para **CSV**, **Excel (.xlsx)** e **PDF**

### Categorias
- Categorias do sistema (padrão) e categorias personalizadas do usuário
- Cada categoria tem **nome**, **ícone** (Lucide Icons) e **cor**
- Criação, edição e exclusão de categorias

### Transações Recorrentes
- Cadastro de transações com frequência **diária**, **semanal**, **mensal** ou **anual**
- Ativar/desativar cada recorrência individualmente
- Visualização da próxima data de vencimento

### Relatórios
- Comparativo de **entradas e saídas dos últimos 6 meses**
- Breakdown de despesas **por categoria** com percentual e valor
- Breakdown de receitas **por categoria** com percentual e valor

### Autenticação
- Login e cadastro com **email e senha**
- Login com **Google OAuth**
- Recuperação de senha por email
- Indicador de **força da senha** no cadastro

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

Veja o arquivo `.env.example` para as variáveis necessárias. As credenciais estão disponíveis no painel do seu projeto no [supabase.com](https://supabase.com).

## Segurança

- Autenticação gerenciada pelo Supabase Auth
- Row Level Security (RLS) ativo em todas as tabelas — cada usuário acessa apenas seus próprios dados
- Senhas com validação de força obrigatória no cadastro
- Sessão persistida com refresh token automático
