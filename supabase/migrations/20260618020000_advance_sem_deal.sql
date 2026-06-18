-- Desacopla o Vendas Advance do funil:
--   1) deal_id deixa de ser obrigatório (saída pode nascer fora do funil)
--   2) campos manuais usados quando deal_id IS NULL (saída "Adicionar Diretamente")
--
-- O índice único 1:1 (saidas_advance_deal_id_key) continua válido: no Postgres
-- valores NULL são considerados distintos, então várias saídas avulsas são aceitas.

alter table public.saidas_advance
  alter column deal_id drop not null;

alter table public.saidas_advance
  add column if not exists titulo            text,
  add column if not exists unidade_id        uuid references public.unidades_saude(id),
  add column if not exists linha_produto_id  uuid references public.linhas_produto(id),
  add column if not exists valor_total       numeric,
  add column if not exists forma_pagamento   public.forma_pagamento_tipo;

create index if not exists idx_saidas_advance_unidade
  on public.saidas_advance (unidade_id);

-- Ajusta o INSERT scope: a saída avulsa (deal_id IS NULL) não tem deal para
-- checar, então o vendedor passa a poder criá-la. Quando há deal, mantém a
-- regra de só inserir para deals próprios. Admin/equipe_advance seguem livres.
drop policy if exists "saidas_advance_insert" on public.saidas_advance;
create policy "saidas_advance_insert" on public.saidas_advance
  for insert to authenticated
  with check (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    or public.has_role(auth.uid(), 'equipe_advance'::public.app_role)
    or (
      public.has_role(auth.uid(), 'vendedor'::public.app_role)
      and (
        saidas_advance.deal_id is null
        or exists (
          select 1 from public.deals d
          where d.id = saidas_advance.deal_id
            and d.vendedor_id = auth.uid()
        )
      )
    )
  );
