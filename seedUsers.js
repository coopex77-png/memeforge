require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const init = async () => {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
    
    const packages = ['Starter', 'Pro', 'Max', 'Private', 'Cookball'];
    
    for(let i = 0; i < 20; i++) {
        const pkg = packages[Math.floor(Math.random() * packages.length)];
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Random date within the last few hours
        const lastLogin = new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 48)).toISOString();
        
        await supabase.from('users').insert([{
            access_code: code,
            is_active: Math.random() > 0.2, // 80% active
            art_credits: Math.floor(Math.random() * 100),
            lore_credits: Math.floor(Math.random() * 50),
            package_name: pkg,
            last_login: Math.random() > 0.3 ? lastLogin : null,
            subscription_days: Math.floor(Math.random() * 30),
            subscription_start: new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 10)).toISOString()
        }]);
    }
    console.log("Seeding complete. ");
}

init();

