-- Zupper BI 2.0 — v2: pedidos da reuniao de 13/10 (investimento total, planejado x realizado,
-- funil topo->fundo, trimestre, eventos, metas)
create table if not exists public.bi_invest_manual (
  data date not null, plataforma text not null, campanha text not null default 'Programatica',
  custo numeric(14,2) not null default 0, impressoes bigint not null default 0, cliques bigint not null default 0,
  nota text, criado_por uuid default auth.uid(), criado_em timestamptz not null default now(),
  primary key (data, plataforma, campanha)
);

create or replace view public.bi_v_invest with (security_invoker = true) as
  select data, plataforma, campanha, custo, impressoes, cliques, 'api'::text as origem_dado from public.bi_fato_invest
  union all
  select data, plataforma, campanha, custo, impressoes, cliques, 'manual'::text from public.bi_invest_manual;

create table if not exists public.bi_orcamento (
  data date not null, plataforma text not null, planejado numeric(14,2) not null default 0,
  primary key (data, plataforma)
);
create table if not exists public.bi_eventos (
  id uuid primary key default gen_random_uuid(),
  data date not null, titulo text not null check (length(titulo) between 1 and 120),
  tipo text not null default 'outro' check (tipo in ('deploy','site','campanha','mercado','outro')),
  criado_por uuid default auth.uid(), criado_em timestamptz not null default now()
);
create table if not exists public.bi_metas (
  trimestre text not null check (trimestre ~ '^[0-9]{4}-T[1-4]$'),
  medida text not null, valor numeric(16,2) not null,
  crescimento_pct numeric(6,2),
  primary key (trimestre, medida)
);
alter table public.bi_invest_manual enable row level security;
alter table public.bi_orcamento enable row level security;
alter table public.bi_eventos enable row level security;
alter table public.bi_metas enable row level security;

create policy bi_invest_manual_ler on public.bi_invest_manual for select to authenticated using (public.bi_eh_membro());
create policy bi_invest_manual_adm on public.bi_invest_manual for all to authenticated using (public.bi_eh_admin()) with check (public.bi_eh_admin());
create policy bi_orcamento_ler on public.bi_orcamento for select to authenticated using (public.bi_eh_membro());
create policy bi_orcamento_adm on public.bi_orcamento for all to authenticated using (public.bi_eh_admin()) with check (public.bi_eh_admin());
create policy bi_eventos_ler on public.bi_eventos for select to authenticated using (public.bi_eh_membro());
create policy bi_eventos_adm on public.bi_eventos for all to authenticated using (public.bi_eh_admin()) with check (public.bi_eh_admin());
-- metas e bonus: somente admin
create policy bi_metas_adm on public.bi_metas for all to authenticated using (public.bi_eh_admin()) with check (public.bi_eh_admin());

grant select on public.bi_v_invest to authenticated;
grant select on public.bi_orcamento, public.bi_eventos to authenticated;
grant select, insert, update, delete on public.bi_invest_manual, public.bi_orcamento, public.bi_eventos, public.bi_metas to authenticated;
grant all on public.bi_invest_manual, public.bi_orcamento, public.bi_eventos, public.bi_metas, public.bi_v_invest to service_role;
revoke all on public.bi_invest_manual, public.bi_orcamento, public.bi_eventos, public.bi_metas, public.bi_v_invest from anon;

-- Orcamento mensal vira diario (o realizado e diario, entao o planejado tambem).
create or replace function public.bi_orcamento_definir(p_mes date, p_plataforma text, p_valor numeric) returns integer
language plpgsql security invoker set search_path = public as $$
declare ini date := date_trunc('month', p_mes)::date; fim date := (date_trunc('month', p_mes) + interval '1 month - 1 day')::date; n int;
begin
  if not public.bi_eh_admin() then raise exception 'acesso negado' using errcode = '42501'; end if;
  insert into public.bi_orcamento (data, plataforma, planejado)
    select d::date, p_plataforma, round(p_valor / (fim - ini + 1), 2) from generate_series(ini, fim, interval '1 day') d
  on conflict (data, plataforma) do update set planejado = excluded.planejado;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.bi_orcamento_definir(date,text,numeric) from public, anon;
grant execute on function public.bi_orcamento_definir(date,text,numeric) to authenticated;

create or replace function public.bi_consulta(p jsonb) returns jsonb
language plpgsql stable security invoker
set search_path = public
set statement_timeout = '20s'
as $$
declare
  v_fonte   text := coalesce(p->>'fonte', 'rota');
  v_ini     date := coalesce((p->>'ini')::date, current_date - 30);
  v_fim     date := coalesce((p->>'fim')::date, current_date);
  v_limite  int  := least(coalesce((p->>'limite')::int, 200), 2000);
  v_tabela  text;
  v_col_dia text := 'data';
  v_dims    text[] := '{}';
  v_meds    text[] := '{}';
  v_sel     text[] := '{}';
  v_grp     text[] := '{}';
  v_where   text := '';
  v_ordem   text := '';
  v_sql     text;
  v_out     jsonb;
  d text; m text; expr text; k text; ord text; dir text;
  grupo_mkt constant text := $q$ canal in ('Direto','Midia Paga','App','Canais Proprietarios','Midia Organica') $q$;
  dim_map  jsonb;
  med_map  jsonb;
  fil_map  jsonb;
