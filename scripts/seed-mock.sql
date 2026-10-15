-- DADOS FICTICIOS so para desenvolver a interface localmente (VITE_MOCK=1). Nunca vai para producao.
truncate bi_fato_rota, bi_fato_canal, bi_fato_invest, bi_fato_campanha, bi_status;
create temp table rotas(o text, d text, intl bool, peso numeric, tarifa numeric);
insert into rotas values
('GRU','GIG',false,10,520),('GRU','REC',false,7,980),('GRU','SSA',false,7,940),('GRU','FOR',false,7,1020),('GRU','BSB',false,6,610),
('GRU','POA',false,5,640),('GRU','CWB',false,4,430),('GRU','FLN',false,5,720),('GRU','NAT',false,5,1100),('GRU','MCZ',false,4,1050),
('CGH','SDU',false,6,540),('VCP','REC',false,3,900),('BSB','GRU',false,5,590),('GIG','GRU',false,6,500),('CNF','GRU',false,4,480),
('GRU','LIS',true,5,4300),('GRU','MIA',true,5,4600),('GRU','MCO',true,4,4900),('GRU','EZE',true,4,2100),('GRU','SCL',true,3,2300),
('GRU','JFK',true,3,5200),('GRU','MAD',true,3,4600),('GRU','CDG',true,2,5400),('GRU','FCO',true,2,5100),('GRU','CUN',true,2,4700),
('GIG','LIS',true,2,4400),('GRU','OPO',true,2,4200),('GRU','LHR',true,2,5600),('GRU','PUJ',true,1,4800),('REC','LIS',true,1,4100);
create temp table canais(c text, peso numeric, ga4 numeric, emi numeric);
insert into canais values
('Direto',26,0.92,0.34),('Midia Paga',17,0.95,0.27),('App',9,0.97,0.38),('Canais Proprietarios',6,0.9,0.31),('Midia Organica',10,0.93,0.29),
('Afiliados',8,0.55,0.3),('Outros',5,0.4,0.25),('Metabuscadores',7,0.9,0.22),('Cobrand',4,0.5,0.4),('Parceiros',4,0.5,0.33),('Venda offline',4,0.0,0.6);

select setseed(0.42);
create temp table base as
select dia::date as data, c.c as canal, r.intl, r.o as origem, r.d as destino, c.ga4, c.emi, r.tarifa as tf,
  greatest(1, round((r.peso*c.peso/60.0) * (1 + 0.6*sin((extract(doy from dia)/365.0)*6.283 + 4))
    * (case when dia >= '2026-01-01' then 1.22 else 1 end)
    * (case when extract(dow from dia) in (0,6) then 0.8 else 1.05 end)
    * (0.6+random()*0.8)))::int as n
from generate_series('2025-01-01'::date,'2026-10-14'::date,'1 day') dia
cross join canais c
join rotas r on random() < least(0.9, r.peso/12.0*c.peso/10.0);

insert into bi_fato_rota (data,canal,intl,origem,destino,pedidos,pedidos_emit,cancelados,tarifa,tarifa_emit,receita,receita_emit,passageiros,pedidos_ga4,pedidos_reat,ant_soma,ant_n,dur_soma,dur_n)
select data, canal, intl, origem, destino, n,
  e, case when random()<0.08 then 1 else 0 end,
  round((n*tf*(0.85+random()*0.3))::numeric,2),
  round((e*tf*(0.85+random()*0.3))::numeric,2),
  round((n*tf*0.06)::numeric,2), round((e*tf*0.06)::numeric,2),
  round(n*(1.2+random()*0.5))::int,
  round(n*ga4)::int,
  case when canal in ('Direto','Midia Paga') then round(n*0.08)::int else 0 end,
  e*(25+(random()*40)::int), e, e*(5+(random()*8)::int), round(e*0.7)::int
from (select *, least(n, round(n*emi*(0.85+random()*0.3))::int) as e from base) s
on conflict do nothing;

insert into bi_fato_invest select d::date,'Google Ads','Brand | Search', round((900+random()*300)::numeric,2) from generate_series('2025-01-01'::date,'2026-10-14','1 day') d
union all select d::date,'Google Ads','Nacional | PMax', round((1400+random()*500)::numeric,2) from generate_series('2025-01-01'::date,'2026-10-14','1 day') d
union all select d::date,'Meta Ads','Remarketing | Conversao', round((600+random()*250)::numeric,2) from generate_series('2025-01-01'::date,'2026-10-14','1 day') d
union all select d::date,'Meta Ads','Internacional | Descoberta', round((500+random()*300)::numeric,2) from generate_series('2025-01-01'::date,'2026-10-14','1 day') d;

insert into bi_fato_campanha select d::date,'google / cpc',k, (3+random()*20)::int, round((4000+random()*9000)::numeric,2), round((300+random()*800)::numeric,2)
from generate_series('2025-01-01'::date,'2026-10-14','1 day') d, (values ('Brand | Search'),('Nacional | PMax')) v(k)
union all select d::date,'facebook / paid',k, (2+random()*12)::int, round((2500+random()*6000)::numeric,2), round((200+random()*500)::numeric,2)
from generate_series('2025-01-01'::date,'2026-10-14','1 day') d, (values ('Remarketing | Conversao'),('Internacional | Descoberta')) v(k);

insert into bi_status(chave,valor) values
 ('ultima_carga', jsonb_build_object('modo','incremental','fim', now(), 'linhas', 0, 'fonte','MOCK')),
 ('vigia', '{"verde":true,"alertas":[]}'::jsonb);
