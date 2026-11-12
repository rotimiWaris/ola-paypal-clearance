create table if not exists users (
  id text primary key,
  email text not null unique,
  name text not null,
  password_hash text not null,
  merchant_name text not null default '',
  merchant_place text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token_hash text primary key,
  user_id text not null references users (id),
  expires_at timestamptz not null
);

create table if not exists products (
  id text primary key,
  user_id text not null references users (id),
  sku text not null,
  name text not null,
  category text not null,
  unit_price_cents integer not null,
  subscription boolean not null default false,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, sku)
);

create table if not exists letters (
  id text primary key,
  user_id text not null references users (id),
  merchant_name text not null,
  merchant_place text not null,
  buyer_name text not null,
  buyer_role text not null,
  buyer_org text not null,
  categories jsonb not null,
  max_unit_price_cents integer not null,
  max_basket_cents integer not null,
  max_qty_per_sku integer not null,
  allow_subscriptions boolean not null default false,
  signed_at timestamptz not null,
  expires_at timestamptz not null,
  content_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists exhibits (
  id text primary key,
  user_id text not null references users (id),
  letter_id text not null,
  document jsonb not null,
  created_at timestamptz not null
);

create index if not exists exhibits_user_created on exhibits (user_id, created_at desc);
