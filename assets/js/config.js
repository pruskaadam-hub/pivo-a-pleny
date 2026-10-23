/* Veřejná konfigurace backendu (Supabase). Klíč „anon“ je veřejný – přístup hlídají pravidla v databázi. */
window.PP_CONFIG = {
  supabaseUrl: "https://fiwyunyqvwsdcwokulwn.supabase.co",
  supabaseKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpd3l1bnlxdndzZGN3b2t1bHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NzAyODYsImV4cCI6MjEwODM0NjI4Nn0.J7BQIHuqYjo0GaELCJoLGZDvJO9T1QQmB3NJ1aplmbU",
  payments: false, // zapni (true), až bude ve Stripe nastavený klíč a webhook
};
