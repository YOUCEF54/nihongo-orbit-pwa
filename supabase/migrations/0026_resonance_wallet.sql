-- ============================================================
-- 0026_resonance_wallet.sql — Phase E: server-backed Resonance wallet.
--
-- Design notes:
--   · Rate math stays in the app layer (src/lib/gacha.ts). This migration
--     owns the *economy* invariants: currency, pity bounds, pool membership,
--     duplicate payouts, and the pull ledger.
--   · Every RPC is SECURITY DEFINER with an explicit auth.uid() check, so a
--     crafted client calling PostgREST directly cannot fabricate pulls:
--     item ids must belong to the banner pool and the deterministic pity
--     rules (hard cap + 10-pull 4★ floor + reset accounting) are rechecked.
--   · Config tables mirror src/lib/items.ts and src/lib/gacha.ts. The unit
--     test src/lib/resonance-sql-sync.test.mts parses this file and fails if
--     the two ever drift.
-- ============================================================

-- ---------------------------------------------------------------- config ----

create table if not exists public.resonance_items (
    id text primary key,
    kind text not null check (kind in ('theme', 'style', 'consumable', 'title')),
    rarity int not null check (rarity in (3, 4, 5)),
    stackable boolean not null default false,
    effect jsonb
);

create table if not exists public.resonance_dup_shards (
    rarity int primary key check (rarity in (3, 4, 5)),
    shards int not null check (shards >= 0)
);

create table if not exists public.resonance_banners (
    id text primary key,
    cost_currency text not null check (cost_currency in ('passes', 'crystals')),
    cost_per_pull int not null check (cost_per_pull > 0),
    featured5 text,
    pool jsonb not null,
    hard_cap int not null check (hard_cap > 0)
);

create table if not exists public.resonance_exchange_offers (
    id text primary key,
    cost_shards int not null check (cost_shards > 0),
    grants jsonb not null default '{}'::jsonb,
    item_id text references public.resonance_items(id)
);

insert into public.resonance_items (id, kind, rarity, stackable, effect) values
    ('theme-tactical',     'theme',      4, false, null),
    ('theme-hybrid',       'theme',      4, false, null),
    ('theme-minimal',      'theme',      4, false, null),
    ('style-ember',        'style',      4, false, null),
    ('style-prism',        'style',      5, false, null),
    ('title-explorer',     'title',      3, false, null),
    ('title-letter-lord',  'title',      4, false, null),
    ('title-signal-ace',   'title',      4, false, null),
    ('title-orbit-master', 'title',      5, false, null),
    ('consumable-energy',  'consumable', 3, true,  '{"type":"energy","amount":40}'::jsonb),
    ('consumable-cache',   'consumable', 3, true,  '{"type":"cache","amount":12}'::jsonb),
    ('consumable-dust',    'consumable', 3, false, '{"type":"shards","amount":15}'::jsonb)
on conflict (id) do update set
    kind = excluded.kind,
    rarity = excluded.rarity,
    stackable = excluded.stackable,
    effect = excluded.effect;

insert into public.resonance_dup_shards (rarity, shards) values
    (3, 5),
    (4, 20),
    (5, 100)
on conflict (rarity) do update set shards = excluded.shards;

insert into public.resonance_banners (id, cost_currency, cost_per_pull, featured5, pool, hard_cap) values
    ('standard', 'passes', 1, null,
     '{"3":["consumable-energy","consumable-cache","consumable-dust"],"4":["theme-hybrid","theme-minimal","style-ember","title-letter-lord","title-signal-ace"],"5":["style-prism","title-orbit-master"]}'::jsonb,
     60)
on conflict (id) do update set
    cost_currency = excluded.cost_currency,
    cost_per_pull = excluded.cost_per_pull,
    featured5 = excluded.featured5,
    pool = excluded.pool,
    hard_cap = excluded.hard_cap;

insert into public.resonance_exchange_offers (id, cost_shards, grants, item_id) values
    ('exchange-pass',        40,  '{"passes":1}'::jsonb,    null),
    ('exchange-crystals',    60,  '{"crystals":10}'::jsonb, null),
    ('exchange-style-ember', 120, '{}'::jsonb,              'style-ember')
