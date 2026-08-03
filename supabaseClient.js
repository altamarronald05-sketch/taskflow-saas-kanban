/* ==========================================================================
   TaskFlow SaaS | Supabase Cloud Connection & Configuration Module
   ========================================================================== */

// Credenciales del proyecto "TaskFlow SaaS" en Supabase Cloud
const SUPABASE_CONFIG = {
    url: 'https://csmlbcbnjoqudhdfsyim.supabase.co',
    anonKey: 'sb_publishable_0Qq4Lr52U3NeyDh1a6bWMA_HUsR1Smk'
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
