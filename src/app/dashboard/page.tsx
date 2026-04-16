import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { Processor } from "@/components/procesador";

export default async function DashboardPage() {
  const { userId } = await auth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header — black bar */}
      <header className="bg-primary">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-12 py-4">
          <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <span className="text-accent font-bold text-base">&gt;</span>
            <span className="text-primary-fg font-medium text-[15px]">
              cuentaclara
            </span>
          </a>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-accent rounded-none" />
              <span className="text-primary-fg text-xs font-medium">
                dashboard
              </span>
            </div>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                },
              }}
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-12 py-12">
        <Processor />
      </main>
    </div>
  );
}
