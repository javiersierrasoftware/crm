import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export const metadata = {
  title: "Política de Privacidad | Creatix CRM",
  description: "Política de Privacidad oficial de Creatix CRM y TICSOFT SAS.",
};

export default function PrivacyPage() {
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
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Política de Privacidad</h1>
              <p className="text-slate-400 text-xs mt-1">Última actualización: 23 de Julio de 2026</p>
            </div>
          </div>

          <div className="space-y-6 text-sm text-slate-300 leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white">1. Identificación del Responsable</h2>
              <p>
                El software y plataforma <strong>Creatix CRM</strong> es de propiedad y operación exclusiva de <strong>TICSOFT SAS</strong> (en adelante, &quot;el Operador&quot;). TICSOFT SAS se compromete a salvaguardar la privacidad de sus usuarios y a dar un manejo transparente a los datos personales de acuerdo con las legislaciones aplicables en materia de protección de datos.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white">2. Información Recolectada</h2>
              <p>
                Para el correcto funcionamiento de la plataforma, recabamos las siguientes categorías de información:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Datos de registro:</strong> Nombre, correo electrónico, contraseña (encriptada), teléfono y datos de la organización.</li>
                <li><strong>Datos del negocio:</strong> Contactos, empresas, embudos de venta y metadatos que decida cargar o importar en el software de forma autónoma.</li>
                <li><strong>Datos de pago:</strong> Transacciones realizadas mediante la pasarela de pagos Wompi (TICSOFT SAS no almacena directamente datos bancarios o números de tarjeta de crédito).</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white">3. Finalidad del Tratamiento</h2>
              <p>
                Los datos suministrados serán tratados con las siguientes finalidades:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Proveer la funcionalidad y servicios de administración y automatización comercial contratados.</li>
                <li>Verificar la autenticidad del registro de cuenta mediante confirmación por correo electrónico.</li>
                <li>Procesar cobros, renovaciones y facturaciones de los planes mensuales o anuales adquiridos.</li>
                <li>Enviar notificaciones técnicas, alertas de límites y actualizaciones del software.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white">4. Almacenamiento y Seguridad</h2>
              <p>
                Su información comercial y de contactos se almacena en servidores en la nube con altos estándares de seguridad física y lógica. TICSOFT SAS implementa encriptación de datos, protocolos SSL/TLS de transmisión segura y auditorías internas para prevenir el acceso no autorizado, alteración o filtración de la información de su tenant.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-base font-bold text-white">5. Derechos de los Titulares</h2>
              <p>
                Como usuario titular de la información, usted tiene derecho a conocer, actualizar, rectificar o solicitar la supresión de sus datos personales. Puede ejercer estos derechos en cualquier momento enviando una solicitud formal al correo de atención: <a href="mailto:ticsoft.gerencia@gmail.com" className="text-indigo-400 hover:text-indigo-300 underline font-medium">ticsoft.gerencia@gmail.com</a>.
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
