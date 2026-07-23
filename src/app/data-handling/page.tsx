import Link from "next/link";
import { ArrowLeft, Database } from "lucide-react";

export const metadata = {
  title: "Tratamiento de Datos | Creatix CRM",
  description: "Política de Tratamiento de Datos Personales oficial de Creatix CRM y TICSOFT SAS.",
};

export default function DataHandlingPage() {
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
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Tratamiento de Datos Personales</h1>
              <p className="text-slate-400 text-xs mt-1">Última actualización: 23 de Julio de 2026</p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white">1. Marco Legal (Habeas Data)</h2>
              <p>
                La presente política regula la recolección, almacenamiento y uso de datos personales dentro de <strong>Creatix CRM</strong>, propiedad de <strong>TICSOFT SAS</strong>, en cumplimiento con el derecho constitucional al Habeas Data y las normas vigentes de protección de datos de los usuarios.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white">2. Roles en el Tratamiento de Datos</h2>
              <p>
                Es fundamental diferenciar la responsabilidad del uso de datos dentro de la plataforma:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>TICSOFT SAS como Encargado del Tratamiento:</strong> El Operador almacena y procesa técnicamente la base de datos comercial que el cliente carga o importa dentro de su entorno privado en el CRM, bajo estrictas directrices de seguridad y confidencialidad.</li>
                <li><strong>El Cliente como Responsable del Tratamiento:</strong> El usuario o empresa titular de la cuenta del CRM es el Responsable exclusivo de contar con la autorización legal correspondiente de sus contactos y prospectos comerciales antes de importarlos y enviarles correos electrónicos o campañas de mercadeo a través de la plataforma.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white">3. Deberes del Responsable (El Cliente)</h2>
              <p>
                Al utilizar el CRM para gestionar campañas de correos o administrar contactos, el cliente se obliga a:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Garantizar que los datos personales importados se hayan recolectado de forma lícita y con consentimiento expreso de sus titulares.</li>
                <li>Respetar la solicitud de exclusión voluntaria (desuscripción) de los contactos. Creatix CRM incorpora un enlace automático de desuscripción que bloquea el envío de correos posteriores al contacto que lo solicite.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white">4. Procedimiento para Consultas y Reclamos</h2>
              <p>
                Si usted es un usuario registrado en Creatix CRM o un contacto gestionado dentro de la plataforma y desea conocer, actualizar, rectificar o revocar su consentimiento para el tratamiento de su información, puede comunicarse con el canal centralizado de atención de TICSOFT SAS en el correo: <a href="mailto:ticsoft.gerencia@gmail.com" className="text-indigo-400 hover:text-indigo-300 underline font-medium">ticsoft.gerencia@gmail.com</a>.
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
