import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";

export default async function LandingPage() {
  const { userId } = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header — black bar */}
      <header className="bg-primary">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-12 py-4">
          <div className="flex items-center gap-3">
            <span className="text-accent font-bold text-base">&gt;</span>
            <span className="text-primary-fg font-medium text-[15px]">
              cuentaclara
            </span>
          </div>
          <div className="flex items-center gap-6">
            {userId ? (
              <>
                <Link
                  href="/dashboard"
                  className="border border-muted-fg/30 px-5 py-2 text-xs text-primary-fg hover:border-accent hover:text-accent transition-colors"
                >
                  dashboard
                </Link>
                <UserButton appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
              </>
            ) : (
              <Link
                href="/sign-in"
                className="border border-muted-fg/30 px-5 py-2 text-xs text-primary-fg hover:border-accent hover:text-accent transition-colors"
              >
                iniciar sesion
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 items-center justify-center px-6">
        <div className="max-w-2xl text-center">
          <p className="text-muted-fg text-xs tracking-wider mb-6">
            ~/herramientas/estados-de-cuenta
          </p>
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl leading-tight uppercase"
              style={{ letterSpacing: "2px" }}>
            Estados de cuenta a Excel
          </h2>
          <p className="mt-8 text-[15px] text-muted-fg leading-relaxed max-w-lg mx-auto">
            Sube tu estado de cuenta bancario en PDF y descargalo como Excel
            listo para usar. Sin subir archivos a ningun servidor — todo se
            procesa en tu navegador.
          </p>

          {/* Bank badges — terminal style */}
          <div className="mt-8 flex flex-wrap justify-center gap-3 text-[11px]">
            <span className="border border-border px-4 py-2 text-muted-fg">
              BCP Personas
            </span>
            <span className="border border-border px-4 py-2 text-muted-fg">
              BCP Empresas
            </span>
            <span className="border border-border px-4 py-2 text-muted-fg/40">
              mas bancos pronto...
            </span>
          </div>

          {/* CTA */}
          <div className="mt-12">
            <Link
              href={userId ? "/dashboard" : "/sign-up"}
              className="inline-block bg-primary text-primary-fg px-10 py-3 text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              empezar gratis
            </Link>
          </div>

          {/* Privacy badge */}
          <div className="mt-6 flex items-center justify-center gap-2 text-accent text-xs font-semibold">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
            procesamiento 100% local
          </div>
        </div>
      </main>
    </div>
  );
}
