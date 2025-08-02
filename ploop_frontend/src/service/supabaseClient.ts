import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jzntawgmnmmqsuinjuve.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6bnRhd2dtbm1tcXN1aW5qdXZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5NDk2MzQsImV4cCI6MjA2OTUyNTYzNH0.mIEveZrebIt6e0FnPaC0jgqwACqW7atDOpltP-kdDwE'

export const supabase = createClient(supabaseUrl, supabaseKey);