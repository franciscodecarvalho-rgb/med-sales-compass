# Vitatech CRM — Med Sales Compass

CRM de vendas e pós-venda de equipamentos médicos para a equipe Vitatech. Construído com React + TypeScript + Vite + Supabase. Projeto originado no Lovable.

## Stack

- **Frontend**: React 18, TypeScript, Vite 5
- **UI**: Tailwind CSS + shadcn/ui (componentes em `src/components/ui/`)
- **Backend**: Supabase (nuvem — projeto `hlzdgzokeabngfdqnlmh`)
- **Auth + RBAC**: Supabase Auth + tabela `user_roles` + `role_permissions`

## Comandos

```bash
npm run dev       # servidor de desenvolvimento (localhost:8080 ou 5173)
npm run build     # build de produção (vai para dist/)
npm run lint      # ESLint
npm run test      # Vitest
```

## Variáveis de ambiente

O arquivo `.env` é **rastreado no git** intencionalmente — contém apenas a chave anon pública do Supabase (exposta no bundle de qualquer forma) e é lida pelo Lovable durante o build. **Nunca adicione chaves service_role ou secrets aqui.**

```
VITE_SUPABASE_PROJECT_ID=   # ID do projeto Supabase
VITE_SUPABASE_URL=          # URL do projeto Supabase
VITE_SUPABASE_PUBLISHABLE_KEY=  # Chave anon (pública)
VITE_LOVABLE_ANALISE_URL=   # API de análise de crédito (opcional)
VITE_LOVABLE_ANALISE_KEY=   # Chave da API acima (opcional)
```

## Workflow de desenvolvimento

```
editar localmente → npm run build (verificar) → git commit → git push → Lovable redeploya
```

O Lovable monitora o branch `main` do GitHub e faz redeploy automático a cada push. **Não é necessário** usar o Supabase CLI para migrations — o Lovable gerencia o banco. Para mudanças de schema, criar o arquivo SQL em `supabase/migrations/` com o timestamp adequado e commitar.

## Estrutura de pastas

```
src/
├── pages/          # Uma página por rota
├── components/     # Componentes reutilizáveis
│   ├── ui/         # shadcn/ui (não editar manualmente)
│   ├── dashboards/ # Cards de KPI por papel
│   └── posvenda/   # Abas de pós-venda
├── contexts/       # AuthContext (auth + papéis)
├── hooks/          # usePermissions (RBAC), use-mobile, use-toast
├── integrations/
│   └── supabase/   # client.ts + types.ts (gerado — não editar types.ts)
└── lib/
    ├── crm.ts      # Tipos, enums, labels e badges do domínio
    ├── masks.ts    # Máscaras de input (CPF, CNPJ, telefone)
    └── utils.ts    # cn() e utilitários gerais
supabase/
└── migrations/     # Histórico de migrations SQL (30 arquivos)
```

## Papéis (RBAC)

| Papel | Acesso |
|-------|--------|
| `admin` | Total — inclui configurações e RBAC |
| `gerente` | Todos os módulos, todos os registros |
| `vendedor` | Apenas seus próprios registros |
| `pos_venda` | Chamados, contratos, garantias, NPS |
| `equipe_advance` | Vendas Advance e Faturamento |

Permissões são configuráveis em runtime via **Configurações → Permissões**.

## Rotas principais

| Rota | Página | Permissão |
|------|--------|-----------|
| `/` | Dashboard (por papel) | — |
| `/discovery` | Prospecção de unidades | `view_discovery` |
| `/discovery/lab` | Lab CNPJ + Google Places | `view_discovery` |
| `/funil-vendas` | Kanban + tabela de deals | `view_funil_vendas` |
| `/funil-manutencao` | Funil de manutenção | `view_funil_manut` |
| `/pos-venda` | Chamados/Contratos/Garantias/NPS | `view_posvenda` |
| `/faturamento` | Deals prontos para faturar | `view_faturamento` |
| `/vendas-advance` | Fluxo de Advance | — |
| `/medicos` | Cadastro de médicos | `view_medicos` |
| `/unidades` | Unidades de saúde | `view_unidades` |
| `/equipamentos` | Catálogo de equipamentos | `view_equipamentos` |
| `/tarefas` | Tarefas da equipe | — |
| `/lite` | Interface mobile simplificada | — |
| `/configuracoes` | Admin: RBAC, linhas, contador | admin |

## Observações importantes

- `src/integrations/supabase/types.ts` é **gerado automaticamente** pelo Lovable — não editar à mão
- `DiscoveryLab.tsx` (1.158 linhas) é o maior arquivo; integra API de CNPJ e Google Places
- Bundle de produção é ~1.85 MB (aviso de chunk size é esperado — ainda sem code splitting)
- `bun.lockb` existe no repo mas usar `npm` localmente (bun não instalado)
