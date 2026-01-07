# 💰 Mini Fintech

Sistema de controle financeiro pessoal moderno e responsivo, construído com React, TypeScript e Supabase.

![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss)

## ✨ Funcionalidades

- 🔐 **Autenticação completa** - Cadastro e login com validação
- 💳 **CRUD de transações** - Criar, editar, excluir com categorias
- 🎯 **Metas financeiras** - Defina objetivos mensais de economia
- 📊 **Dashboard interativo** - Gráficos de pizza e linha em tempo real
- 📱 **100% Responsivo** - Mobile, tablet e desktop
- 🌙 **Tema dark** - Design moderno inspirado em fintechs

## 🛠️ Tecnologias

| Frontend | Backend |
|----------|---------|
| React 18 | Supabase (PostgreSQL) |
| TypeScript | Row Level Security |
| Tailwind CSS | Realtime Subscriptions |
| Framer Motion | Auth JWT |
| Recharts | Edge Functions |
| React Hook Form + Zod | |

## 🏗️ Arquitetura

```
src/
├── components/          # Componentes React (memo optimized)
│   ├── dashboard/       # StatCard, GoalCard, Charts
│   ├── transactions/    # Form, List, Item, Filters
│   └── layout/          # Header
├── hooks/               # Custom hooks (useAuth, useTransactions, etc)
├── services/            # API layer (Supabase queries)
├── lib/                 # Utilities, formatters, constants
├── pages/               # Route components
└── types/               # TypeScript interfaces
```

## 🔒 Segurança

- **RLS Policies** - Cada usuário só acessa seus próprios dados
- **Zod Validation** - Validação de inputs no cliente
- **TypeScript** - Tipagem estrita em todo o código

## ⚡ Performance

- `React.memo()` em componentes de lista
- `useCallback()` para handlers
- `useMemo()` para cálculos derivados
- Lazy loading de rotas

## 🚀 Como Executar

```bash
npm install
npm run dev
```

## 📄 Deploy

Clique em **Publish** no Lovable para deploy automático.

---

<p align="center">
  Desenvolvido com ❤️ usando <a href="https://lovable.dev">Lovable</a>
</p>
