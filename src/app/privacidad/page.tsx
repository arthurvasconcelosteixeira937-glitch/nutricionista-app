import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";

export const metadata: Metadata = { title: "Aviso de Privacidad" };

// RASCUNHO conforme a LFPDPPP (Lei Federal de Proteção de Dados Pessoais em Posse dos Particulares).
// Os campos entre [colchetes] precisam ser preenchidos pelo dono e revisados por advogado.
export default function PrivacidadPage() {
  return (
    <LegalShell title="Aviso de Privacidad Integral" updated="octubre de 2026">
      <p>
        <b>[RAZÓN SOCIAL O NOMBRE DEL RESPONSABLE]</b> (“CobroSeguro”), con domicilio en <b>[DOMICILIO COMPLETO]</b>, es el
        responsable del tratamiento de tus datos personales, conforme a la Ley Federal de Protección de Datos Personales en
        Posesión de los Particulares (LFPDPPP), su Reglamento y los Lineamientos del Aviso de Privacidad.
      </p>

      <h2>1. Datos personales que tratamos</h2>
      <p>De los vendedores (usuarios registrados):</p>
      <ul>
        <li>Datos de identificación y contacto: correo electrónico, nombre del negocio y número de WhatsApp.</li>
        <li>
          Datos de la conexión con Mercado Pago: identificador de usuario de Mercado Pago y credenciales de acceso (tokens)
          que Mercado Pago nos entrega cuando autorizas la conexión. Se guardan cifrados.
        </li>
        <li>Datos de uso: cobros creados, montos, estados de pago y registros técnicos (fecha, hora, dirección IP).</li>
      </ul>
      <p>De los clientes de los vendedores (que reciben un cobro):</p>
      <ul>
        <li>Nombre y número de WhatsApp, capturados por el vendedor, y los datos del cobro (concepto y monto).</li>
        <li>
          Estado del pago informado por Mercado Pago (aprobado, pendiente, etc.) y el folio de la operación. CobroSeguro
          <b> no recibe ni guarda</b> datos de tarjetas ni datos bancarios: esos los procesa directamente Mercado Pago.
        </li>
      </ul>
      <p>No tratamos datos personales sensibles.</p>

      <h2>2. Finalidades</h2>
      <p>Finalidades primarias (necesarias para el servicio):</p>
      <ul>
        <li>Crear tu cuenta, autenticarte y darte acceso al panel.</li>
        <li>Generar links de pago en tu cuenta de Mercado Pago y confirmar con Mercado Pago el estado de cada pago.</li>
        <li>Enviar mensajes por WhatsApp relacionados con los cobros: el cobro, recordatorios, avisos de pago y recibos.</li>
        <li>Mostrar la página pública de verificación del estado de un pago.</li>
        <li>Administrar tu suscripción, atender dudas y prevenir fraudes o usos indebidos.</li>
      </ul>
      <p>Finalidades secundarias (puedes negarte):</p>
      <ul>
        <li>Enviarte novedades y promociones de CobroSeguro.</li>
        <li>Elaborar estadísticas internas de uso.</li>
      </ul>
      <p>
        Si no quieres que tus datos se usen para las finalidades secundarias, escríbenos a <b>[CORREO DE PRIVACIDAD]</b>. Tu
        negativa no afecta el servicio.
      </p>

      <h2>3. Transferencias y encargados</h2>
      <p>Para prestar el servicio compartimos datos con:</p>
      <ul>
        <li>Mercado Pago (procesamiento de pagos en la cuenta del vendedor).</li>
        <li>Meta Platforms (WhatsApp Business) para el envío de mensajes.</li>
        <li>Proveedores de infraestructura en la nube (por ejemplo, Supabase y Vercel), que pueden estar fuera de México.</li>
      </ul>
      <p>
        Estas comunicaciones son necesarias para cumplir la relación contigo y no requieren tu consentimiento conforme al
        artículo 37 de la LFPDPPP. No vendemos tus datos personales.
      </p>

      <h2>4. Responsabilidad del vendedor sobre los datos de sus clientes</h2>
      <p>
        El vendedor es responsable de contar con autorización de sus clientes para capturar su nombre y WhatsApp y enviarles
        mensajes sobre sus compras. CobroSeguro actúa como encargado respecto de esos datos.
      </p>

      <h2>5. Derechos ARCO y revocación del consentimiento</h2>
      <p>
        Puedes Acceder, Rectificar, Cancelar u Oponerte al tratamiento de tus datos, así como revocar tu consentimiento o
        limitar su uso, enviando una solicitud a <b>[CORREO DE PRIVACIDAD]</b> con: tu nombre, correo de la cuenta, documento
        que acredite tu identidad, la descripción clara de lo que solicitas y cualquier dato que facilite localizar tu
        información. Responderemos en un máximo de 20 días hábiles y, si procede, lo haremos efectivo dentro de los 15 días
        hábiles siguientes.
      </p>

      <h2>6. Seguridad</h2>
      <p>
        Usamos medidas de seguridad administrativas, técnicas y físicas, como cifrado de las credenciales de Mercado Pago,
        controles de acceso por usuario y conexiones cifradas (HTTPS).
      </p>

      <h2>7. Cookies</h2>
      <p>
        Usamos cookies estrictamente necesarias para mantener tu sesión iniciada y proteger los procesos de conexión. No
        usamos cookies de publicidad dentro del panel.
      </p>

      <h2>8. Cambios a este aviso</h2>
      <p>Cualquier cambio a este Aviso de Privacidad se publicará en esta página.</p>

      <p>
        Si consideras que tu derecho a la protección de datos fue vulnerado, puedes acudir a la autoridad competente en
        materia de protección de datos personales en México.
      </p>
    </LegalShell>
  );
}
