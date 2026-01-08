# 💰 Mini Fintech

Sistema de controle financeiro pessoal moderno e responsivo, construído com React, TypeScript e Supabase.

![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss)

## ✨ Funcionalidades

### 📊 Dashboard
- Cards estatísticos com saldo, entradas e saídas
- Gráficos de pizza e barras com evolução mensal
- Metas financeiras com progresso visual

### 💳 Transações
- Criar, editar e excluir transações
- Filtro por tipo (entrada/saída)
- **Filtro por período** (7 dias, 30 dias, mês atual, personalizado)
- Ordenação por data ou valor
- **Confirmação antes de exclusão**
- **Exportação para CSV**

### 🏷️ Categorias Personalizadas
- Categorias do sistema pré-definidas
- **Criar, editar e excluir categorias próprias**
- Escolha de ícones e cores
- Gerenciador visual de categorias

### 🔐 Segurança
- Autenticação com email/senha
- Row Level Security (RLS) em todas as tabelas
- Dados isolados por usuário

## 🛠️ Tecnologias

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** + **shadcn/ui**
- **Framer Motion** para animações
- **Recharts** para gráficos
- **Supabase** (PostgreSQL + Auth + Realtime)

## 📁 Estrutura

```
src/
├── components/
│   ├── categories/      # Gerenciamento de categorias
│   ├── dashboard/       # Cards e gráficos
│   ├── transactions/    # Lista e formulários
│   └── ui/              # shadcn/ui
├── hooks/               # useTransactions, useCategories, etc.
├── services/            # Serviços de API
└── lib/                 # Utilitários e formatadores
```

## 🚀 Como Executar

```bash
npm install
npm run dev
```

---
Desenvolvido com ❤️ usando [Lovable](https://lovable.dev)
