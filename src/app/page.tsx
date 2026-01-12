import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Home() {
  const supabase = await createClient();
  
  // Example: Fetch data from Supabase
  const { data, error } = await supabase.from('your_table').select('*').limit(5);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 font-sans">
      <main className="flex w-full max-w-4xl flex-col gap-8 rounded-2xl bg-white/10 backdrop-blur-lg p-12 shadow-2xl border border-white/20">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="rounded-full bg-white/20 p-6 backdrop-blur-sm">
            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-white">
            Next.js + Supabase
          </h1>
          
          <p className="max-w-2xl text-xl leading-relaxed text-white/90">
            Tu proyecto está listo para comenzar. Configura tus variables de entorno y empieza a construir aplicaciones increíbles.
          </p>
        </div>

        <div className="rounded-xl bg-white/10 backdrop-blur-sm p-6 border border-white/20">
          <h2 className="text-2xl font-semibold text-white mb-4">🚀 Próximos Pasos</h2>
          <ol className="space-y-3 text-white/90">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-sm font-bold">1</span>
              <span>Copia <code className="px-2 py-1 bg-black/30 rounded text-sm">env.example.txt</code> y renómbralo a <code className="px-2 py-1 bg-black/30 rounded text-sm">.env.local</code></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-sm font-bold">2</span>
              <span>Crea un proyecto en <a href="https://supabase.com" target="_blank" className="underline hover:text-white transition-colors">supabase.com</a></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-sm font-bold">3</span>
              <span>Agrega tu URL y API Key de Supabase al archivo <code className="px-2 py-1 bg-black/30 rounded text-sm">.env.local</code></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-sm font-bold">4</span>
              <span>Reinicia el servidor de desarrollo</span>
            </li>
          </ol>
        </div>

        <div className="rounded-xl bg-white/10 backdrop-blur-sm p-6 border border-white/20">
          <h2 className="text-2xl font-semibold text-white mb-4">📚 Utilidades Creadas</h2>
          <ul className="space-y-2 text-white/90">
            <li className="flex items-center gap-2">
              <span className="text-green-300">✓</span>
              <code className="px-2 py-1 bg-black/30 rounded text-sm">src/lib/supabase/client.ts</code> - Cliente para componentes del lado del cliente
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-300">✓</span>
              <code className="px-2 py-1 bg-black/30 rounded text-sm">src/lib/supabase/server.ts</code> - Cliente para Server Components
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-300">✓</span>
              <code className="px-2 py-1 bg-black/30 rounded text-sm">src/lib/supabase/middleware.ts</code> - Utilidad para middleware
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-300">✓</span>
              <code className="px-2 py-1 bg-black/30 rounded text-sm">src/middleware.ts</code> - Middleware de Next.js
            </li>
          </ul>
        </div>

        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-2xl text-white">🎨 shadcn/ui Integrado</CardTitle>
            <CardDescription className="text-white/80">
              Los componentes de shadcn/ui están listos para usar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-white/90">
              Prueba estos componentes de ejemplo:
            </p>
            <div className="flex flex-wrap gap-3">
              <Button>Default Button</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            <p className="text-sm text-white/70 pt-2">
              Agrega más componentes con: <code className="px-2 py-1 bg-black/30 rounded text-sm">npx shadcn@latest add [component]</code>
            </p>
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-xl bg-red-500/20 backdrop-blur-sm p-6 border border-red-500/30">
            <p className="text-white">
              <strong>Nota:</strong> Configura tus variables de entorno para conectar con Supabase
            </p>
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row">
          <a
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-white px-6 text-purple-600 font-semibold transition-all hover:scale-105 hover:shadow-xl"
            href="https://supabase.com/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            📖 Documentación Supabase
          </a>
          <a
            className="flex h-14 w-full items-center justify-center rounded-full border-2 border-white/30 px-6 text-white font-semibold transition-all hover:bg-white/10 hover:border-white/50"
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            📚 Docs Next.js
          </a>
        </div>
      </main>
    </div>
  );
}
