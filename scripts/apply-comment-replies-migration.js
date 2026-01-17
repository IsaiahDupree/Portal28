#!/usr/bin/env node

// Script to apply lesson comment replies migration
// Run: node scripts/apply-comment-replies-migration.js

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'http://127.0.0.1:28321';
const supabaseKey = 'sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz'; // Service role key for local

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('Applying lesson comment replies migration...');

  const migrations = [
    // Add parent_comment_id column for nested replies
    `alter table public.lesson_comments
      add column if not exists parent_comment_id uuid references public.lesson_comments(id) on delete cascade`,

    // Add reply_count for efficient aggregation
    `alter table public.lesson_comments
      add column if not exists reply_count int not null default 0`,

    // Add index for parent-child relationship queries
    `create index if not exists idx_lesson_comments_parent on public.lesson_comments(parent_comment_id)`,

    // Function to update reply count
    `create or replace function update_comment_reply_count()
    returns trigger as $$
    begin
      if TG_OP = 'INSERT' and NEW.parent_comment_id is not null then
        update public.lesson_comments
        set reply_count = reply_count + 1
        where id = NEW.parent_comment_id;
      elsif TG_OP = 'DELETE' and OLD.parent_comment_id is not null then
        update public.lesson_comments
        set reply_count = reply_count - 1
        where id = OLD.parent_comment_id;
      end if;
      return null;
    end;
    $$ language plpgsql`,

    // Trigger to automatically update reply counts
    `drop trigger if exists update_reply_count_trigger on public.lesson_comments`,

    `create trigger update_reply_count_trigger
      after insert or delete on public.lesson_comments
      for each row
      execute function update_comment_reply_count()`,

    // Add admin delete policy
    `drop policy if exists "Admins can delete any comment" on public.lesson_comments`,

    `create policy "Admins can delete any comment" on public.lesson_comments
      for delete using (
        exists (
          select 1 from public.users
          where id = auth.uid() and role = 'admin'
        )
      )`
  ];

  for (const sql of migrations) {
    console.log(`Executing: ${sql.substring(0, 60)}...`);
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
      // If rpc doesn't work, try direct query
      return await supabase.from('_').select('*').limit(0).then(() => {
        // Create a raw SQL execution
        return fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ sql_query: sql })
        }).then(r => r.json()).then(data => ({ error: data.error, data: data.result }));
      });
    });

    if (error) {
      console.error(`Error executing SQL:`, error);
      return;
    }
    console.log(`✓ Success`);
  }

  console.log('\n✅ Migration applied successfully!');
}

applyMigration().catch(console.error);