begin
  if not public.bi_eh_membro() then
    raise exception 'acesso negado' using errcode = '42501';
  end if;
  if v_fim < v_ini then raise exception 'periodo invalido'; end if;

  if v_fonte = 'rota' then
    v_tabela := 'bi_fato_rota';
    dim_map := jsonb_build_object(
      'dia','data','semana','date_trunc(''week'',data)::date','mes','to_char(data,''YYYY-MM'')',
      'trimestre','to_char(data,''YYYY'')||''-T''||extract(quarter from data)::int',
      'ano','extract(year from data)::int::text',
      'dia_semana','to_char(data,''ID'')||''-''||(array[''seg'',''ter'',''qua'',''qui'',''sex'',''sab'',''dom''])[extract(isodow from data)::int]',
      'canal','canal',
      'grupo_canal','case when'||grupo_mkt||'then ''Canais de Marketing'' else ''Canais Comerciais'' end',
      'tipo','case when intl then ''Internacional'' else ''Nacional'' end',
      'origem','origem','destino','destino','rota','origem||'' → ''||destino');
    med_map := jsonb_build_object(
      'pedidos','sum(pedidos)','pedidos_emit','sum(pedidos_emit)','cancelados','sum(cancelados)',
      'tarifa','sum(tarifa)','tarifa_emit','sum(tarifa_emit)','receita','sum(receita)','receita_emit','sum(receita_emit)',
      'passageiros','sum(passageiros)','pedidos_ga4','sum(pedidos_ga4)','pedidos_reat','sum(pedidos_reat)',
      'tarifa_media_cap','round(sum(tarifa)/nullif(sum(pedidos),0),2)',
      'tarifa_media_emit','round(sum(tarifa_emit)/nullif(sum(pedidos_emit),0),2)',
      'ticket_medio_emit','round(sum(receita_emit)/nullif(sum(pedidos_emit),0),2)',
      'taxa_emissao','round(100.0*sum(pedidos_emit)/nullif(sum(pedidos),0),2)',
      'taxa_cancelamento','round(100.0*sum(cancelados)/nullif(sum(pedidos),0),2)',
      'cobertura_ga4','round(100.0*sum(pedidos_ga4)/nullif(sum(pedidos),0),2)',
      'passageiros_por_pedido','round(sum(passageiros)::numeric/nullif(sum(pedidos),0),2)',
      'antecedencia_media','round(sum(ant_soma)::numeric/nullif(sum(ant_n),0),1)',
      'duracao_media','round(sum(dur_soma)::numeric/nullif(sum(dur_n),0),1)');
    fil_map := jsonb_build_object(
      'canal','canal','origem','origem','destino','destino',
      'rota','origem||'' → ''||destino',
      'tipo','case when intl then ''Internacional'' else ''Nacional'' end',
      'grupo_canal','case when'||grupo_mkt||'then ''Canais de Marketing'' else ''Canais Comerciais'' end');
  elsif v_fonte = 'canal' then
    v_tabela := 'bi_fato_canal';
    dim_map := jsonb_build_object(
      'dia','data','semana','date_trunc(''week'',data)::date','mes','to_char(data,''YYYY-MM'')','trimestre','to_char(data,''YYYY'')||''-T''||extract(quarter from data)::int',
      'canal_original','canal','agrupamento_original','agrupamento',
      'canal','canal_reat','agrupamento','agrupamento_reat');
    med_map := jsonb_build_object(
      'pedidos','sum(pedidos)','pedidos_emit','sum(pedidos_emit)','tarifa','sum(tarifa)','tarifa_emit','sum(tarifa_emit)',
      'receita','sum(receita)','receita_emit','sum(receita_emit)','pedidos_ga4','sum(pedidos_ga4)','pedidos_reat','sum(pedidos_reat)',
      'cobertura_ga4','round(100.0*sum(pedidos_ga4)/nullif(sum(pedidos),0),2)');
    fil_map := jsonb_build_object('canal','canal_reat','canal_original','canal','agrupamento','agrupamento_reat','agrupamento_original','agrupamento');
  elsif v_fonte = 'invest' then
    v_tabela := 'bi_v_invest';
    dim_map := jsonb_build_object('dia','data','semana','date_trunc(''week'',data)::date','mes','to_char(data,''YYYY-MM'')','trimestre','to_char(data,''YYYY'')||''-T''||extract(quarter from data)::int',
      'plataforma','plataforma','campanha','campanha','origem_dado','origem_dado');
    med_map := jsonb_build_object('custo','sum(custo)','impressoes','sum(impressoes)','cliques','sum(cliques)',
      'cpc','round(sum(custo)/nullif(sum(cliques),0),2)','ctr','round(100.0*sum(cliques)/nullif(sum(impressoes),0),2)',
      'cpm','round(1000*sum(custo)/nullif(sum(impressoes),0),2)');
    fil_map := jsonb_build_object('plataforma','plataforma','campanha','campanha');
  elsif v_fonte = 'campanha' then
    v_tabela := 'bi_fato_campanha';
    dim_map := jsonb_build_object('dia','data','semana','date_trunc(''week'',data)::date','mes','to_char(data,''YYYY-MM'')','trimestre','to_char(data,''YYYY'')||''-T''||extract(quarter from data)::int',
      'origem_midia','source_medium','campanha','campanha');
    med_map := jsonb_build_object('pedidos','sum(pedidos)','tarifa_emit','sum(tarifa_emit)','receita_emit','sum(receita_emit)');
    fil_map := jsonb_build_object('origem_midia','source_medium','campanha','campanha');
  elsif v_fonte = 'orcamento' then
    v_tabela := 'bi_orcamento';
    dim_map := jsonb_build_object('dia','data','semana','date_trunc(''week'',data)::date','mes','to_char(data,''YYYY-MM'')','trimestre','to_char(data,''YYYY'')||''-T''||extract(quarter from data)::int',
      'plataforma','plataforma');
    med_map := jsonb_build_object('planejado','sum(planejado)');
    fil_map := jsonb_build_object('plataforma','plataforma');
  else
    raise exception 'fonte desconhecida: %', v_fonte;
  end if;

  -- dimensoes
  for d in select jsonb_array_elements_text(coalesce(p->'dims','[]'::jsonb)) loop
    if not dim_map ? d then raise exception 'dimensao desconhecida: %', d; end if;
    v_dims := v_dims || d;
    v_sel  := v_sel  || format('%s as %I', dim_map->>d, d);
    v_grp  := v_grp  || (dim_map->>d);
  end loop;

  -- medidas (se nenhuma, usa a primeira da lista)
  for m in select jsonb_array_elements_text(coalesce(p->'medidas','[]'::jsonb)) loop
    if not med_map ? m then raise exception 'medida desconhecida: %', m; end if;
    v_meds := v_meds || m;
    v_sel  := v_sel  || format('%s as %I', med_map->>m, m);
  end loop;
  if array_length(v_meds,1) is null then raise exception 'informe ao menos uma medida'; end if;

  -- filtros: {"canal":["App"],"tipo":["Nacional"]}
  for k in select jsonb_object_keys(coalesce(p->'filtros','{}'::jsonb)) loop
    if not fil_map ? k then continue; end if;   -- filtro que a fonte nao tem: ignora (a UI avisa)
    if jsonb_typeof(p->'filtros'->k) <> 'array' or jsonb_array_length(p->'filtros'->k) = 0 then continue; end if;
    v_where := v_where || format(' and (%s) in (select jsonb_array_elements_text($3->''filtros''->%L))', fil_map->>k, k);
  end loop;

  -- ordem: "medida desc" ou "dim asc"; padrao = dia asc se houver dimensao de tempo, senao 1a medida desc
  ord := coalesce(p->>'ordem', '');
  if ord <> '' then
    k   := split_part(ord, ' ', 1);
    dir := case when lower(split_part(ord,' ',2)) = 'asc' then 'asc' else 'desc' end;
    if k = any (v_dims) or k = any (v_meds) then
      v_ordem := format(' order by %I %s nulls last', k, dir);
    end if;
  end if;
  if v_ordem = '' then
    if v_dims[1] in ('dia','semana','mes','trimestre','ano','dia_semana') then
      v_ordem := format(' order by %I asc', v_dims[1]);
    else
      v_ordem := format(' order by %I desc nulls last', v_meds[1]);
    end if;
  end if;

  v_sql := format(
    'select coalesce(jsonb_agg(t), ''[]''::jsonb) from (select %s from public.%I where %I between $1 and $2%s %s %s limit %s) t',
    array_to_string(v_sel, ', '), v_tabela, v_col_dia, v_where,
    case when array_length(v_grp,1) is null then '' else 'group by ' || array_to_string(v_grp, ', ') end,
    v_ordem, v_limite);

  execute v_sql into v_out using v_ini, v_fim, p;
  return v_out;
end $$;
revoke execute on function public.bi_consulta(jsonb) from public, anon;
grant execute on function public.bi_consulta(jsonb) to authenticated;
notify pgrst, 'reload schema';
