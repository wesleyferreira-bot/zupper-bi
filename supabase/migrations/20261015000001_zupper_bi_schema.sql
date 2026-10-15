-- Zupper BI 2.0 — esquema, RLS e funcoes de consulta
-- Principio: o navegador nunca fala com o BigQuery. Os dados chegam por sincronizacao
-- (edge function bi-sync, chave de servico so no servidor) e o front le apenas daqui,
-- sempre por RLS: so quem esta em bi_membros enxerga qualquer coisa.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Membros (quem pode entrar) e convites
-- ---------------------------------------------------------------------------
create table if not exists public.bi_membros (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  email     text not null,
  nome      text,
  papel     text not null default 'viewer' check (papel in ('admin','viewer')),
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);
alter table public.bi_membros enable row level security;

create table if not exists public.bi_convites (
  email      text primary key,
  nome       text,
  papel      text not null default 'viewer' check (papel in ('admin','viewer')),
  origem     text,
  enviado_em timestamptz,
  criado_em  timestamptz not null default now()
);
alter table public.bi_convites enable row level security;

create or replace function public.bi_eh_membro() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bi_membros m where m.user_id = auth.uid() and m.ativo)
$$;

create or replace function public.bi_eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bi_membros m where m.user_id = auth.uid() and m.ativo and m.papel = 'admin')
$$;

-- Quando alguem com convite se cadastra (ou e criado pelo admin), vira membro sozinho.
create or replace function public.bi_novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.bi_convites%rowtype;
begin
  select * into c from public.bi_convites where lower(email) = lower(new.email);
  if found then
    insert into public.bi_membros (user_id, email, nome, papel)
    values (new.id, new.email, coalesce(c.nome, split_part(new.email,'@',1)), c.papel)
    on conflict (user_id) do nothing;
  end if;
  return new;
end $$;

-- Usuarios entram por funcoes de servidor (acesso-link, admin-membros), que criam o membro junto.
-- Nao ha gatilho em auth.users de proposito.

create policy bi_membros_ler on public.bi_membros for select to authenticated
  using (user_id = auth.uid() or public.bi_eh_admin());
create policy bi_membros_admin on public.bi_membros for all to authenticated
  using (public.bi_eh_admin()) with check (public.bi_eh_admin());
create policy bi_convites_admin on public.bi_convites for all to authenticated
  using (public.bi_eh_admin()) with check (public.bi_eh_admin());

-- ---------------------------------------------------------------------------
-- 2. Fatos
-- ---------------------------------------------------------------------------
-- Vendas por dia x canal (reatribuido) x nacional/internacional x origem x destino.
create table if not exists public.bi_fato_rota (
  data         date    not null,
  canal        text    not null,
  intl         boolean not null,
  origem       text    not null,
  destino      text    not null,
  pedidos      integer not null default 0,
  pedidos_emit integer not null default 0,
  cancelados   integer not null default 0,
  tarifa       numeric(14,2) not null default 0,
  tarifa_emit  numeric(14,2) not null default 0,
  receita      numeric(14,2) not null default 0,
  receita_emit numeric(14,2) not null default 0,
  passageiros  integer not null default 0,
  pedidos_ga4  integer not null default 0,
  pedidos_reat integer not null default 0,
  ant_soma     bigint  not null default 0,
  ant_n        integer not null default 0,
  dur_soma     bigint  not null default 0,
  dur_n        integer not null default 0,
  primary key (data, canal, intl, origem, destino)
);
create index if not exists bi_fato_rota_data_idx on public.bi_fato_rota (data);

-- Vendas por dia x canal original x canal reatribuido (sem geografia): pagina de atribuicao.
create table if not exists public.bi_fato_canal (
  data              date not null,
  canal             text not null,
  agrupamento       text not null,
  canal_reat        text not null,
  agrupamento_reat  text not null,
  pedidos           integer not null default 0,
  pedidos_emit      integer not null default 0,
  tarifa            numeric(14,2) not null default 0,
  tarifa_emit       numeric(14,2) not null default 0,
  receita           numeric(14,2) not null default 0,
  receita_emit      numeric(14,2) not null default 0,
  pedidos_ga4       integer not null default 0,
  pedidos_reat      integer not null default 0,
  primary key (data, canal, agrupamento, canal_reat, agrupamento_reat)
);
create index if not exists bi_fato_canal_data_idx on public.bi_fato_canal (data);

