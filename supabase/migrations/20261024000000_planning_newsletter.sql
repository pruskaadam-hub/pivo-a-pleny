-- Newsletter a obsah i pro fázi před těhotenstvím (plánujeme / snažíme se)
alter table public.newsletter_issues drop constraint if exists newsletter_issues_phase_check;
alter table public.newsletter_issues add constraint newsletter_issues_phase_check check (phase in ('planujeme', 'tehotenstvi', 'po-porodu'));
alter table public.media drop constraint if exists media_phase_check;
alter table public.media add constraint media_phase_check check (phase in ('vse', 'planujeme', 'tehotenstvi', 'po-porodu'));
