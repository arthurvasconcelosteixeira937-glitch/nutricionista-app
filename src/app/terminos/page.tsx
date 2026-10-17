import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";
import { PLAN } from "@/lib/billing";
import { formatMXN } from "@/lib/format";

export const metadata: Metadata = { title: "Términos y Condiciones" };

// RASCUNHO — precisa de revisão por advogado no México.
export default function TerminosPage() {
  return (
    <LegalShell title="Términos y Condiciones de Uso" updated="octubre de 2026">
      <p>
        Estos Términos regulan el uso de CobroSeguro, software ofrecido por <b>[RAZÓN SOCIAL]</b> (“CobroSeguro”). Al crear una
        cuenta aceptas estos Términos y el Aviso de Privacidad.
      </p>

      <h2>1. Qué es CobroSeguro</h2>
      <p>
        CobroSeguro es una herramienta de software que te permite crear cobros, enviarlos por WhatsApp y confirmar con Mercado
        Pago si un pago fue aprobado. <b>CobroSeguro no es una institución financiera, no es un agregador de pagos y no
        recibe, guarda ni transfiere dinero.</b> Los pagos los procesa Mercado Pago directamente en la cuenta del vendedor,
        bajo los términos de Mercado Pago.
      </p>

      <h2>2. Cuenta</h2>
      <ul>
        <li>Debes ser mayor de edad y dar información verdadera.</li>
        <li>Eres responsable de cuidar tu contraseña y de lo que se haga con tu cuenta.</li>
        <li>Debes conectar una cuenta de Mercado Pago México a tu nombre o de tu negocio.</li>
      </ul>

      <h2>3. Suscripción y prueba gratis</h2>
      <ul>
        <li>
          El plan cuesta {formatMXN(PLAN.priceMxn)} al mes (IVA incluido [CONFIRMAR]) y tiene {PLAN.trialDays} días de prueba
          gratis.
        </li>
        <li>Sin suscripción activa puedes ver tu panel e historial, pero no crear cobros nuevos.</li>
        <li>Puedes cancelar cuando quieras. No hay reembolsos por periodos parciales, salvo que la ley disponga otra cosa.</li>
        <li>Las comisiones de Mercado Pago son independientes y las cobra Mercado Pago.</li>
      </ul>

      <h2>4. Uso permitido</h2>
      <p>No puedes usar CobroSeguro para:</p>
      <ul>
        <li>Vender productos o servicios ilegales o prohibidos por Mercado Pago o por WhatsApp.</li>
        <li>Enviar mensajes no deseados (spam) o a personas que no son tus clientes.</li>
        <li>Engañar a terceros, suplantar identidades o intentar vulnerar la seguridad del sistema.</li>
      </ul>
      <p>Podemos suspender cuentas que incumplan estos Términos.</p>

      <h2>5. Confirmación de pagos</h2>
      <p>
        El estado “Pagado ✅” se muestra únicamente cuando Mercado Pago informa que un pago fue aprobado. Mercado Pago puede
        revertir pagos (por ejemplo, contracargos o reembolsos); en ese caso el estado del cobro cambiará. CobroSeguro no
        garantiza decisiones de Mercado Pago ni responde por ellas.
      </p>

      <h2>6. Disponibilidad y responsabilidad</h2>
      <p>
        Hacemos nuestro mejor esfuerzo para que el servicio funcione siempre, pero puede haber interrupciones, incluidas las de
        Mercado Pago o WhatsApp. En la medida permitida por la ley, la responsabilidad de CobroSeguro se limita al monto pagado
        por tu suscripción en los últimos 3 meses.
      </p>

      <h2>7. Cambios</h2>
      <p>Podemos actualizar estos Términos. Te avisaremos por correo o dentro del panel antes de que entren en vigor.</p>

      <h2>8. Ley aplicable</h2>
      <p>
        Estos Términos se rigen por las leyes de los Estados Unidos Mexicanos. Para cualquier controversia, las partes se
        someten a los tribunales de <b>[CIUDAD]</b>, sin perjuicio de los derechos que te otorga la Ley Federal de Protección al
        Consumidor.
      </p>

      <h2>9. Contacto</h2>
      <p>
        <b>[CORREO DE SOPORTE]</b>
      </p>
    </LegalShell>
  );
}
