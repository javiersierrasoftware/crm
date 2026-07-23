import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";

export const metadata = {
  title: "Términos y Condiciones | Creatix CRM",
  description: "Términos y Condiciones de uso oficiales de Creatix CRM y TICSOFT SAS.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500 selection:text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </Link>
          <span className="font-bold tracking-wider text-slate-200 text-sm">CREATIX CRM</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto px-6 py-12">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-8 md:p-12 shadow-2xl backdrop-blur-sm space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-6">
            <div className="w-10 h-10 bg-indigo-950/40 border border-indigo-900/60 rounded-xl flex items-center justify-center text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Términos y Condiciones</h1>
              <p className="text-slate-400 text-xs mt-1">Última actualización: 23 de Julio de 2026</p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white">1. Aceptación del Contrato</h2>
              <p>
                Al registrarse, acceder o utilizar la plataforma de software <strong>Creatix CRM</strong>, usted acepta y se obliga legalmente a cumplir con los presentes Términos y Condiciones. El servicio es prestado y operado por la sociedad <strong>TICSOFT SAS</strong>. Si usted no está de acuerdo con alguno de estos términos, no deberá acceder ni registrarse en el sistema.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white">2. Licencia de Uso y Planes de Suscripción</h2>
              <p>
                TICSOFT SAS otorga una licencia de uso limitada, no exclusiva, intransferible y revocable sobre el software Creatix CRM acorde al plan de suscripción seleccionado por el usuario:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Plan Gratis:</strong> Permite administrar hasta 10 empresas y 50 contactos. No incluye automatizaciones avanzadas de correo.</li>
                <li><strong>Plan Inicial (Mensual/Anual):</strong> Permite administrar hasta 5,000 empresas y 15,000 contactos. Su cobro se realiza según la periodicidad contratada.</li>
                <li><strong>Plan Profesional (Mensual/Anual):</strong> Permite administrar hasta 25,000 empresas y 100,000 contactos. Incluye soporte premium y automatizaciones sin restricciones.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white">3. Cobros, Facturación y Suspensión por Falta de Pago</h2>
              <p>
                Los pagos se procesan a través de la pasarela de pagos segura e integrada **Wompi**. Al elegir un plan de pago mensual o anual, usted acepta abonar los importes estipulados de forma anticipada.
              </p>
              <p>
                Si al cumplirse la fecha de vencimiento (`currentPeriodEnd`) no se registra la renovación del pago, el sistema **suspenderá automáticamente el acceso a la plataforma**, bloqueando las funciones comerciales mediante una pantalla de cobro (`UnpaidLockScreen`) hasta que se realice el pago correspondiente.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white">4. Propiedad de la Información Cargada</h2>
              <p>
                El usuario mantiene la propiedad exclusiva de los datos de clientes, contactos y oportunidades comerciales que cargue de forma manual o mediante importaciones CSV. TICSOFT SAS no asume responsabilidad alguna por la veracidad, calidad, legalidad o proveniencia de las bases de datos de terceros cargadas por los inquilinos (tenants) dentro de la plataforma.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white">5. Limitación de Responsabilidad</h2>
              <p>
                TICSOFT SAS provee el software &quot;tal como está&quot; (as is) y no garantiza que el servicio sea ininterrumpido o libre de errores. En ningún caso TICSOFT SAS será responsable por daños indirectos, pérdida de datos comerciales, lucro cesante o interrupción de negocios derivados del uso o de la imposibilidad de uso del software.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-[10px] text-slate-600">
        <span>&copy; 2026 TICSOFT SAS. Todos los derechos reservados.</span>
      </footer>
    </div>
  );
}
