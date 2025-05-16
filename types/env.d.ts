declare module '@env' {
  export interface Env {
    EXPO_PUBLIC_SUPABASE_URL: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
  }
}

declare global {
  namespace NodeJS {
    interface ProcessEnv extends Env {}
  }
}