on conflict (id) do update set
    cost_shards = excluded.cost_shards,
    grants = excluded.grants,
    item_id = excluded.item_id;

-- ----------------------------------------------------------------- tables ----

create table if not exists public.resonance_wallets (
    user_id uuid primary key references auth.users(id) on delete cascade,
    crystals int not null default 0 check (crystals >= 0),
    passes int not null default 0 check (passes >= 0),
    shards int not null default 0 check (shards >= 0),
    pass_progress int not null default 0 check (pass_progress >= 0),
    equipped_title text not null default '',
    updated_at timestamptz not null default now()
);

create table if not exists public.resonance_owned (
    user_id uuid not null references auth.users(id) on delete cascade,
    item_id text not null references public.resonance_items(id),
    count int not null default 1 check (count > 0),
    acquired_at timestamptz not null default now(),
    primary key (user_id, item_id)
);

create table if not exists public.resonance_pity (
    user_id uuid not null references auth.users(id) on delete cascade,
    banner_id text not null,
    count int not null default 0 check (count >= 0),
    guaranteed boolean not null default false,
    primary key (user_id, banner_id)
);

create table if not exists public.resonance_pulls (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    banner_id text not null,
    item_id text not null,
    rarity int not null check (rarity in (3, 4, 5)),
    is_featured boolean not null default false,
    dup boolean not null default false,
    shards int not null default 0 check (shards >= 0),
    was_guarantee boolean not null default false,
    pulled_at timestamptz not null default now()
);
create index if not exists idx_resonance_pulls_user on public.resonance_pulls (user_id, id desc);

create table if not exists public.resonance_sector_awards (
    user_id uuid not null references auth.users(id) on delete cascade,
    sector_id text not null,
    awarded_at timestamptz not null default now(),
    primary key (user_id, sector_id)
);

create table if not exists public.resonance_activity (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    kind text not null,
    points int not null check (points > 0),
    at timestamptz not null default now()
);
create index if not exists idx_resonance_activity_user on public.resonance_activity (user_id, at desc);

-- -------------------------------------------------------------------- RLS ----

alter table public.resonance_items enable row level security;
drop policy if exists "read_resonance_items" on public.resonance_items;
create policy "read_resonance_items" on public.resonance_items
    for select to authenticated using (true);

alter table public.resonance_dup_shards enable row level security;
drop policy if exists "read_resonance_dup_shards" on public.resonance_dup_shards;
create policy "read_resonance_dup_shards" on public.resonance_dup_shards
    for select to authenticated using (true);

alter table public.resonance_banners enable row level security;
drop policy if exists "read_resonance_banners" on public.resonance_banners;
create policy "read_resonance_banners" on public.resonance_banners
    for select to authenticated using (true);

alter table public.resonance_exchange_offers enable row level security;
drop policy if exists "read_resonance_exchange_offers" on public.resonance_exchange_offers;
create policy "read_resonance_exchange_offers" on public.resonance_exchange_offers
    for select to authenticated using (true);

alter table public.resonance_wallets enable row level security;
drop policy if exists "own_resonance_wallet" on public.resonance_wallets;
create policy "own_resonance_wallet" on public.resonance_wallets
    for all to authenticated
    using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.resonance_owned enable row level security;
drop policy if exists "own_resonance_owned" on public.resonance_owned;
create policy "own_resonance_owned" on public.resonance_owned
    for all to authenticated
    using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.resonance_pity enable row level security;
drop policy if exists "own_resonance_pity" on public.resonance_pity;
create policy "own_resonance_pity" on public.resonance_pity
    for all to authenticated
    using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.resonance_pulls enable row level security;
drop policy if exists "read_own_resonance_pulls" on public.resonance_pulls;
create policy "read_own_resonance_pulls" on public.resonance_pulls
    for select to authenticated using (auth.uid() = user_id);
drop policy if exists "insert_own_resonance_pulls" on public.resonance_pulls;
create policy "insert_own_resonance_pulls" on public.resonance_pulls
    for insert to authenticated with check (auth.uid() = user_id);

