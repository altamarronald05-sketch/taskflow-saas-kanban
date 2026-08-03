/* ==========================================================================
   TaskFlow SaaS | Supabase Cloud Connection & Configuration Module
   ========================================================================== */

// Configura aquí tus credenciales de Supabase (Obtenidas de https://supabase.com -> Project Settings -> API)
const SUPABASE_CONFIG = {
    // Reemplaza con tu URL de proyecto de Supabase (ej. "https://xyzcompany.supabase.co")
    url: 'YOUR_SUPABASE_URL',
    
    // Reemplaza con tu Anon Public Key de Supabase
    anonKey: 'YOUR_SUPABASE_ANON_KEY'
};

// Variable Global para el Cliente Supabase
let supabaseClient = null;

function isSupabaseConfigured() {
    return SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL' && 
           SUPABASE_CONFIG.anonKey !== 'YOUR_SUPABASE_ANON_KEY' &&
           typeof window.supabase !== 'undefined';
}

function initSupabaseClient() {
    if (isSupabaseConfigured()) {
        try {
            supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            console.log('⚡ Conectado exitosamente a Supabase Cloud PostgreSQL!');
            return true;
        } catch (err) {
            console.error('Error al inicializar el cliente de Supabase:', err);
            return false;
        }
    }
    return false;
}
