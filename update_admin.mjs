import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://augjemrljnikajbzebpw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1Z2plbXJsam5pa2FqYnplYnB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzM4ODksImV4cCI6MjA4NzUwOTg4OX0.eutvLCNXlPi6tLeoCLTnQ2KMScSYc4b3UreNN_6Q8nY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function update() {
    const { data, error } = await supabase
        .from('users')
        .update({ access_code: 'fizzxyz1' })
        .eq('access_code', 'admin_kadir123');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success! Admin updated to fizzxyz1');
    }
}

update();
