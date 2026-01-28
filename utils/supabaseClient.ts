
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://zmjvnpczyyoplydlzgup.supabase.co';
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptanZucGN6eXlvcGx5ZGx6Z3VwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4MTE1NTIsImV4cCI6MjA4MzM4NzU1Mn0.kdC1sxLySuKky0Byq6ByZjJ1GfDDiqOBkCYR-WrWTxw';

export const supabase = createClient(supabaseUrl, supabaseKey);
