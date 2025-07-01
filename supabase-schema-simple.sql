-- Create categories table
create table categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create expenses table
create table expenses (
  id uuid default gen_random_uuid() primary key,
  amount decimal(10,2) not null,
  description text not null,
  category_id uuid references categories(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on categories
alter table categories enable row level security;

-- Enable RLS on expenses
alter table expenses enable row level security;

-- RLS policies for categories
create policy "Users can view their own categories" on categories
  for select using (auth.uid() = user_id);

create policy "Users can insert their own categories" on categories
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own categories" on categories
  for update using (auth.uid() = user_id);

create policy "Users can delete their own categories" on categories
  for delete using (auth.uid() = user_id);

-- RLS policies for expenses
create policy "Users can view their own expenses" on expenses
  for select using (auth.uid() = user_id);

create policy "Users can insert their own expenses" on expenses
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own expenses" on expenses
  for update using (auth.uid() = user_id);

create policy "Users can delete their own expenses" on expenses
  for delete using (auth.uid() = user_id);