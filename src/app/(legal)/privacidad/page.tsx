import type { Metadata } from "next";
import { SUPPORT_URL } from "@/lib/constants";

export const metadata: Metadata = { title: "Política de Privacidad" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Política de Privacidad</h1>
      <p className="text-sm">Última actualización: 20 de octubre de 2026</p>

      <p>
        En Cóbralo cuidamos tu información. Esta política explica qué datos guardamos, para qué los usamos y cuáles son tus
        derechos.
      </p>

      <h2>1. Datos que guardamos</h2>
      <ul>
        <li>
          <strong>Tu cuenta:</strong> nombre, correo electrónico, nombre del negocio, tipo de servicio y zona horaria.
        </li>
        <li>
          <strong>Tus datos de pago:</strong> los usuarios de Zelle, Venmo o Cash App que decidas agregar para que aparezcan en
          tus mensajes.
        </li>
        <li>
          <strong>Tus clientes y trabajos:</strong> nombres, teléfonos, direcciones, notas, montos, fechas, pagos y el
          historial de recordatorios enviados.
        </li>
        <li>
          <strong>Suscripción:</strong> el pago lo procesa Stripe. Nosotros no vemos ni guardamos los números de tu tarjeta.
        </li>
      </ul>

      <h2>2. Para qué los usamos</h2>
      <ul>
        <li>Para que la app funcione: mostrar tus trabajos, preparar mensajes de cobro y generar recibos.</li>
        <li>Para manejar tu suscripción y darte soporte.</li>
        <li>Para mantener la seguridad del servicio y evitar abusos.</li>
      </ul>
      <p>
        <strong>No vendemos tus datos ni los de tus clientes.</strong> No enviamos mensajes a tus clientes: los mensajes salen
        desde tu propio WhatsApp o teléfono.
      </p>

      <h2>3. Con quién los compartimos</h2>
      <p>Solo con proveedores que necesitamos para operar el servicio:</p>
      <ul>
        <li>Supabase (base de datos y autenticación).</li>
        <li>Stripe (pagos de la suscripción).</li>
        <li>Nuestro proveedor de hosting.</li>
      </ul>
      <p>También podemos compartir información si la ley nos obliga.</p>

      <h2>4. Seguridad</h2>
      <p>
        Usamos conexiones cifradas (HTTPS) y reglas de seguridad en la base de datos para que cada usuario solo pueda ver su
        propia información. Ningún sistema es 100% seguro, pero trabajamos para proteger tus datos.
      </p>

      <h2>5. Cuánto tiempo los guardamos</h2>
      <p>
        Guardamos tus datos mientras tengas una cuenta, aunque tu suscripción termine, para que no pierdas nada si vuelves.
        Si pides borrar tu cuenta, eliminaremos tus datos en un plazo de 30 días, salvo lo que la ley nos obligue a conservar.
      </p>

      <h2>6. Tus derechos</h2>
      <p>
        Puedes pedir ver, corregir, descargar o borrar tus datos. Si vives en California u otro estado con leyes de
        privacidad, tienes los derechos que esas leyes te dan. Escríbenos y te responderemos.
      </p>

      <h2>7. Menores de edad</h2>
      <p>Cóbralo no está dirigido a menores de 18 años y no recopilamos sus datos a sabiendas.</p>

      <h2>8. Cambios</h2>
      <p>Si cambiamos esta política, publicaremos la nueva versión aquí y te avisaremos si el cambio es importante.</p>

      <h2>9. Contacto</h2>
      <p>
        Para cualquier pregunta sobre privacidad, escríbenos por{" "}
        <a href={SUPPORT_URL} className="font-semibold text-brand underline" target="_blank" rel="noopener noreferrer">
          WhatsApp de soporte
        </a>
        .
      </p>
    </>
  );
}