create table if not exists public.bi_fato_invest (
  data       date not null,
  plataforma text not null,
  campanha   text not null,
  custo      numeric(14,2) not null default 0,
  impressoes bigint not null default 0,
  cliques    bigint not null default 0,
  primary key (data, plataforma, campanha)
);
create index if not exists bi_fato_invest_data_idx on public.bi_fato_invest (data);

create table if not exists public.bi_fato_campanha (
  data          date not null,
  source_medium text not null,
  campanha      text not null,
  pedidos       integer not null default 0,
  tarifa_emit   numeric(14,2) not null default 0,
  receita_emit  numeric(14,2) not null default 0,
  primary key (data, source_medium, campanha)
);
create index if not exists bi_fato_campanha_data_idx on public.bi_fato_campanha (data);

-- Estado da carga: ultima atualizacao, cobertura, vigia.
create table if not exists public.bi_status (
  chave         text primary key,
  valor         jsonb not null,
  atualizado_em timestamptz not null default now()
);

-- Conversas do analista de IA (historico salvo por usuario).
create table if not exists public.bi_conversas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo        text not null default 'Nova conversa',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create table if not exists public.bi_mensagens (
  id          uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.bi_conversas(id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  papel       text not null check (papel in ('user','assistant')),
  conteudo    text not null,
  via         text not null default 'texto' check (via in ('texto','voz','insight')),
  meta        jsonb,
  criado_em   timestamptz not null default now()
);
create index if not exists bi_mensagens_conv_idx on public.bi_mensagens (conversa_id, criado_em);

-- ---------------------------------------------------------------------------
-- 3. RLS: leitura so para membros; escrita dos fatos so pelo servico (service_role ignora RLS)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['bi_fato_rota','bi_fato_canal','bi_fato_invest','bi_fato_campanha','bi_status'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.bi_eh_membro())', t || '_ler', t);
  end loop;
end $$;

alter table public.bi_conversas  enable row level security;
alter table public.bi_mensagens  enable row level security;
create policy bi_conversas_dono on public.bi_conversas for all to authenticated
  using (user_id = auth.uid() and public.bi_eh_membro())
  with check (user_id = auth.uid() and public.bi_eh_membro());
create policy bi_conversas_admin_ler on public.bi_conversas for select to authenticated
  using (public.bi_eh_admin());
create policy bi_mensagens_dono on public.bi_mensagens for all to authenticated
  using (user_id = auth.uid() and public.bi_eh_membro())
  with check (
    user_id = auth.uid() and public.bi_eh_membro()
    and exists (select 1 from public.bi_conversas c where c.id = conversa_id and c.user_id = auth.uid())
  );
create policy bi_mensagens_admin_ler on public.bi_mensagens for select to authenticated
  using (public.bi_eh_admin());

-- privilegios explicitos (RLS decide as linhas; GRANT decide a porta)
grant select on public.bi_fato_rota, public.bi_fato_canal, public.bi_fato_invest,
                public.bi_fato_campanha, public.bi_status to authenticated;
grant select, insert, update, delete on public.bi_conversas, public.bi_mensagens,
                public.bi_membros, public.bi_convites to authenticated;
grant all on all tables in schema public to service_role;

-- anon nao enxerga nada de nada
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- ---------------------------------------------------------------------------
-- 4. Consulta generica com lista fechada (UI de analise livre e analista de IA usam a mesma porta)
-- ---------------------------------------------------------------------------
-- Nenhum texto do cliente vira SQL: dimensoes, medidas, filtros e ordem so entram
-- se existirem nas listas abaixo.
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
      'dia','data','semana','date_trunc(''week'',data)::date','mes','to_char(data,''YYYY-MM'')',
      'canal_original','canal','agrupamento_original','agrupamento',
      'canal','canal_reat','agrupamento','agrupamento_reat');
    med_map := jsonb_build_object(
      'pedidos','sum(pedidos)','pedidos_emit','sum(pedidos_emit)','tarifa','sum(tarifa)','tarifa_emit','sum(tarifa_emit)',
      'receita','sum(receita)','receita_emit','sum(receita_emit)','pedidos_ga4','sum(pedidos_ga4)','pedidos_reat','sum(pedidos_reat)',
      'cobertura_ga4','round(100.0*sum(pedidos_ga4)/nullif(sum(pedidos),0),2)');
    fil_map := jsonb_build_object('canal','canal_reat','canal_original','canal','agrupamento','agrupamento_reat','agrupamento_original','agrupamento');
  elsif v_fonte = 'invest' then
    v_tabela := 'bi_fato_invest';
    dim_map := jsonb_build_object('dia','data','semana','date_trunc(''week'',data)::date','mes','to_char(data,''YYYY-MM'')',
      'plataforma','plataforma','campanha','campanha');
    med_map := jsonb_build_object('custo','sum(custo)');
    fil_map := jsonb_build_object('plataforma','plataforma','campanha','campanha');
  elsif v_fonte = 'campanha' then
    v_tabela := 'bi_fato_campanha';
    dim_map := jsonb_build_object('dia','data','semana','date_trunc(''week'',data)::date','mes','to_char(data,''YYYY-MM'')',
      'origem_midia','source_medium','campanha','campanha');
    med_map := jsonb_build_object('pedidos','sum(pedidos)','tarifa_emit','sum(tarifa_emit)','receita_emit','sum(receita_emit)');
    fil_map := jsonb_build_object('origem_midia','source_medium','campanha','campanha');
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
    if v_dims[1] in ('dia','semana','mes','ano','dia_semana') then
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