alter table public.resonance_sector_awards enable row level security;
drop policy if exists "own_resonance_sector_awards" on public.resonance_sector_awards;
create policy "own_resonance_sector_awards" on public.resonance_sector_awards
    for all to authenticated
    using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.resonance_activity enable row level security;
drop policy if exists "read_own_resonance_activity" on public.resonance_activity;
create policy "read_own_resonance_activity" on public.resonance_activity
    for select to authenticated using (auth.uid() = user_id);

-- ----------------------------------------------------------------- grants ----

grant select on public.resonance_items, public.resonance_dup_shards,
    public.resonance_banners, public.resonance_exchange_offers to authenticated;
grant select, insert, update, delete on public.resonance_wallets, public.resonance_owned,
    public.resonance_pity, public.resonance_sector_awards to authenticated;
grant select, insert on public.resonance_pulls to authenticated;
grant select, insert on public.resonance_activity to authenticated;
grant usage on sequence public.resonance_pulls_id_seq to authenticated;
grant usage on sequence public.resonance_activity_id_seq to authenticated;

-- ----------------------------------------------------------------- helpers ----

-- Starter owned set mirrors STARTER_OWNED in src/lib/resonance.ts.
create or replace function public.resonance_seed_starter(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    insert into public.resonance_wallets (user_id) values (p_user)
    on conflict (user_id) do nothing;

    insert into public.resonance_owned (user_id, item_id, count) values
        (p_user, 'theme-tactical', 1),
        (p_user, 'title-explorer', 1)
    on conflict (user_id, item_id) do nothing;
end;
$$;

create or replace function public.resonance_ensure_wallet()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    uid uuid := auth.uid();
begin
    if uid is null then
        raise exception 'unauthorized' using errcode = '28000';
    end if;
    perform public.resonance_seed_starter(uid);
    return public.resonance_snapshot(uid);
end;
$$;

-- Full wallet snapshot in the shape src/lib/resonance-map.ts expects.
create or replace function public.resonance_snapshot(p_user uuid)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
    select jsonb_build_object(
        'wallet', (
            select jsonb_build_object(
                'crystals', w.crystals,
                'passes', w.passes,
                'shards', w.shards,
                'pass_progress', w.pass_progress,
                'equipped_title', w.equipped_title
            )
            from public.resonance_wallets w where w.user_id = p_user
        ),
        'owned', coalesce((
            select jsonb_object_agg(o.item_id, o.count)
            from public.resonance_owned o where o.user_id = p_user
        ), '{}'::jsonb),
        'pity', coalesce((
            select jsonb_object_agg(p.banner_id, jsonb_build_object('count', p.count, 'guaranteed', p.guaranteed))
            from public.resonance_pity p where p.user_id = p_user
        ), '{}'::jsonb),
        'history', coalesce((
            select jsonb_agg(entry order by entry_ord)
            from (
                select jsonb_build_object(
                    'at', floor(extract(epoch from h.pulled_at) * 1000),
                    'bannerId', h.banner_id,
                    'itemId', h.item_id,
                    'rarity', h.rarity,
                    'isFeatured', h.is_featured,
                    'dup', h.dup,
                    'shards', h.shards
                ) as entry,
                h.id as entry_ord
                from (
                    select * from public.resonance_pulls
                    where user_id = p_user
                    order by id desc
                    limit 100
                ) h
                order by h.id asc
            ) ordered
        ), '[]'::jsonb)
    );
$$;

-- -------------------------------------------------------------- mutations ----

-- Applies a rolled pull atomically. The app supplies item ids + rarity
-- (rates live in gacha.ts); this function re-validates pool membership,
-- the deterministic pity rules, and recomputes duplicates/shards itself.
create or replace function public.resonance_apply_pull(
    p_banner_id text,
    p_count int,
    p_results jsonb,
    p_pity_count int,
    p_pity_guaranteed boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    uid uuid := auth.uid();
    banner public.resonance_banners%rowtype;
    wallet public.resonance_wallets%rowtype;
    prev_count int := 0;
    prev_guaranteed boolean := false;
    total_cost int;
    new_shards int;
    new_passes int;
    new_crystals int;
    outcome jsonb := '[]'::jsonb;
    entry jsonb;
    item public.resonance_items%rowtype;
    already_owned boolean;
    is_dup boolean;
    payout int;
    idx int := 0;
    seen_four boolean := false;
    first_five_idx int := 0;
    first_five_featured boolean := false;
    last_five_idx int := 0;
    last_five_featured boolean := false;
    expected_count int;
    expected_guaranteed boolean;
begin
    if uid is null then
        raise exception 'unauthorized' using errcode = '28000';
    end if;

    select * into banner from public.resonance_banners where id = p_banner_id;
    if not found then
        raise exception 'unknown_banner' using errcode = '22023';
    end if;

    if p_count is null or p_count < 1 or p_count > 10 then
        raise exception 'invalid_count' using errcode = '22023';
    end if;
    if jsonb_typeof(p_results) <> 'array' or jsonb_array_length(p_results) <> p_count then
        raise exception 'invalid_results' using errcode = '22023';
    end if;

    perform public.resonance_seed_starter(uid);

    select * into wallet from public.resonance_wallets where user_id = uid for update;
    if not found then
        raise exception 'unauthorized' using errcode = '28000';
    end if;

    select p.count, p.guaranteed into prev_count, prev_guaranteed
    from public.resonance_pity p where p.user_id = uid and p.banner_id = p_banner_id;
    if prev_count is null then
        prev_count := 0;
        prev_guaranteed := false;
    end if;

    total_cost := banner.cost_per_pull * p_count;
    if banner.cost_currency = 'passes' then
        if wallet.passes < total_cost then
            raise exception 'insufficient' using errcode = 'P0001';
        end if;
        new_passes := wallet.passes - total_cost;
        new_crystals := wallet.crystals;
    else
        if wallet.crystals < total_cost then
            raise exception 'insufficient' using errcode = 'P0001';
        end if;
        new_crystals := wallet.crystals - total_cost;
        new_passes := wallet.passes;
    end if;
    new_shards := wallet.shards;

    for entry in select * from jsonb_array_elements(p_results)
    loop
        idx := idx + 1;

        if jsonb_typeof(entry) <> 'object'
            or jsonb_typeof(entry->'id') <> 'string'
            or coalesce(entry->>'rarity', '') not in ('3', '4', '5') then
            raise exception 'invalid_results' using errcode = '22023';
        end if;
        if not (banner.pool -> (entry->>'rarity')) @> to_jsonb(entry->>'id') then
            raise exception 'item_not_in_pool' using errcode = '22023';
        end if;

        -- Featured bookkeeping: isFeatured only exists on 5★ rolls and
        -- must match the banner's featured item.
        if (entry->>'rarity')::int = 5 then
            if coalesce((entry->>'isFeatured')::boolean, false) then
                if banner.featured5 is null or entry->>'id' <> banner.featured5 then
                    raise exception 'invalid_results' using errcode = '22023';
                end if;
            elsif banner.featured5 is not null and entry->>'id' = banner.featured5 then
                raise exception 'invalid_results' using errcode = '22023';
            end if;
        elsif coalesce((entry->>'isFeatured')::boolean, false) then
            raise exception 'invalid_results' using errcode = '22023';
        end if;

        if (entry->>'rarity')::int >= 4 then
            seen_four := true;
        end if;
        if (entry->>'rarity')::int = 5 then
            if first_five_idx = 0 then
                first_five_idx := idx;
                first_five_featured := coalesce((entry->>'isFeatured')::boolean, false);
            end if;
            last_five_idx := idx;
            last_five_featured := coalesce((entry->>'isFeatured')::boolean, false);
        end if;

        -- Deterministic hard cap: every pull at/after the cap must be 5★.
        if prev_count + idx >= banner.hard_cap and (entry->>'rarity')::int <> 5 then
            raise exception 'pity_violation' using errcode = '22023';
        end if;

        select * into item from public.resonance_items where id = entry->>'id';
        if not found then
            raise exception 'invalid_results' using errcode = '22023';
        end if;

        if item.effect ->> 'type' = 'shards' then
            payout := (item.effect ->> 'amount')::int;
            is_dup := false;
        else
            select exists (
                select 1 from public.resonance_owned
                where user_id = uid and item_id = item.id
            ) into already_owned;

            is_dup := (not item.stackable) and already_owned;
            if is_dup then
                select d.shards into payout from public.resonance_dup_shards d
                where d.rarity = (entry->>'rarity')::int;
                payout := coalesce(payout, 0);
            else
                payout := 0;
                insert into public.resonance_owned (user_id, item_id, count)
                values (uid, item.id, 1)
                on conflict (user_id, item_id) do update set count = public.resonance_owned.count + 1;
            end if;
        end if;

        new_shards := new_shards + payout;

        insert into public.resonance_pulls
            (user_id, banner_id, item_id, rarity, is_featured, dup, shards, was_guarantee)
        values (
            uid,
            p_banner_id,
            item.id,
            (entry->>'rarity')::int,
            coalesce((entry->>'isFeatured')::boolean, false),
            is_dup,
            payout,
            coalesce((entry->>'wasGuarantee')::boolean, false)
        );

        outcome := outcome || jsonb_build_array(jsonb_build_object(
            'itemId', item.id,
            'rarity', (entry->>'rarity')::int,
            'isFeatured', coalesce((entry->>'isFeatured')::boolean, false),
            'dup', is_dup,
            'shards', payout,
            'wasGuarantee', coalesce((entry->>'wasGuarantee')::boolean, false)
        ));
    end loop;

    if p_count = 10 and not seen_four then
        raise exception 'guarantee_violation' using errcode = '22023';
    end if;

    -- Pity accounting: reset at the last 5★, otherwise keep accumulating.
    if last_five_idx > 0 then
        expected_count := p_count - last_five_idx;
    else
        expected_count := prev_count + p_count;
    end if;
    if p_pity_count is distinct from expected_count or expected_count > banner.hard_cap then
        raise exception 'pity_violation' using errcode = '22023';
    end if;

    -- 50/50 carry: only featured banners flip the guarantee flag, and a
    -- carried guarantee must resolve on the first 5★ of the batch.
    if banner.featured5 is null then
        expected_guaranteed := prev_guaranteed;
    elsif first_five_idx = 0 then
        expected_guaranteed := prev_guaranteed;
    else
        if prev_guaranteed and not first_five_featured then
            raise exception 'pity_violation' using errcode = '22023';
        end if;
        expected_guaranteed := not last_five_featured;
    end if;
    if p_pity_guaranteed is distinct from expected_guaranteed then
        raise exception 'pity_violation' using errcode = '22023';
    end if;

    update public.resonance_wallets set
        crystals = new_crystals,
        passes = new_passes,
        shards = new_shards,
        updated_at = now()
    where user_id = uid;

    insert into public.resonance_pity (user_id, banner_id, count, guaranteed)
    values (uid, p_banner_id, expected_count, expected_guaranteed)
    on conflict (user_id, banner_id) do update set
        count = excluded.count,
        guaranteed = excluded.guaranteed;

    return jsonb_build_object(
        'results', outcome,
        'state', public.resonance_snapshot(uid)
    );
end;
$$;

-- Equip an owned title ('' clears back to the default badge).
create or replace function public.resonance_equip_title(p_item_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    uid uuid := auth.uid();
begin
    if uid is null then
        raise exception 'unauthorized' using errcode = '28000';
    end if;
    perform public.resonance_seed_starter(uid);

    if p_item_id is distinct from '' then
        if not exists (
            select 1 from public.resonance_items
            where id = p_item_id and kind = 'title'
        ) then
            raise exception 'unknown_item' using errcode = '22023';
        end if;
        if not exists (
            select 1 from public.resonance_owned
            where user_id = uid and item_id = p_item_id
        ) then
            raise exception 'not_owned' using errcode = '22023';
        end if;
    end if;

    update public.resonance_wallets
    set equipped_title = coalesce(p_item_id, ''), updated_at = now()
    where user_id = uid;

    return public.resonance_snapshot(uid);
end;
$$;

-- Consume one stackable consumable; returns the effect for local application.
create or replace function public.resonance_consume(p_item_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    uid uuid := auth.uid();
    item public.resonance_items%rowtype;
    owned_count int;
    effect jsonb;
begin
    if uid is null then
        raise exception 'unauthorized' using errcode = '28000';
    end if;

    select * into item from public.resonance_items where id = p_item_id;
    if not found or item.kind <> 'consumable' then
        raise exception 'unknown_item' using errcode = '22023';
    end if;
    if item.effect is null then
        raise exception 'no_effect' using errcode = '22023';
    end if;

    select o.count into owned_count from public.resonance_owned o
    where o.user_id = uid and o.item_id = p_item_id;
    if owned_count is null then
        raise exception 'not_owned' using errcode = '22023';
    end if;

    if owned_count <= 1 then
        delete from public.resonance_owned where user_id = uid and item_id = p_item_id;
    else
        update public.resonance_owned set count = count - 1
        where user_id = uid and item_id = p_item_id;
    end if;

    effect := item.effect;
    if effect ->> 'type' = 'shards' then
        update public.resonance_wallets
        set shards = shards + (effect ->> 'amount')::int, updated_at = now()
        where user_id = uid;
    else
        update public.resonance_wallets set updated_at = now() where user_id = uid;
    end if;

    return jsonb_build_object(
        'effect', effect,
        'state', public.resonance_snapshot(uid)
    );
end;
$$;

-- Shards shop.
create or replace function public.resonance_redeem(p_offer_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    uid uuid := auth.uid();
    offer public.resonance_exchange_offers%rowtype;
    wallet public.resonance_wallets%rowtype;
begin
    if uid is null then
        raise exception 'unauthorized' using errcode = '28000';
    end if;

    select * into offer from public.resonance_exchange_offers where id = p_offer_id;
    if not found then
        raise exception 'unknown_item' using errcode = '22023';
    end if;

    perform public.resonance_seed_starter(uid);
    select * into wallet from public.resonance_wallets where user_id = uid for update;
    if not found then
        raise exception 'unauthorized' using errcode = '28000';
    end if;

    if offer.item_id is not null and exists (
        select 1 from public.resonance_owned where user_id = uid and item_id = offer.item_id
    ) then
        raise exception 'owned' using errcode = '22023';
    end if;

    if wallet.shards < offer.cost_shards then
        raise exception 'insufficient' using errcode = 'P0001';
    end if;

    update public.resonance_wallets set
        shards = wallet.shards - offer.cost_shards + coalesce((offer.grants ->> 'shards')::int, 0),
        passes = wallet.passes + coalesce((offer.grants ->> 'passes')::int, 0),
        crystals = wallet.crystals + coalesce((offer.grants ->> 'crystals')::int, 0),
        updated_at = now()
    where user_id = uid;

    if offer.item_id is not null then
        insert into public.resonance_owned (user_id, item_id, count)
        values (uid, offer.item_id, 1)
        on conflict (user_id, item_id) do update set count = public.resonance_owned.count + 1;
    end if;

    return public.resonance_snapshot(uid);
end;
$$;

-- Activity → Standard Pass progress, rate limited per kind.
-- Kinds and their budgets mirror noteResonanceActivity call sites:
--   review → 1 point per graded card, arcade → 5 points per solve.
create or replace function public.resonance_award_activity(p_kind text, p_points int)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    uid uuid := auth.uid();
    gap interval;
    daily_cap int;
    points int;
    last_at timestamptz;
    today_points int;
    gained int;
    awarded int;
begin
    if uid is null then
        raise exception 'unauthorized' using errcode = '28000';
    end if;
    if p_kind = 'review' then
        gap := interval '1 second';
        daily_cap := 400;
        points := least(greatest(coalesce(p_points, 1), 1), 5);
    elsif p_kind = 'arcade' then
        gap := interval '5 seconds';
        daily_cap := 150;
        points := least(greatest(coalesce(p_points, 5), 1), 10);
    else
        raise exception 'unknown_kind' using errcode = '22023';
    end if;

    perform public.resonance_seed_starter(uid);

    select a.at into last_at from public.resonance_activity a
    where a.user_id = uid and a.kind = p_kind
    order by a.at desc limit 1;

    if last_at is not null and now() - last_at < gap then
        return jsonb_build_object('awarded', 0, 'throttled', true, 'state', public.resonance_snapshot(uid));
    end if;

    select coalesce(sum(a.points), 0) into today_points from public.resonance_activity a
    where a.user_id = uid and a.kind = p_kind and a.at > now() - interval '1 day';
    points := least(points, greatest(daily_cap - today_points, 0));
    if points <= 0 then
        return jsonb_build_object('awarded', 0, 'throttled', true, 'state', public.resonance_snapshot(uid));
    end if;

    insert into public.resonance_activity (user_id, kind, points) values (uid, p_kind, points);

    select w.pass_progress + points into gained from public.resonance_wallets w where w.user_id = uid;
    awarded := gained / 10;

    update public.resonance_wallets set
        passes = passes + awarded,
        pass_progress = gained % 10,
        updated_at = now()
    where user_id = uid;

    return jsonb_build_object('awarded', awarded, 'throttled', false, 'state', public.resonance_snapshot(uid));
end;
$$;

-- One-time starter grace: grant the theme the browser already uses so the
-- terminal never takes away a look the user is enjoying at migration time.
create or replace function public.resonance_adopt_theme(p_item_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    uid uuid := auth.uid();
begin
    if uid is null then
        raise exception 'unauthorized' using errcode = '28000';
    end if;
    if not exists (
        select 1 from public.resonance_items where id = p_item_id and kind = 'theme'
    ) then
        raise exception 'unknown_item' using errcode = '22023';
    end if;

    perform public.resonance_seed_starter(uid);

    insert into public.resonance_owned (user_id, item_id, count) values (uid, p_item_id, 1)
    on conflict (user_id, item_id) do nothing;

    return public.resonance_snapshot(uid);
end;
$$;

-- One-time sector completion payout (mirrors SECTOR_CRYSTALS / SECTOR_PASSES).
create or replace function public.resonance_complete_sector(p_sector_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    uid uuid := auth.uid();
begin
    if uid is null then
        raise exception 'unauthorized' using errcode = '28000';
    end if;
    if p_sector_id is null or length(trim(p_sector_id)) = 0 then
        raise exception 'unknown_sector' using errcode = '22023';
    end if;

    perform public.resonance_seed_starter(uid);

    insert into public.resonance_sector_awards (user_id, sector_id)
    values (uid, p_sector_id)
    on conflict (user_id, sector_id) do nothing;

    if found then
        update public.resonance_wallets set
            crystals = crystals + 25,
            passes = passes + 3,
            updated_at = now()
        where user_id = uid;
        return jsonb_build_object('awarded', true, 'state', public.resonance_snapshot(uid));
    end if;

    return jsonb_build_object('awarded', false, 'state', public.resonance_snapshot(uid));
end;
$$;

-- ---------------------------------------------------------------- grants ----

revoke all on function public.resonance_seed_starter(uuid) from public, anon, authenticated;
revoke all on function public.resonance_snapshot(uuid) from public, anon, authenticated;

revoke all on function public.resonance_ensure_wallet() from public, anon;
revoke all on function public.resonance_adopt_theme(text) from public, anon;
revoke all on function public.resonance_apply_pull(text, int, jsonb, int, boolean) from public, anon;
revoke all on function public.resonance_equip_title(text) from public, anon;
revoke all on function public.resonance_consume(text) from public, anon;
revoke all on function public.resonance_redeem(text) from public, anon;
revoke all on function public.resonance_award_activity(text, int) from public, anon;
revoke all on function public.resonance_complete_sector(text) from public, anon;

grant execute on function public.resonance_ensure_wallet() to authenticated;
grant execute on function public.resonance_adopt_theme(text) to authenticated;
grant execute on function public.resonance_apply_pull(text, int, jsonb, int, boolean) to authenticated;
grant execute on function public.resonance_equip_title(text) to authenticated;
grant execute on function public.resonance_consume(text) to authenticated;
grant execute on function public.resonance_redeem(text) to authenticated;
grant execute on function public.resonance_award_activity(text, int) to authenticated;
grant execute on function public.resonance_complete_sector(text) to authenticated;
