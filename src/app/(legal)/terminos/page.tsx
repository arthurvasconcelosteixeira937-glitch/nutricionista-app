import type { Metadata } from "next";
import { PRICE_LABEL, SUPPORT_URL, TRIAL_DAYS } from "@/lib/constants";

export const metadata: Metadata = { title: "Términos y Condiciones" };

export default function TermsPage() {
  return (
    <>
      <h1>Términos y Condiciones</h1>
      <p className="text-sm">Última actualización: 20 de octubre de 2026</p>

      <p>
        Bienvenido a Cóbralo. Al crear una cuenta o usar la aplicación, aceptas estos Términos y Condiciones. Si no estás de
        acuerdo, por favor no uses el servicio.
      </p>

      <h2>1. Qué es Cóbralo</h2>
      <p>
        Cóbralo es una herramienta para que trabajadores independientes anoten sus trabajos, lleven el control de lo que les
        deben y envíen recordatorios de pago a sus clientes por WhatsApp o SMS. Cóbralo no es un banco, no procesa pagos entre
        tú y tus clientes y nunca recibe ni guarda dinero en tu nombre.
      </p>

      <h2>2. Tu cuenta</h2>
      <ul>
        <li>Debes tener al menos 18 años y dar información verdadera.</li>
        <li>Eres responsable de mantener tu contraseña en secreto y de todo lo que pase en tu cuenta.</li>
        <li>Avísanos de inmediato si crees que alguien entró a tu cuenta sin permiso.</li>
      </ul>

      <h2>3. Prueba gratis y suscripción</h2>
      <ul>
        <li>Tienes una prueba gratis de {TRIAL_DAYS} días, sin necesidad de tarjeta.</li>
        <li>Después, el servicio cuesta {PRICE_LABEL} al mes, cobrado por adelantado mediante Stripe.</li>
        <li>La suscripción se renueva automáticamente cada mes hasta que la canceles.</li>
        <li>Puedes cancelar cuando quieras desde Ajustes. Mantendrás el acceso hasta el final del periodo pagado.</li>
        <li>No hacemos reembolsos por periodos parciales, salvo que la ley lo exija.</li>
        <li>Si la suscripción termina, tu cuenta queda bloqueada pero tus datos no se borran.</li>
      </ul>

      <h2>4. Uso correcto</h2>
      <p>Te comprometes a:</p>
      <ul>
        <li>Enviar mensajes solo a clientes con los que tienes una relación de trabajo real.</li>
        <li>No usar la app para acosar, amenazar, engañar o enviar spam.</li>
        <li>Cumplir las leyes aplicables de cobro de deudas, comunicaciones y protección al consumidor.</li>
        <li>No intentar dañar, copiar o acceder sin permiso a la aplicación o a datos de otros usuarios.</li>
      </ul>
      <p>
        Los mensajes se envían desde tu propio WhatsApp o teléfono. Tú eres responsable del contenido que envías y de tener
        permiso para contactar a tus clientes.
      </p>

      <h2>5. Tus datos</h2>
      <p>
        La información que guardas (clientes, trabajos, pagos) es tuya. Nosotros la tratamos según nuestra Política de
        Privacidad.
      </p>

      <h2>6. Disponibilidad</h2>
      <p>
        Trabajamos para que Cóbralo funcione siempre, pero no garantizamos que el servicio esté libre de errores o
        interrupciones. Podemos mejorar, cambiar o suspender funciones con aviso razonable.
      </p>

      <h2>7. Limitación de responsabilidad</h2>
      <p>
        Cóbralo se ofrece &quot;tal como está&quot;. En la máxima medida permitida por la ley, no somos responsables de pagos
        que tus clientes no hagan, de pérdidas indirectas, ni de daños mayores a lo que pagaste por el servicio en los últimos
        12 meses.
      </p>

      <h2>8. Cancelación de la cuenta</h2>
      <p>
        Puedes dejar de usar Cóbralo cuando quieras. Podemos suspender cuentas que incumplan estos términos. Si quieres que
        borremos tu cuenta y tus datos, escríbenos a soporte.
      </p>

      <h2>9. Cambios a estos términos</h2>
      <p>
        Podemos actualizar estos términos. Si los cambios son importantes, te avisaremos dentro de la app. Seguir usando
        Cóbralo significa que aceptas los nuevos términos.
      </p>

      <h2>10. Ley aplicable</h2>
      <p>Estos términos se rigen por las leyes de los Estados Unidos y del estado donde opera el proveedor del servicio.</p>

      <h2>11. Contacto</h2>
      <p>
        ¿Preguntas? Escríbenos por{" "}
        <a href={SUPPORT_URL} className="font-semibold text-brand underline" target="_blank" rel="noopener noreferrer">
          WhatsApp de soporte
        </a>
        .
      </p>
    </>
  );
}