-- ---------------------------------------------------------------------------
-- 5. Status dos dados (ultima atualizacao + cobertura) numa chamada so
-- ---------------------------------------------------------------------------
create or replace function public.bi_status_dados() returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare v jsonb; r record;
begin
  if not public.bi_eh_membro() then raise exception 'acesso negado' using errcode = '42501'; end if;
  select jsonb_build_object(
    'dados_ate',   (select max(data) from bi_fato_rota),
    'dados_desde', (select min(data) from bi_fato_rota),
    'cobertura_ga4_30d', (select round(100.0*sum(pedidos_ga4)/nullif(sum(pedidos),0),1)
                           from bi_fato_rota where data >= (select max(data) from bi_fato_rota) - 29),
    'cobertura_ga4_7d',  (select round(100.0*sum(pedidos_ga4)/nullif(sum(pedidos),0),1)
                           from bi_fato_rota where data >= (select max(data) from bi_fato_rota) - 6),
    'invest_ate',  (select max(data) from bi_fato_invest),
    'carga',       (select valor from bi_status where chave = 'ultima_carga'),
    'vigia',       (select valor from bi_status where chave = 'vigia')
  ) into v;
  return v;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Carga (somente service_role): limpa o intervalo e insere de uma vez, em lotes
-- ---------------------------------------------------------------------------
-- A limpeza do intervalo antes da carga e feita pela edge function bi-sync (service_role, via API).

create or replace function public.bi_carga_inserir(p_fonte text, p_rows jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if p_fonte = 'rota' then
    insert into bi_fato_rota select * from jsonb_populate_recordset(null::bi_fato_rota, p_rows)
    on conflict (data, canal, intl, origem, destino) do update set
      pedidos = bi_fato_rota.pedidos + excluded.pedidos, pedidos_emit = bi_fato_rota.pedidos_emit + excluded.pedidos_emit,
      cancelados = bi_fato_rota.cancelados + excluded.cancelados, tarifa = bi_fato_rota.tarifa + excluded.tarifa,
      tarifa_emit = bi_fato_rota.tarifa_emit + excluded.tarifa_emit, receita = bi_fato_rota.receita + excluded.receita,
      receita_emit = bi_fato_rota.receita_emit + excluded.receita_emit, passageiros = bi_fato_rota.passageiros + excluded.passageiros,
      pedidos_ga4 = bi_fato_rota.pedidos_ga4 + excluded.pedidos_ga4, pedidos_reat = bi_fato_rota.pedidos_reat + excluded.pedidos_reat,
      ant_soma = bi_fato_rota.ant_soma + excluded.ant_soma, ant_n = bi_fato_rota.ant_n + excluded.ant_n,
      dur_soma = bi_fato_rota.dur_soma + excluded.dur_soma, dur_n = bi_fato_rota.dur_n + excluded.dur_n;
  elsif p_fonte = 'canal' then
    insert into bi_fato_canal select * from jsonb_populate_recordset(null::bi_fato_canal, p_rows)
    on conflict (data, canal, agrupamento, canal_reat, agrupamento_reat) do update set
      pedidos = bi_fato_canal.pedidos + excluded.pedidos, pedidos_emit = bi_fato_canal.pedidos_emit + excluded.pedidos_emit,
      tarifa = bi_fato_canal.tarifa + excluded.tarifa, tarifa_emit = bi_fato_canal.tarifa_emit + excluded.tarifa_emit,
      receita = bi_fato_canal.receita + excluded.receita, receita_emit = bi_fato_canal.receita_emit + excluded.receita_emit,
      pedidos_ga4 = bi_fato_canal.pedidos_ga4 + excluded.pedidos_ga4, pedidos_reat = bi_fato_canal.pedidos_reat + excluded.pedidos_reat;
  elsif p_fonte = 'invest' then
    insert into bi_fato_invest select * from jsonb_populate_recordset(null::bi_fato_invest, p_rows)
    on conflict (data, plataforma, campanha) do update set custo = bi_fato_invest.custo + excluded.custo,
      impressoes = bi_fato_invest.impressoes + excluded.impressoes, cliques = bi_fato_invest.cliques + excluded.cliques;
  elsif p_fonte = 'campanha' then
    insert into bi_fato_campanha select * from jsonb_populate_recordset(null::bi_fato_campanha, p_rows)
    on conflict (data, source_medium, campanha) do update set
      pedidos = bi_fato_campanha.pedidos + excluded.pedidos, tarifa_emit = bi_fato_campanha.tarifa_emit + excluded.tarifa_emit,
      receita_emit = bi_fato_campanha.receita_emit + excluded.receita_emit;
  else raise exception 'fonte desconhecida'; end if;
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.bi_status_gravar(p_chave text, p_valor jsonb) returns void
language sql security definer set search_path = public as $$
  insert into bi_status (chave, valor, atualizado_em) values (p_chave, p_valor, now())
  on conflict (chave) do update set valor = excluded.valor, atualizado_em = now()
$$;

-- Tudo que escreve ou administra fica fechado para o navegador. Funcoes novas nascem com
-- EXECUTE para PUBLIC, entao revogamos de forma explicita.
revoke execute on function public.bi_carga_inserir(text,jsonb)    from public, anon, authenticated;
revoke execute on function public.bi_status_gravar(text,jsonb)    from public, anon, authenticated;
grant  execute on function public.bi_carga_inserir(text,jsonb)    to service_role;
grant  execute on function public.bi_status_gravar(text,jsonb)    to service_role;

revoke execute on function public.bi_consulta(jsonb)  from public, anon;
revoke execute on function public.bi_status_dados()   from public, anon;
revoke execute on function public.bi_eh_membro()      from public, anon;
revoke execute on function public.bi_eh_admin()       from public, anon;
revoke execute on function public.bi_novo_usuario()   from public, anon, authenticated;
grant  execute on function public.bi_consulta(jsonb), public.bi_status_dados(),
                           public.bi_eh_membro(), public.bi_eh_admin() to authenticated;

notify pgrst, 'reload schema';
