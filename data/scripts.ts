export type WidgetType =
  | 'book-qual-call'      // Book qualification call calendar
  | 'book-sales-call'     // Book sales call calendar
  | 'reschedule-qual'     // Reschedule qual call
  | 'reschedule-sales'    // Reschedule sales call
  | 'send-4step-link'     // Send 4-step trigger link to lead
  | 'pay-zelle'           // Send Zelle payment info via WhatsApp
  | 'pay-paypal'          // Send PayPal payment info via WhatsApp
  | 'pay-binance'         // Send Binance payment info via WhatsApp

export type ScriptSection = {
  title: string
  content: string
  type: 'step' | 'branch' | 'voicemail' | 'note'
  widget?: WidgetType   // optional inline widget after content
}

export type OutcomeButton = {
  label: string
  action: 'appt_booked' | 'not_available' | 'not_interested' | 'wrong_number' | 'left_message' | 'hung_up' | 'confirmed' | 'reschedule' | 'no_show'
  color: 'green' | 'yellow' | 'red' | 'blue'
}

export type Script = {
  stepName: string
  callType: 'optin' | 'confirm' | 'qualification' | 'rebook' | 'sales' | 'followup'
  duration: string
  sections: ScriptSection[]
  answeredOutcomes: OutcomeButton[]
  notAnsweredOutcomes: OutcomeButton[]
}

export const PIPELINE_STEPS = [
  { key: 'opt-in-lead', label: 'Opt-in Lead' },
  { key: 'confirm-qual-48h', label: 'Confirm: Qual Call 48h' },
  { key: 'confirm-qual-24h', label: 'Confirm: Qual Call 24h' },
  { key: 'confirm-qual-dayoff', label: 'Confirm: Qual Call Day Off' },
  { key: 'qualification-call', label: 'Qualification Call' },
  { key: 'rebook-qual-call', label: 'Rebook Qual Call' },
  { key: 'qual-call-followup', label: 'Qual Call Follow Up' },
  { key: 'confirm-sales-48h', label: 'Confirm: Sales Call 48h' },
  { key: 'confirm-sales-24h', label: 'Confirm: Sales Call 24h' },
  { key: 'confirm-sales-dayoff', label: 'Confirm: Sales Call Day Off' },
  { key: 'sales-call', label: 'Sales Call' },
  { key: 'rebook-sales-call', label: 'Rebook Sales Call' },
  { key: 'sales-call-followup', label: 'Sales Call Follow Up' },
  { key: 'tea-students', label: 'TEA Students' },
]

export const SCRIPTS: Record<string, Script> = {

  // ─────────────────────────────────────────────────────────────
  'opt-in-lead': {
    stepName: 'Opt-in Lead',
    callType: 'optin',
    duration: '5 min',
    sections: [
      {
        type: 'step',
        title: '1. Apertura',
        content: '"Hola {Primer Nombre}... Hola {Primer Nombre}, soy Luis de Talk English Academy, ¿cómo estás hoy? ¡Genial! Te llamo porque el {Fecha de Registro} dejaste tu información en nuestro sitio para saber cómo hablar inglés con confianza en tu trabajo y tu vida diaria. Encontré un espacio en mi agenda para llamarte, así que quería saber — ¿sigues interesado en conocer cuál sería tu próximo paso?"\n\n→ Si dice NO → ir al paso 8',
      },
      {
        type: 'step',
        title: '2. Presentar el siguiente paso',
        content: '"{Primer Nombre}, tu siguiente paso es una llamada de consultoría gratuita de 15 minutos donde vemos cuál es tu nivel de inglés hoy, qué te ha estado frenando, y si el programa de mentoring 1:1 es el camino correcto para ti. ¿Te parece bien?"\n\n"Actualmente tenemos disponibilidad para unos pocos estudiantes más y luego cerramos inscripciones. Entonces {Primer Nombre}, agendemos tu llamada."\n\n→ Si dice NO → ir al paso 8',
      },
      {
        type: 'step',
        title: '3. Confirmar datos de contacto',
        content: '"Perfecto {Primer Nombre}, quiero confirmar que tengo tu información correcta."\n\na. "Tengo tu nombre como {Primer Nombre} {Apellido}, ¿es correcto?" (Si falta el apellido, pedirlo)\nb. "Tu correo es {Email}. ¿Es el que usas para mensajes importantes?" (Si no, actualizarlo)\nc. "Y el número al que te estoy llamando, ¿es en el que prefieres recibir llamadas?" OK, excelente.',
      },
      {
        type: 'step',
        title: '4. Agendar la cita',
        content: '"Entonces {Primer Nombre}, abramos tu agenda. Dime cuándo estás listo."\n\n(Esperar respuesta)\n\n"Como te comenté, es una llamada de solo 15 minutos, por WhatsApp o Google Meet, desde donde estés. ¿Te funciona mejor hoy o mañana? Tenemos disponibilidad el {Fecha} a las {Hora} o el {Fecha} a las {Hora}, ¿cuál prefieres?"',
        widget: 'book-qual-call',
      },
      {
        type: 'step',
        title: '5. Confirmar la cita',
        content: '"Perfecto. {Primer Nombre}, te agendo para el {Fecha} a las {Hora}. Te repito — {Fecha} a las {Hora}. Avísame cuando lo hayas anotado en tu agenda. ¿Podemos contar contigo para que estés puntual?"',
      },
      {
        type: 'step',
        title: '6. Correo de confirmación',
        content: '"Excelente {Primer Nombre}. Revisa tu bandeja de entrada y también la carpeta de spam — te va a llegar un correo de confirmación con los datos de la llamada y nuestro contacto directo de WhatsApp, ¿de acuerdo?"',
      },
      {
        type: 'step',
        title: '7. Cierre',
        content: '"Un gusto {Primer Nombre}, nos vemos en la llamada. ¡Hablamos pronto!"',
      },
      {
        type: 'branch',
        title: '8. Manejo del NO',
        content: '"No hay problema {Primer Nombre}. Si en algún momento decides que ya es el momento de hablar inglés con confianza — en el trabajo, con tu jefe, en tus reuniones — puedes regresar a nuestro sitio en TalkEnglishAcademy.com, te lo repito: TalkEnglishAcademy.com. También te van a llegar un par de mensajes que puedes guardar para cuando estés listo. Gracias por tu tiempo, ¡hasta luego!"',
      },
      {
        type: 'voicemail',
        title: '📱 Mensaje de Voz',
        content: '"Hola {Primer Nombre}, soy Luis de Talk English Academy.\n\nTe llamo porque el {Fecha de Registro} dejaste tu información en nuestro sitio para aprender a hablar inglés con confianza y usarlo para avanzar en tu trabajo y tu vida en Estados Unidos.\n\nPor favor escríbeme o devuélveme la llamada hoy a este número +1 689-280-9986 para confirmar que sigues interesado. Así puedo ayudarte a reservar tu plaza y agendar tu llamada de consultoría gratuita con nosotros.\n\nEspero poder hablar contigo pronto. ¡Hasta luego!"',
      },
    ],
    answeredOutcomes: [
      { label: 'Cita Agendada', action: 'appt_booked', color: 'green' },
      { label: 'No Disponible', action: 'not_available', color: 'yellow' },
      { label: 'No Interesado', action: 'not_interested', color: 'red' },
      { label: 'Número Equivocado', action: 'wrong_number', color: 'red' },
    ],
    notAnsweredOutcomes: [
      { label: 'Dejé Mensaje de Voz', action: 'left_message', color: 'yellow' },
      { label: 'Colgó', action: 'hung_up', color: 'red' },
      { label: 'Número Equivocado', action: 'wrong_number', color: 'red' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  'confirm-qual-48h': {
    stepName: 'Confirm: Qual Call 48h',
    callType: 'confirm',
    duration: '3 min',
    sections: [
      {
        type: 'step',
        title: '1. Apertura y confirmación de cita',
        content: '"¿Hola, hablo con {Primer Nombre}? Hola {Primer Nombre}, soy Luis de Talk English Academy, ¿cómo estás? ¡Genial! {Primer Nombre}, veo que tienes agendada una llamada con nosotros para el {Fecha de Cita} a las {Hora de Cita}. ¿Es correcto?"\n\n(Esperar respuesta)\n\n"¡OK genial! ¿Ya la tienes anotada en el calendario de tu teléfono, o dónde la guardaste para que no se te olvide?"\n\n(Esperar respuesta)\n\n"Perfecto. Un consejo que siempre les doy a todos: activa las notificaciones de tu calendario para que estés listo cuando te contacte por WhatsApp o Google Meet a esa hora. ¿OK?"',
      },
      {
        type: 'step',
        title: '2. Instrucciones si necesita reagendar',
        content: '"{Primer Nombre}, si por alguna razón no puedes estar en la llamada y necesitas cambiar el horario, por favor llámame, escríbeme por WhatsApp o dale clic al enlace en tu correo de confirmación para reagendar. De esa manera puedo darte otro espacio y poner a alguien más en el tuyo. ¿De acuerdo?"\n\n"Tenemos bastantes personas tratando de reservar su lugar para entrar al programa de mentoring 1:1 de Talk English Academy, así que de esa manera podemos acomodar a todos. ¿OK?"\n\n(Esperar respuesta)\n\n"¡OK genial!"',
      },
      {
        type: 'step',
        title: '3. Confirmar datos y compromiso',
        content: '"{Primer Nombre}, déjame confirmarte mi número de contacto. Avísame cuando estés listo para anotarlo."\n\n(Esperar respuesta)\n\n"Mi número de WhatsApp es +1 689-280-9986. ¿Lo tienes?... OK genial."\n\n"Ahora déjame confirmar tu correo. Aquí en el sistema tengo {Email}. ¿Está correcto?"\n\n(Esperar respuesta)\n\n"¡Perfecto! Y por último — ¿puedo contar contigo para que estés puntual, disponible y listo para tu llamada?"\n\n(Esperar respuesta)\n\n"¡Excelente!"',
      },
      {
        type: 'step',
        title: '4. Cierre',
        content: '"{Primer Nombre}, estamos muy contentos de hablar contigo pronto. ¡Hablamos en la llamada, hasta luego!"',
      },
      {
        type: 'branch',
        title: '🔄 Si necesita reagendar',
        content: '"{Primer Nombre}, avísame cuando tengas tu agenda abierta y lista."\n\n(Esperar respuesta)\n\n"OK {Primer Nombre}, recuerda que esta llamada es de solo 15 minutos. ¿Te queda mejor hoy o mañana? Tenemos disponible el {Día} a las {Hora} o el {Día} a las {Hora} — ¿cuál prefieres?"\n\n→ Confirmar nueva cita → enviar correo de confirmación → confirmar número de WhatsApp',
        widget: 'reschedule-qual',
      },
      {
        type: 'voicemail',
        title: '📱 Mensaje de Voz',
        content: '"Hola {Primer Nombre}, soy Luis de Talk English Academy.\n\nTe llamo para confirmar tu llamada de consultoría gratuita que tienes agendada para el {Fecha de Cita} a las {Hora de Cita}.\n\nPor favor devuélveme la llamada o escríbeme por WhatsApp hoy a este número: +1 689-280-9986, para confirmar que vas a estar en la llamada — o si necesitas cambiar el horario, también puedes hacerlo desde el enlace que te llegó al correo.\n\n¡Espero hablar contigo pronto! ¡Hasta luego!"',
      },
    ],
    answeredOutcomes: [
      { label: 'Confirmó Cita', action: 'confirmed', color: 'green' },
      { label: 'Necesita Reagendar', action: 'reschedule', color: 'yellow' },
      { label: 'No Disponible', action: 'not_available', color: 'yellow' },
      { label: 'Número Equivocado', action: 'wrong_number', color: 'red' },
    ],
    notAnsweredOutcomes: [
      { label: 'Dejé Mensaje de Voz', action: 'left_message', color: 'yellow' },
      { label: 'No Contestó', action: 'no_show', color: 'red' },
      { label: 'Número Equivocado', action: 'wrong_number', color: 'red' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  'confirm-qual-24h': {
    stepName: 'Confirm: Qual Call 24h',
    callType: 'confirm',
    duration: '3 min',
    sections: [
      {
        type: 'step',
        title: '1. Apertura y confirmación de cita',
        content: '"¿Hola, hablo con {Primer Nombre}? Hola {Primer Nombre}, soy Luis de Talk English Academy, ¿cómo estás? ¡Genial! {Primer Nombre}, veo que tienes una llamada agendada con nosotros para mañana, el {Fecha de Cita} a las {Hora de Cita}. ¿Es correcto?"\n\n(Esperar respuesta)\n\n"¡OK genial! ¿Ya la tienes en el calendario de tu teléfono, o dónde la tienes guardada para que no se te olvide?"\n\n(Esperar respuesta)\n\n"OK, un consejo que siempre les doy a todos: asegúrate de que tus notificaciones estén activadas para que estés listo cuando te contacte por WhatsApp o Google Meet. ¿OK?"',
      },
      {
        type: 'step',
        title: '2. Instrucciones si necesita reagendar',
        content: '"{Primer Nombre}, si por alguna razón no puedes estar en tu cita y necesitas un nuevo horario, por favor llámame, escríbeme por WhatsApp, o en tu correo de confirmación tienes un enlace para reagendar tu llamada. De esa manera puedo poner a alguien más en tu lugar y reprogramarte a ti. ¿OK?"\n\n"Tenemos muchas personas tratando de agendar su llamada con nosotros, así que de esa manera podemos acomodar a todos. ¿De acuerdo?"\n\n(Esperar respuesta)\n\n"¡OK genial!"',
      },
      {
        type: 'step',
        title: '3. Confirmar datos y compromiso',
        content: '"{Primer Nombre}, permíteme confirmarte mi número de contacto. Avísame cuando estés listo para anotarlo."\n\n(Esperar respuesta)\n\n"OK, mi número de WhatsApp es +1 689-280-9986, te lo repito: +1 689-280-9986. ¿Lo pudiste anotar? OK genial."\n\n"Permíteme también confirmar que tengo tu correo correcto. Aquí tengo {Email}. ¿Está correcto?"\n\n(Esperar respuesta)\n\n"OK genial. Y por último — ¿podemos contar contigo para que estés puntual y listo para tu llamada por WhatsApp o Google Meet mañana?"\n\n(Esperar respuesta)\n\n"¡OK genial!"',
      },
      {
        type: 'step',
        title: '4. Cierre',
        content: '"{Primer Nombre}, estamos muy contentos de hablar contigo mañana. ¡Hablamos pronto, hasta luego!"',
      },
      {
        type: 'branch',
        title: '🔄 Si necesita reagendar',
        content: '"{Primer Nombre}, avísame cuando tengas tu agenda abierta y lista."\n\n(Esperar respuesta)\n\n"OK {Primer Nombre}, recuerda que esta llamada es de solo 15 minutos. ¿Te queda mejor hoy o mañana? Tenemos disponible el {Día} a las {Hora} o el {Día} a las {Hora} — ¿cuál prefieres?"\n\n→ Confirmar nueva cita → correo de confirmación → confirmar número',
        widget: 'reschedule-qual',
      },
      {
        type: 'voicemail',
        title: '📱 Mensaje de Voz',
        content: '"Hola {Primer Nombre}, soy Luis de Talk English Academy.\n\nTe llamo para confirmar tu llamada de consultoría gratuita que tienes agendada para mañana, el {Fecha de Cita} a las {Hora de Cita}.\n\nPor favor devuélveme la llamada o escríbeme por WhatsApp hoy a este número: +1 689-280-9986, para confirmar que vas a estar — o también puedes responder "CONFIRMADO" al correo de confirmación que te enviamos.\n\nSi no lo encuentras, búscalo en el buzón de spam. ¡Espero poder hablar contigo mañana! ¡Hablamos pronto, hasta luego!"',
      },
    ],
    answeredOutcomes: [
      { label: 'Confirmó Cita', action: 'confirmed', color: 'green' },
      { label: 'Necesita Reagendar', action: 'reschedule', color: 'yellow' },
      { label: 'No Disponible', action: 'not_available', color: 'yellow' },
      { label: 'Número Equivocado', action: 'wrong_number', color: 'red' },
    ],
    notAnsweredOutcomes: [
      { label: 'Dejé Mensaje de Voz', action: 'left_message', color: 'yellow' },
      { label: 'No Contestó', action: 'no_show', color: 'red' },
      { label: 'Número Equivocado', action: 'wrong_number', color: 'red' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  'confirm-qual-dayoff': {
    stepName: 'Confirm: Qual Call Day Off',
    callType: 'confirm',
    duration: '2 min',
    sections: [
      {
        type: 'step',
        title: '1. Apertura y confirmación del día',
        content: '"¿Hola, hablo con {Primer Nombre}? Hola {Primer Nombre}, soy Luis de Talk English Academy. ¿Cómo va tu día? OK genial. Aquí bien rápido — hoy es el día de tu llamada a las {Hora de Cita} para hablar sobre cómo hablar inglés con confianza y usarlo para avanzar en tu trabajo y tu vida en Estados Unidos, y quería confirmar que vas a estar listo para esa llamada. ¿OK?"',
      },
      {
        type: 'step',
        title: '2. Preparación y compromiso',
        content: '"También asegúrate de tener papel y lápiz a la mano para que puedas tomar notas de nuestra llamada. ¿OK?"\n\n"{Primer Nombre}, ¿podemos contar contigo para que estés puntual y listo para tu llamada?"\n\n(Esperar respuesta)\n\n"¡OK genial! Te contactamos a esa hora por WhatsApp o Google Meet. ¡Hablamos luego, hasta pronto!"',
      },
      {
        type: 'branch',
        title: '🔄 Si necesita reagendar',
        content: '"{Primer Nombre}, avísame cuando tengas tu agenda abierta y lista."\n\n(Esperar respuesta)\n\n"OK {Primer Nombre}, recuerda que esta llamada es de solo 15 minutos. ¿Hoy más tarde o mañana te queda mejor? Tenemos disponible el {Día} a las {Hora} o el {Día} a las {Hora} — ¿cuál prefieres?"\n\n→ Confirmar nueva cita → correo de confirmación → confirmar número',
        widget: 'reschedule-qual',
      },
      {
        type: 'voicemail',
        title: '📱 Mensaje de Voz',
        content: '"Hola {Primer Nombre}, soy Luis de Talk English Academy.\n\nHoy es el día de tu llamada de consultoría gratuita a las {Hora de Cita}.\n\nPor favor devuélveme la llamada o escríbeme por WhatsApp a este número: +1 689-280-9986, para confirmar que vas a estar — o también puedes responder "CONFIRMADO" al correo de confirmación que te enviamos.\n\nSi no lo encuentras, búscalo en el buzón de spam. ¡Espero poder hablar contigo hoy! ¡Hablamos pronto, hasta luego!"',
      },
    ],
    answeredOutcomes: [
      { label: 'Confirmó Cita', action: 'confirmed', color: 'green' },
      { label: 'Necesita Reagendar', action: 'reschedule', color: 'yellow' },
      { label: 'No Disponible', action: 'not_available', color: 'yellow' },
      { label: 'Número Equivocado', action: 'wrong_number', color: 'red' },
    ],
    notAnsweredOutcomes: [
      { label: 'Dejé Mensaje de Voz', action: 'left_message', color: 'yellow' },
      { label: 'No Contestó', action: 'no_show', color: 'red' },
      { label: 'Número Equivocado', action: 'wrong_number', color: 'red' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  'qualification-call': {
    stepName: 'Qualification Call',
    callType: 'qualification',
    duration: '15 min',
    sections: [
      {
        type: 'step',
        title: '1. Introducción',
        content: '"¿Hola, hablo con {Primer Nombre}? Hola {Primer Nombre}, soy Luis de Talk English Academy. ¿Cómo estás hoy? ¡OK genial! Como ya sabes, te llamo por nuestra cita programada para hablar sobre el programa de mentoring 1:1. Yo estoy en {Tu Ciudad, Estado}. ¿Dónde te encuentras tú? OK, excelente. ¿Cuánto tiempo llevas viviendo allí? OK, entendido."',
      },
      {
        type: 'step',
        title: '2. Agradecimiento y Preparación',
        content: '"{Primer Nombre}, te agradezco por completar el cuestionario y por estar a tiempo. Ahora dime, ¿cómo te enteraste de nosotros? OK, excelente. Por favor avísame cuando tengas papel y bolígrafo listos para tomar notas y podemos comenzar. ¿OK? ¿Estás listo? OK, excelente."',
      },
      {
        type: 'step',
        title: '3. Descripción de la Llamada',
        content: '"{Primer Nombre}, esta llamada dura solo 15 minutos, y el propósito es conocerte y seguir un proceso de selección para ver si calificas para inscribirte en el programa. Nosotros invertimos mucho tiempo y atención en cada estudiante, así que solo trabajamos con personas que son serias, enseñables y están dispuestas a poner el trabajo. Antes de continuar, ¿eres una persona que está lista para tomar acción, comprometerse con el proceso y cambiar su situación con el inglés de una vez por todas? OK, excelente."',
      },
      {
        type: 'step',
        title: '4. Presentación del Programa y Fundador',
        content: '"{Primer Nombre}, Talk English Academy fue creado por Orlando Garrido, quien desarrolló este sistema después de ver a cientos de latinos vivir años en Estados Unidos sin poder avanzar por la barrera del inglés. El programa está diseñado específicamente para el latino que ya trabaja, ya tiene responsabilidades, y necesita resultados reales — no teoría.\n\nY no solo para quien trabaja — también para las madres y los padres que saben lo que significa crecer sin el idioma, y que no quieren que sus hijos pasen por lo mismo. Porque cuando un niño aprende inglés desde temprano, no solo aprende un idioma — abre una puerta que muchos adultos hoy desearían haber abierto antes. Eso también lo resolvemos aquí.\n\nY te digo algo — yo personalmente sé lo que abre el inglés cuando lo dominas desde joven: acceso a oportunidades de estudio que solo existen en inglés, conocimiento que no está traducido, mayor desarrollo personal, y una aceleración en prácticamente cualquier campo — laboral, académico o personal. Eso es exactamente lo que este programa le da a cada estudiante.\n\n¿Te puedo explicar brevemente cómo funciona el programa? OK genial."',
      },
      {
        type: 'step',
        title: '5. Las 4 Fases del Programa',
        content: '"{Primer Nombre}, el programa se divide en 4 fases a lo largo de 6 meses:\n\nLa Fase 1 — El Despertar: En las primeras 6 semanas entrenas tu oído, eliminas el bloqueo mental de traducir todo al español y tienes tu primera conversación real sin pánico.\n\nLa Fase 2 — El Desafío: De la semana 7 a la 16, rompes la barrera del silencio. Aquí es donde realmente te conviertes en bilingüe — hablas aunque no esté perfecto, y aprendes a recuperarte sin pánico cuando te trabas.\n\nLa Fase 3 — El Flujo: Semanas 17 a 22, el inglés empieza a fluir naturalmente. Dejas de pensar en español. Las respuestas salen solas. La gente empieza a notarte diferente.\n\nY la Fase 4 — El Dominio: Las últimas semanas las usamos para que el inglés trabaje para ti — pedir aumentos, hacer networking, hablar en público, avanzar en tu carrera.\n\nTodo esto con solo 45 minutos al día, 100% online, con tu propio mentor exclusivo. ¿OK?"',
      },
      {
        type: 'step',
        title: '6. Resultados e Impacto',
        content: '"{Primer Nombre}, nuestro sistema de mentoring personalizado ha transformado la vida de latinos en distintos estados de USA — desde trabajadores de planta que no podían comunicarse con su supervisor, hasta profesionales que hoy lideran equipos y negocian en inglés todos los días.\n\nPor eso tenemos un proceso de calificación — solo trabajamos con personas que van a seguir el sistema y comprometerse con el proceso. Eso nos permite garantizar resultados. ¿OK?"',
      },
      {
        type: 'step',
        title: '7. Preguntas de Calificación',
        content: '"Ahora {Primer Nombre}, vamos a revisar algunas preguntas de calificación sobre tu situación actual. ¿OK?"\n\n1. "¿A qué te dedicas actualmente y cuánto tiempo llevas en USA? OK."\n2. "¿Has tomado algún curso de inglés antes — clases, apps, institutos? Si es así, ¿qué pasó? OK, entendido."\n3. "{Primer Nombre}, ¿podrás asistir a tus sesiones de mentoring y completar las tareas asignadas de forma consistente, sin necesidad de que te estén persiguiendo? OK, excelente."\n4. "Hablar inglés con confianza requiere práctica diaria y salir de tu zona de cómodo — especialmente al principio. ¿Puedes comprometerte con 45 minutos al día durante 6 meses? OK, eso es genial."\n5. "Por último — el programa es 100% online, con sesiones de mentoring 1:1 semanales y talleres grupales. La mayoría de los estudiantes dedica entre 3 y 6 horas por semana. ¿Puedes hacerte responsable de ese compromiso? ¡OK, perfecto!"',
      },
      {
        type: 'step',
        title: '8. Información sobre la Inscripción',
        content: '"Y {Primer Nombre}, como mencionamos, solo permitimos un número limitado de estudiantes por mes — y basado en nuestra conversación, creo que serías un muy buen candidato.\n\nEn tu próxima cita vamos a inscribirte en Talk English Academy. Actualmente estamos ofreciendo un 25% de descuento sobre el precio regular, quedando en un solo pago de $1,980 por los 6 meses completos de mentoring.\n\nManejamos pagos digitales — Zelle, PayPal o Binance. ¿Con cuál de esas opciones te queda mejor para tu inscripción?"\n\n→ Si dice SÍ → continuar al paso 9\n→ Si dice que necesita pensar o no puede → ir al paso 14',
      },
      {
        type: 'step',
        title: '9. Portal de Miembros — 4 Pasos',
        content: '"{Primer Nombre}, anota esto, ¿estás listo? OK. Tu siguiente paso es iniciar sesión en el Portal de Miembros de Talk English Academy. Te he enviado el correo de acceso — revisa tu bandeja de entrada o la carpeta de spam. El asunto es \'Inicio de Sesión en el Portal de Miembros\'. Avísame cuando lo tengas abierto. ¿OK?"\n\n"OK {Primer Nombre}, haz clic en el enlace del correo, eso te llevará a la página de inicio de sesión. Tu correo ya está precargado — haz clic en iniciar sesión. Vas a ver los Pasos del 1 al 4. Avísame cuando los veas. ¿OK? OK, excelente. Anota también que necesitas completar los cuatro pasos antes de tu próxima cita — toman aproximadamente 30 minutos. ¿Tienes claro lo que necesitas hacer? OK, ¡excelente!"',
        widget: 'send-4step-link',
      },
      {
        type: 'step',
        title: '10. Programar la Próxima Cita',
        content: '"{Primer Nombre}, vamos a programar tu próxima cita. Para esa reunión necesitas estar en un lugar tranquilo, con papel y bolígrafo. ¿OK? Por favor toma tu calendario y avísame cuando estés listo. ¿OK?"',
      },
      {
        type: 'step',
        title: '11. Preferencias de Horario',
        content: '"{Primer Nombre}, ¿te queda mejor durante el día, la tarde o la noche? OK. Tengo disponibilidad el {Día} a las {Hora} o el {Día} a las {Hora} en tu zona horaria. ¿Cuál prefieres? ¡OK genial! Te anoto para el {Día} a las {Hora}. Avísame cuando termines de colocarlo en tu agenda. ¿OK?"',
        widget: 'book-sales-call',
      },
      {
        type: 'step',
        title: '12. Detalles de Confirmación',
        content: '"{Primer Nombre}, te va a llegar un correo y un mensaje de WhatsApp confirmando la fecha y hora de tu próxima cita. Por favor revisa tu bandeja de entrada y carpeta de spam. ¿OK? OK genial.\n\nSegún cómo avances con los primeros 4 pasos del Portal de Miembros, vamos a confirmar que eres una persona con la que podemos trabajar. Sigue las instrucciones y completa los pasos a tiempo. ¿De acuerdo? OK genial.\n\n{Primer Nombre}, ¿podemos contar contigo para estar listo? ¡Perfecto! También te llamaremos para confirmar tu cita. ¿OK? OK, excelente."',
      },
      {
        type: 'step',
        title: '13. Cierre',
        content: '"Genial {Primer Nombre}, estamos muy contentos de trabajar contigo. ¡Hablamos pronto, hasta luego!"',
      },
      {
        type: 'branch',
        title: '14. Si No Puede Inscribirse Hoy',
        content: '"{Primer Nombre}, entiendo perfectamente. Pero quiero ser directo contigo porque me importa tu resultado.\n\nLlevas tiempo en USA con el inglés frenándote — en el trabajo, en tus conversaciones, en las oportunidades que no estás tomando. Si hoy no haces un cambio, dentro de un año vas a estar exactamente en el mismo lugar. Y eso es lo que queremos evitar.\n\nLo que sí puedo hacer es reservar tu lugar por 48 horas mientras terminas de organizarte. Las plazas son limitadas y no podemos garantizar que el precio de hoy siga disponible después. ¿Qué necesitarías resolver para poder avanzar en las próximas 48 horas?"\n\n→ Escuchar y manejar objeción — si resuelve, volver al paso 8\n→ Si definitivamente no puede → paso 15',
      },
      {
        type: 'branch',
        title: '15. Cierre Digno — Si Definitivamente No',
        content: '"Está bien {Primer Nombre}, no hay problema. Hemos hablado sobre lo que el programa puede hacer por ti y sobre la inversión. La oportunidad va a seguir aquí cuando estés listo.\n\nCuando decidas que es el momento, escríbenos por WhatsApp o visita talkenglishaca.com/inicio y con gusto retomamos el proceso. Gracias por tu tiempo hoy, y espero poder trabajar contigo en el futuro. ¡Que tengas un gran día!"',
      },
      {
        type: 'voicemail',
        title: '📱 Mensaje de Voz — No Show',
        content: '"Hola {Primer Nombre}, soy Luis de Talk English Academy.\n\nTe llamo porque teníamos una cita confirmada hoy y no pudimos conectarnos. Por favor devuélveme la llamada o escríbeme por WhatsApp hoy a este número: +1 689-280-9986 para reagendar.\n\nMis espacios son limitados, así que, si de verdad estás listo para hablar inglés con confianza y dar el siguiente paso en tu carrera, por favor comunícate conmigo hoy.\n\nHablamos pronto, hasta luego."',
      },
    ],
    answeredOutcomes: [
      { label: 'Cita Sales Agendada', action: 'appt_booked', color: 'green' },
      { label: 'No Disponible', action: 'not_available', color: 'yellow' },
      { label: 'No Interesado', action: 'not_interested', color: 'red' },
      { label: 'Número Equivocado', action: 'wrong_number', color: 'red' },
    ],
    notAnsweredOutcomes: [
      { label: 'Dejé Mensaje de Voz', action: 'left_message', color: 'yellow' },
      { label: 'Colgó', action: 'hung_up', color: 'red' },
      { label: 'Número Equivocado', action: 'wrong_number', color: 'red' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  'rebook-qual-call': {
    stepName: 'Rebook Qual Call',
    callType: 'rebook',
    duration: '3 min',
    sections: [
      {
        type: 'step',
        title: '1. Apertura',
        content: '"¿Hola, hablo con {Primer Nombre}? Hola {Primer Nombre}, te habla Luis de Talk English Academy — ¿cómo estás hoy? ¡Genial! {Primer Nombre}, por la razón que sea no pudiste estar en tu cita el {Fecha de Cita} a las {Hora de Cita}, lo cual no es ningún problema. Te llamo para reagendarla. ¿Tienes un momento para hacerlo ahora?"\n\n→ Si dice NO → ir al paso 2\n→ Si dice SÍ → ir al paso 3',
      },
      {
        type: 'branch',
        title: '2. Si no tiene un momento',
        content: '"No hay problema {Primer Nombre}, ¿cuándo tendría un momento para que te llame y agendemos tu cita?"\n\n(Anotar fecha y hora — llamar de vuelta)',
      },
      {
        type: 'step',
        title: '3. Abrir agenda',
        content: '"{Primer Nombre}, avísame cuando tengas tu agenda abierta y lista."\n\n(Esperar respuesta)\n\n"OK {Primer Nombre}, recuerda que esta llamada es de solo 15 minutos. ¿Hoy o mañana te queda mejor? Tenemos disponible el {Día} a las {Hora} o el {Día} a las {Hora} — ¿cuál prefieres?"\n\n(Esperar respuesta)',
        widget: 'reschedule-qual',
      },
      {
        type: 'step',
        title: '4. Confirmar nueva cita',
        content: '"OK, excelente. {Primer Nombre}, te voy a agendar para el {Día} a las {Hora}. Nuevamente — el {Día} a las {Hora}. Avísame cuando termines de anotarlo en tu agenda. ¿OK? OK, excelente."',
      },
      {
        type: 'step',
        title: '5. Correo de confirmación',
        content: '"{Primer Nombre}, por favor revisa tu bandeja de entrada y también el buzón de spam para encontrar el correo de confirmación de tu nueva cita. ¿OK?"',
      },
      {
        type: 'step',
        title: '6. Confirmar número y cierre',
        content: '"Por último, déjame confirmarte mi número de WhatsApp de nuevo. Avísame cuando estés listo para anotarlo. Es +1 689-280-9986 — de nuevo: +1 689-280-9986. ¿Me lo puedes repetir para confirmar? ¡OK genial!"\n\n"{Primer Nombre}, estamos muy contentos de poder hablar contigo pronto. ¡Hablamos pronto, hasta luego!"',
      },
      {
        type: 'voicemail',
        title: '📱 Mensaje de Voz',
        content: '"Hola {Primer Nombre}, soy Luis de Talk English Academy.\n\nTe llamo para reagendar tu llamada de consultoría gratuita que teníamos programada. Por favor devuélveme la llamada hoy a este número: +1 689-280-9986 — o también puedes darle clic al enlace en tu correo electrónico para reagendar directamente.\n\nLo que sí quiero que sepas es que los espacios para la llamada de calificación son limitados — solo trabajamos con un número determinado de estudiantes por mes.\n\nAsí que si de verdad estás listo para hablar inglés con confianza y dar el siguiente paso en tu trabajo y tu vida en Estados Unidos, devuélveme la llamada hoy a este número: +1 689-280-9986.\n\nEspero poder hablar contigo pronto. ¡Hasta luego!"',
      },
    ],
    answeredOutcomes: [
      { label: 'Reagendó Cita', action: 'reschedule', color: 'green' },
      { label: 'No Disponible', action: 'not_available', color: 'yellow' },
      { label: 'No Interesado', action: 'not_interested', color: 'red' },
      { label: 'Número Equivocado', action: 'wrong_number', color: 'red' },
    ],
    notAnsweredOutcomes: [
      { label: 'Dejé Mensaje de Voz', action: 'left_message', color: 'yellow' },
      { label: 'No Contestó', action: 'no_show', color: 'red' },
      { label: 'Número Equivocado', action: 'wrong_number', color: 'red' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  'confirm-sales-48h': {
    stepName: 'Confirm: Sales Call 48h',
    callType: 'confirm',
    duration: '3 min',
    sections: [
      {
        type: 'step',
        title: '1. Apertura y confirmación de cita',
        content: '"¿Hola, hablo con {Primer Nombre}? Hola {Primer Nombre}, soy Luis de Talk English Academy, ¿cómo estás hoy? ¡Genial! {Primer Nombre}, te llamo para confirmar tu cita el {Fecha de Cita} a las {Hora de Cita}. ¿Es correcto? OK genial. ¿Ya la tienes guardada en el calendario de tu teléfono, o dónde la tienes para no olvidarla?"\n\n(Esperar respuesta)\n\n"Asegúrate de tener las notificaciones activadas para que estés disponible cuando te contactemos por WhatsApp o Google Meet. ¿OK?"',
      },
      {
        type: 'note',
        title: '⚠️ Estado del Portal de Miembros',
        content: 'Si completó los 4 pasos: "Noté que ya completaste los cuatro pasos en el Portal de Miembros de Talk English Academy — ¡excelente trabajo! Eso habla muy bien de ti."\n\nSi NO ha completado los 4 pasos: "Noté que vas por el paso {Número}. {Primer Nombre}, ¿podemos contar contigo para completar los pasos restantes antes de tu cita? ¡OK, excelente!"',
      },
      {
        type: 'step',
        title: '2. Instrucciones si necesita reagendar',
        content: '"OK, siguiente — {Primer Nombre}, si por alguna razón necesitas reprogramar tu cita, por favor llámame, escríbeme por WhatsApp, o haz clic en el enlace de tu correo de confirmación. De esa manera puedo asignar tu lugar a otra persona y reagendarte a ti.\n\nEso sí — con muchas personas tratando de entrar a nuestro calendario, puede ser difícil volver a conseguir un espacio disponible. Así que si puedes estar, mantén tu cita. ¿OK?"',
      },
      {
        type: 'step',
        title: '3. Confirmar datos y compromiso',
        content: '"OK {Primer Nombre}, déjame confirmarte mi número de WhatsApp. Avísame cuando estés listo para anotarlo. Mi número es +1 689-280-9986 — te lo repito: +1 689-280-9986. ¿Lo anotaste? OK, excelente.\n\nDéjame también confirmar tu correo. Aquí tengo {Email}. ¿Está correcto?"\n\n(Esperar respuesta — corregir si es necesario)\n\n"OK, excelente. Y por último — ¿podemos contar contigo para haber completado los cuatro pasos del Portal y estar listo para tu llamada por WhatsApp o Google Meet? OK, perfecto."',
      },
      {
        type: 'step',
        title: '4. Cierre',
        content: '"{Primer Nombre}, mañana te contactaré para revisar tu progreso con los pasos y confirmar nuevamente tu cita. ¡Hablamos entonces, hasta luego!"',
      },
      {
        type: 'branch',
        title: '🔄 Si necesita reagendar',
        content: '"OK {Primer Nombre}, no hay problema — dime cuándo tienes disponibilidad."\n\n(Esperar respuesta)\n\n"OK, y {Primer Nombre}, recuerda que esta llamada dura solo 20 minutos. ¿Te funciona mejor más tarde hoy o mañana? Tenemos disponible el {Día} a las {Hora} o el {Día} a las {Hora} — ¿cuál prefieres?"\n\n→ Confirmar nueva cita → correo + Portal → mañana confirmar',
        widget: 'reschedule-sales',
      },
      {
        type: 'voicemail',
        title: '📱 Mensaje de Voz',
        content: '"Hola {Primer Nombre}, soy Luis de Talk English Academy.\n\nTe llamo para confirmar la cita que tienes agendada para el {Fecha de Cita} a las {Hora de Cita}. Será una llamada por WhatsApp o Google Meet y quiero verificar que tengas toda la información.\n\nPor favor devuélveme la llamada o escríbeme por WhatsApp hoy a este número: +1 689-280-9986 — te lo repito: +1 689-280-9986 — para confirmar. También puedes responder "CONFIRMADO" al correo que tienes en tu bandeja de entrada o carpeta de spam.\n\nQuedo atento. ¡Hablamos pronto, hasta luego!"',
      },
    ],
    answeredOutcomes: [
      { label: 'Confirmó Cita', action: 'confirmed', color: 'green' },
      { label: 'Necesita Reagendar', action: 'reschedule', color: 'yellow' },
      { label: 'No Disponible', action: 'not_available', color: 'yellow' },
      { label: 'Número Equivocado', action: 'wrong_number', color: 'red' },
    ],
    notAnsweredOutcomes: [
      { label: 'Dejé Mensaje de Voz', action: 'left_message', color: 'yellow' },
      { label: 'No Contestó', action: 'no_show', color: 'red' },
      { label: 'Número Equivocado', action: 'wrong_number', color: 'red' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  'confirm-sales-24h': {
    stepName: 'Confirm: Sales Call 24h',
    callType: 'confirm',
    duration: '2 min',
    sections: [
      {
        type: 'step',
        title: '1. Apertura rápida',
        content: '"¿Hola, hablo con {Primer Nombre}? Hola {Primer Nombre}, soy Luis de Talk English Academy, ¿cómo va tu día? ¡Genial! Te hago una llamada rápida para reconfirmar que estarás listo para tu cita de mañana a las {Hora de Cita}."',
      },
      {
        type: 'note',
        title: '⚠️ Estado del Portal',
        content: 'Si completó los 4 pasos: "Noté que ya completaste los cuatro pasos en el Portal de Miembros — ¡buen trabajo! Eso es exactamente lo que queremos ver."\n\nSi NO ha completado los 4 pasos: "Noté que vas por el paso {Número}. {Primer Nombre}, ¿podemos contar contigo para terminar los pasos restantes antes de la cita de mañana? ¡OK, excelente!"',
      },
      {
        type: 'step',
        title: '2. Urgencia y confirmación',
        content: '"Y {Primer Nombre}, por cierto — tenemos muchas personas tratando de agendar con nosotros, así que por favor asegúrate de no faltar, ya que puede ser difícil conseguir otro espacio disponible. ¿OK? OK genial.\n\nY si aún no lo has hecho, responde "CONFIRMADO" al correo o al mensaje de WhatsApp que te enviamos. ¿OK?"',
      },
      {
        type: 'step',
        title: '3. Cierre',
        content: '"Perfecto {Primer Nombre}, mañana te contacto para confirmar tu cita y que los 4 pasos del Portal estén completos antes de tu llamada. ¡Excelente día, hasta mañana!"',
      },
      {
        type: 'branch',
        title: '🔄 Si necesita reagendar',
        content: '"OK {Primer Nombre}, no hay problema — dime cuándo tienes disponibilidad."\n\n(Esperar respuesta)\n\n"OK, y {Primer Nombre}, recuerda que esta llamada dura solo 20 minutos. ¿Te funciona mejor más tarde hoy o mañana? Tenemos disponible el {Día} a las {Hora} o el {Día} a las {Hora} — ¿cuál prefieres?"\n\n"Entonces {Primer Nombre}, revisa tu bandeja de entrada y la carpeta de spam para encontrar el correo de confirmación y responde "CONFIRMADO". ¿OK?\n\nY por último — por favor asegúrate de haber iniciado sesión en el Portal de Miembros y haber completado los cuatro pasos antes de tu cita. ¿OK? OK, perfecto."\n\n"{Primer Nombre}, mañana te contacto nuevamente para confirmar tu cita y que los 4 pasos del Portal estén completos antes de la llamada. ¡Excelente día, hasta mañana!"',
        widget: 'reschedule-sales',
      },
      {
        type: 'voicemail',
        title: '📱 Mensaje de Voz',
        content: '"Hola {Primer Nombre}, soy Luis de Talk English Academy.\n\nTe llamo para confirmar la cita que tienes agendada para mañana, {Fecha de Cita} a las {Hora de Cita}. Recuerda que será por WhatsApp o Google Meet — quiero verificar que tengas toda la información.\n\nPor favor devuélveme la llamada o escríbeme por WhatsApp hoy a este número: +1 689-280-9986 — te lo repito: +1 689-280-9986 — para confirmar. También puedes responder "CONFIRMADO" al correo que tienes en tu bandeja de entrada o carpeta de spam.\n\nQuedo atento. ¡Hablamos pronto, hasta luego!"',
      },
    ],
    answeredOutcomes: [
      { label: 'Confirmó Cita', action: 'confirmed', color: 'green' },
      { label: 'Necesita Reagendar', action: 'reschedule', color: 'yellow' },
      { label: 'No Disponible', action: 'not_available', color: 'yellow' },
      { label: 'Número Equivocado', action: 'wrong_number', color: 'red' },
    ],
    notAnsweredOutcomes: [
      { label: 'Dejé Mensaje de Voz', action: 'left_message', color: 'yellow' },
      { label: 'No Contestó', action: 'no_show', color: 'red' },
      { label: 'Número Equivocado', action: 'wrong_number', color: 'red' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  'confirm-sales-dayoff': {
    stepName: 'Confirm: Sales Call Day Off',
    callType: 'confirm',
    duration: '2 min',
    sections: [
      {
        type: 'step',
        title: '1. Apertura del día',
        content: '"¿Hola, hablo con {Primer Nombre}? Hola {Primer Nombre}, soy Luis de Talk English Academy. ¿Cómo va tu día? OK, excelente. Aquí bien breve — hoy es el día de tu cita a las {Hora de Cita} y quería confirmar que estarás listo para tu llamada por WhatsApp o Google Meet. ¿OK? OK genial. ¡Me encantará saber cómo te fue, hasta luego!"',
      },
      {
        type: 'note',
        title: '⚠️ Nota Interna',
        content: 'Si los 4 pasos del Portal de Miembros no están completos, confirmar con el lead que los terminará antes de la llamada. Si definitivamente no puede — reagendar.',
      },
      {
        type: 'branch',
        title: '🔄 Si necesita reagendar',
        content: '"OK {Primer Nombre}, no hay problema — dime cuándo tienes disponibilidad."\n\n(Esperar respuesta)\n\n"OK {Primer Nombre}, recuerda que esta llamada dura solo 20 minutos. ¿Te funciona mejor más tarde hoy o mañana? Tenemos disponible el {Día} a las {Hora} o el {Día} a las {Hora} — ¿cuál prefieres?"\n\n"{Primer Nombre}, te estoy agendando para el {Día} a las {Hora}. Te repito — el {Día} a las {Hora}. Avísame cuando lo hayas anotado en tu agenda. ¿OK? OK genial."\n\n"Y {Primer Nombre}, revisa tu bandeja de entrada y la carpeta de spam para encontrar el correo de confirmación y responde "CONFIRMADO". ¿OK?\n\nY por último — por favor asegúrate de haber iniciado sesión en el Portal de Miembros y haber completado los cuatro pasos antes de tu cita. ¿OK? OK, perfecto."\n\n"{Primer Nombre}, te contactaré el {Día acordado} para confirmar tu cita y que los cuatro pasos estén completos antes de la llamada. ¡Espero hablar contigo entonces, hasta luego!"',
        widget: 'reschedule-sales',
      },
      {
        type: 'voicemail',
        title: '📱 Mensaje de Voz',
        content: '"Hola {Primer Nombre}, soy Luis de Talk English Academy.\n\nTe llamo para confirmar la cita que tienes agendada para hoy a las {Hora de Cita}. Recuerda que será por WhatsApp o Google Meet — quiero verificar que tengas toda la información.\n\nPor favor devuélveme la llamada o escríbeme por WhatsApp hoy a este número: +1 689-280-9986 — te lo repito: +1 689-280-9986 — para confirmar. También puedes responder "CONFIRMADO" al correo que tienes en tu bandeja de entrada o carpeta de spam.\n\nQuedo atento. ¡Hablamos pronto, hasta luego!"',
      },
    ],
    answeredOutcomes: [
      { label: 'Confirmó Cita', action: 'confirmed', color: 'green' },
      { label: 'Necesita Reagendar', action: 'reschedule', color: 'yellow' },
      { label: 'No Disponible', action: 'not_available', color: 'yellow' },
      { label: 'Número Equivocado', action: 'wrong_number', color: 'red' },
    ],
    notAnsweredOutcomes: [
      { label: 'Dejé Mensaje de Voz', action: 'left_message', color: 'yellow' },
      { label: 'No Contestó', action: 'no_show', color: 'red' },
      { label: 'Número Equivocado', action: 'wrong_number', color: 'red' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  'sales-call': {
    stepName: 'Sales Call',
    callType: 'sales',
    duration: '20 min',
    sections: [
      {
        type: 'step',
        title: '1. Introducción',
        content: '"¿Hola, hablo con {Primer Nombre}? Hola {Primer Nombre}, soy Luis de Talk English Academy. ¿Cómo estás hoy? ¡Genial! Como sabes, te llamo para nuestra cita programada sobre el programa de mentoring 1:1."',
      },
      {
        type: 'step',
        title: '2. Día de Inscripción',
        content: '"{Primer Nombre}, esta llamada va a ser emocionante porque es el día de tu inscripción — el comienzo de algo que va a cambiar cómo te desenvuelves en el trabajo y en tu vida diaria aquí en Estados Unidos. Avísame cuando tengas papel y lápiz listos para tomar notas y comenzamos. ¿OK?"',
      },
      {
        type: 'step',
        title: '3. Reconocimiento',
        content: '"OK {Primer Nombre}, excelente trabajo completando los 4 pasos del Portal de Miembros, incluyendo enviar tu solicitud. Haber llegado hasta aquí en el proceso nos dice que eres alguien que sigue instrucciones, toma acción y está listo para hacer un cambio real. Nuevamente — excelente trabajo."',
      },
      {
        type: 'step',
        title: '4. Resumen de la Llamada',
        content: '"{Primer Nombre}, esta llamada durará aproximadamente 20 minutos. Vamos a revisar algunas de las respuestas que diste en tu solicitud, hablar sobre lo que incluye el programa y completar tu inscripción en Talk English Academy. ¿OK? OK genial."',
      },
      {
        type: 'step',
        title: '5. Historia y Conexión Personal',
        content: '"{Primer Nombre}, quiero compartir algo contigo antes de continuar. Yo sé de primera mano lo que abre el inglés cuando lo dominas — el acceso a conocimiento que solo existe en inglés, a oportunidades de estudio y crecimiento que están fuera del alcance de quien no habla el idioma, y una aceleración en prácticamente cualquier área — laboral, académica o personal.\n\nTalk English Academy fue creado por Orlando Garrido, precisamente después de ver a cientos de latinos vivir años en Estados Unidos sin poder avanzar por esa barrera, y ver la cantidad de oportunidades que se le abrían gracias al manejo del idioma. Este programa existe para cerrar esa brecha — de forma personalizada, estructurada y con resultados reales.\n\nY lo que es poderoso — una vez que completes el programa y llegues al nivel de dominio, tendrás el privilegio de seguir contando con el respaldo del equipo de Talk English Academy para lo que necesites después. Si tú demuestras el compromiso, nosotros ponemos el sistema. ¿OK?"',
      },
      {
        type: 'step',
        title: '6. Revisión del Programa',
        content: '"a. {Primer Nombre}, como pudiste ver en el Portal de Miembros, hablar inglés con confianza es hoy una de las habilidades más demandadas para el latino en Estados Unidos. La diferencia salarial entre quien habla inglés y quien no puede estar entre $10,000 y $25,000 al año. En 5 años, eso son $50,000 que se quedan sobre la mesa.\n\nb. Anota estos datos, ¿OK? El mercado laboral estadounidense sigue creciendo en sectores donde el inglés es requisito mínimo para ascender. Y cada vez más latinos están tomando posiciones de liderazgo — pero solo los que dan el paso a tiempo.\n\nc. Talk English Academy es el sistema de mentoring 1:1 más personalizado disponible en español para latinos en USA. Aquí no hay clases grabadas que nadie termina — hay un mentor exclusivo que conoce tu voz, tus errores, tu trabajo y tus metas.\n\nd. OK, {Primer Nombre}, leí tu solicitud. Indicaste que tu objetivo a corto plazo es {Objetivo Corto Plazo} y a largo plazo es {Objetivo Largo Plazo}. ¿Es correcto? OK — alcanzar esos objetivos no será un problema con el sistema correcto. Sin embargo, necesitarás comprometerte con el proceso sin excusas. ¿Puedes hacer eso? OK, excelente.\n\ne. {Primer Nombre}, para hablar inglés con fluidez necesitas también trabajar tu mentalidad. El bloqueo mental es la razón número uno por la que los latinos que saben gramática todavía no pueden hablar. Aquí trabajamos eso desde el día uno. Nuestros estudiantes también se comprometen a practicar al menos 45 minutos diarios fuera de sus sesiones. ¿Ya tienes ese hábito, o sería algo nuevo para ti? OK, excelente.\n\nf. {Primer Nombre}, como viste en el Portal, el programa se desarrolla en 4 fases:\nFase 1 — El Despertar: entrenas tu oído y tienes tu primera conversación real sin pánico.\nFase 2 — El Desafío: rompes la barrera del silencio y te conviertes en bilingüe.\nFase 3 — El Flujo: el inglés empieza a salir naturalmente, sin traducción mental.\nFase 4 — El Dominio: usas el inglés para pedir aumentos, liderar proyectos y avanzar tu carrera."',
      },
      {
        type: 'step',
        title: '7. Compromiso Final',
        content: '"{Primer Nombre}, queremos verte tener éxito y completar las 4 fases del programa. Antes de continuar, necesito un compromiso final de tu parte: ¿vas a tomártelo en serio, ser enseñable y estar dispuesto a poner el trabajo — los 45 minutos diarios, las sesiones, las tareas — y nosotros nos encargamos del resto? ¿Tienes ese compromiso? OK, excelente."',
      },
      {
        type: 'step',
        title: '8. Proceso de Inscripción — Opciones de Pago',
        content: '"{Primer Nombre}, avancemos con tu inscripción en Talk English Academy. La inversión para los 6 meses completos del programa queda en un solo pago de $1,980 — con el 25% de descuento que tenemos activo ahora mismo.\n\nEn tu solicitud seleccionaste {Método de Pago del Portal} — adelante, toma tu teléfono y avísame cuando estés listo para procesar el pago."\n\n→ Si dice SÍ al pago único → ir al paso 9\n→ Si necesita otra opción → paso 8b\n\n8b. Plan de 2 pagos: "{Primer Nombre}, también tenemos un plan de dos pagos — $1,089 hoy y el segundo pago 30 días después. Adelante, toma tu teléfono y avísame cuando estés listo."\n→ Si dice SÍ → ir al paso 9 | Si no → paso 8c\n\n8c. Plan de 3 pagos: "También tenemos un plan de tres pagos — $799 hoy y dos pagos más, uno cada 30 días. ¿Lo procesas por {Método de Pago} o prefieres {Método alternativo}?"\n→ Si dice SÍ → ir al paso 9 | Si no → paso 8d\n\n8d. Plan de 6 pagos — último recurso: "{Primer Nombre}, la última opción que tenemos disponible es el plan de seis pagos de $440 — uno por cada mes del programa. ¿Lo procesas por {Método de Pago} o prefieres {Método alternativo}?"\n→ Si dice SÍ → ir al paso 9 | Si definitivamente no → paso 11',
      },
      {
        type: 'step',
        title: '9. Proceso de Pago',
        content: '"{Primer Nombre}, adelante — ¿estás frente a tu teléfono o computadora para procesar el pago? Avísame cuando estés listo."\n\n(Esperar respuesta)\n\nUna vez que lo proceses, por favor envíame una captura de pantalla de la confirmación por WhatsApp. En cuanto la reciba te doy acceso inmediato al Portal de Miembros. ¿Tienes alguna duda sobre el proceso de pago antes de que avancemos?"',
        widget: 'pay-zelle',
      },
      {
        type: 'step',
        title: '10. Felicitaciones y Próximos Pasos',
        content: '"a. {Primer Nombre}, ¡felicidades, estás inscrito en Talk English Academy! ¿Estás emocionado? Yo también lo estoy. ¡Bienvenido al programa!"\n\n"b. OK, anota tus próximos pasos. ¿Estás listo? Vas a iniciar sesión nuevamente en el Portal de Miembros de Talk English Academy. Te he enviado un correo con el enlace — revisa tu bandeja de entrada y carpeta de spam. ¿OK?"\n\n"c. Genial {Primer Nombre}. Una vez adentro vas a poder hacer dos cosas importantes: primero, escoger tu horario de clases semanales — de lunes a viernes — el que mejor se acomode a tu vida y trabajo. Y segundo, escoger tu propio profesor. En tu primera sesión, el profesor evaluará tu nivel exacto y diseñará tu plan a medida. Y dentro del portal podrás ver tu horario y tus sesiones grupales pendientes. Todo queda en tus manos desde ese momento. ¿OK?"\n\n"d. Si en algún momento necesitas contactarme, aquí está mi número de WhatsApp. Si aún no lo tienes, avísame cuando estés listo para anotarlo. Es +1 689-280-9986 — de nuevo: +1 689-280-9986. ¿Lo anotaste? Genial."\n\n"e. {Primer Nombre}, estamos muy emocionados de trabajar contigo, verte avanzar en las 4 fases y que te conviertas en una de nuestras historias de éxito. Nos hablamos pronto. ¡Hasta luego!"',
      },
      {
        type: 'branch',
        title: '11. Si Definitivamente No Puede Inscribirse',
        content: '"{Primer Nombre}, está bien — no hay problema. Pero quiero ser directo contigo porque me importa tu resultado.\n\nLlevas tiempo en Estados Unidos con el inglés frenándote — en tu trabajo, en tu carrera, en las oportunidades que no estás tomando. Si hoy no haces un cambio, dentro de un año vas a estar exactamente en el mismo lugar. Y eso es precisamente lo que queremos evitar.\n\nLa oportunidad sigue aquí cuando estés listo. Cuando decidas que es el momento, escríbenos por WhatsApp o visita talkenglishaca.com/inicio y retomamos el proceso desde donde lo dejamos. Gracias por tu tiempo hoy {Primer Nombre}, y espero poder trabajar contigo pronto. ¡Que tengas un gran día!"',
      },
      {
        type: 'voicemail',
        title: '📱 Mensaje de Voz — No Show',
        content: '"Hola {Primer Nombre}, soy Luis de Talk English Academy.\n\nTe llamo respecto a nuestra cita confirmada de hoy. Por favor devuélveme la llamada o escríbeme por WhatsApp hoy a este número: +1 689-280-9986 para que podamos reagendarla.\n\nMis espacios son limitados — y si de verdad estás listo para hablar inglés con confianza y dar el siguiente paso en tu trabajo y tu vida aquí en Estados Unidos, comunícate conmigo hoy.\n\nHablamos pronto. ¡Hasta luego!"',
      },
    ],
    answeredOutcomes: [
      { label: '¡Inscrito! 🎉', action: 'appt_booked', color: 'green' },
      { label: 'Necesita Pensar', action: 'not_available', color: 'yellow' },
      { label: 'No Interesado', action: 'not_interested', color: 'red' },
      { label: 'Número Equivocado', action: 'wrong_number', color: 'red' },
    ],
    notAnsweredOutcomes: [
      { label: 'Dejé Mensaje de Voz', action: 'left_message', color: 'yellow' },
      { label: 'No Show', action: 'no_show', color: 'red' },
      { label: 'Número Equivocado', action: 'wrong_number', color: 'red' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  'rebook-sales-call': {
    stepName: 'Rebook Sales Call',
    callType: 'rebook',
    duration: '3 min',
    sections: [
      {
        type: 'step',
        title: '1. Apertura',
        content: '"¿Hola, hablo con {Primer Nombre}? Hola {Primer Nombre}, soy Luis de Talk English Academy, ¿cómo estás? ¡Genial! {Primer Nombre}, por alguna razón no pudiste estar en tu cita el {Fecha de Cita} a las {Hora de Cita}, lo cual no es ningún problema. Te llamo para reprogramarla. ¿Tienes un momento para hacerlo ahora?"\n\n→ Si dice NO → ir al paso 2\n→ Si dice SÍ → ir al paso 3',
      },
      {
        type: 'branch',
        title: '2. Si no tiene un momento',
        content: '"No hay problema {Primer Nombre}, ¿cuándo puedo llamarte de nuevo para agendar tu cita?"\n\n(Anotar fecha y hora — llamar de vuelta)',
      },
      {
        type: 'step',
        title: '3. Abrir agenda',
        content: '"{Primer Nombre}, dime cuándo tienes disponibilidad en tu agenda."\n\n(Esperar respuesta)\n\n"OK {Primer Nombre}, solo nos quedan un par de espacios disponibles — el {Día} a las {Hora} o el {Día} a las {Hora}. ¿A cuál puedes comprometerte?"',
        widget: 'reschedule-sales',
      },
      {
        type: 'step',
        title: '4. Confirmar nueva cita',
        content: '"OK genial. {Primer Nombre}, te estoy agendando para el {Día} a las {Hora}. Te repito — el {Día} a las {Hora}. Avísame cuando lo hayas anotado en tu agenda. ¿OK? OK, excelente."',
      },
      {
        type: 'step',
        title: '5. Correo y Portal',
        content: '"{Primer Nombre}, por favor revisa tu bandeja de entrada o carpeta de spam para encontrar el correo de confirmación y responde con "CONFIRMADO". ¿OK?\n\nTe estaré contactando nuevamente para confirmar tu cita y verificar que los 4 pasos del Portal de Miembros estén completos antes de tu llamada. ¡Espero hablar contigo entonces, hasta luego!"',
      },
      {
        type: 'voicemail',
        title: '📱 Mensaje de Voz',
        content: '"Hola {Primer Nombre}, soy Luis de Talk English Academy.\n\nTe llamo para reprogramar tu cita de inscripción. Por favor devuélveme la llamada hoy o escríbeme por WhatsApp a este número: +1 689-280-9986 — también puedes hacer clic en el enlace del correo con el asunto "Perdiste tu cita" que te enviamos.\n\nMis espacios son limitados. Si de verdad estás listo para hablar inglés con confianza y dar el paso que va a cambiar tu trabajo y tu vida aquí en Estados Unidos, comunícate conmigo hoy al +1 689-280-9986.\n\nEspero hablar contigo pronto. ¡Hasta luego!"',
      },
    ],
    answeredOutcomes: [
      { label: 'Reagendó Cita', action: 'reschedule', color: 'green' },
      { label: 'No Disponible', action: 'not_available', color: 'yellow' },
      { label: 'No Interesado', action: 'not_interested', color: 'red' },
      { label: 'Número Equivocado', action: 'wrong_number', color: 'red' },
    ],
    notAnsweredOutcomes: [
      { label: 'Dejé Mensaje de Voz', action: 'left_message', color: 'yellow' },
      { label: 'No Contestó', action: 'no_show', color: 'red' },
      { label: 'Número Equivocado', action: 'wrong_number', color: 'red' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  'qual-call-followup': {
    stepName: 'Qual Call Follow Up',
    callType: 'followup',
    duration: '—',
    sections: [
      {
        type: 'note',
        title: 'Follow Up — Qual Call',
        content: 'Este paso es para leads que completaron la llamada de calificación pero no pudieron avanzar. Usar el guion de manejo de objeciones del Closer según la situación del lead.\n\nRevisar las notas de la llamada anterior antes de contactar.',
      },
    ],
    answeredOutcomes: [
      { label: 'Avanzó al Proceso', action: 'appt_booked', color: 'green' },
      { label: 'No Disponible', action: 'not_available', color: 'yellow' },
      { label: 'No Interesado', action: 'not_interested', color: 'red' },
    ],
    notAnsweredOutcomes: [
      { label: 'Dejé Mensaje de Voz', action: 'left_message', color: 'yellow' },
      { label: 'No Contestó', action: 'no_show', color: 'red' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  'sales-call-followup': {
    stepName: 'Sales Call Follow Up',
    callType: 'followup',
    duration: '—',
    sections: [
      {
        type: 'note',
        title: 'Follow Up — Sales Call',
        content: 'Este paso es para leads que asistieron a la Sales Call pero no se inscribieron. Usar el guion de manejo de objeciones del Closer según la razón de no cierre.\n\nRevisar notas de la llamada anterior. Objetivo: resolver la objeción y cerrar.',
      },
    ],
    answeredOutcomes: [
      { label: '¡Inscrito! 🎉', action: 'appt_booked', color: 'green' },
      { label: 'No Disponible', action: 'not_available', color: 'yellow' },
      { label: 'No Interesado', action: 'not_interested', color: 'red' },
    ],
    notAnsweredOutcomes: [
      { label: 'Dejé Mensaje de Voz', action: 'left_message', color: 'yellow' },
      { label: 'No Contestó', action: 'no_show', color: 'red' },
    ],
  },

  // ─────────────────────────────────────────────────────────────
  'tea-students': {
    stepName: 'TEA Students',
    callType: 'followup',
    duration: '—',
    sections: [
      {
        type: 'note',
        title: 'Estudiantes Activos',
        content: '¡Este lead es estudiante de Talk English Academy! 🎓\n\nEsta etapa corresponde a un estudiante activo en el programa. El seguimiento en este paso es de retención y acompañamiento, no de ventas.',
      },
    ],
    answeredOutcomes: [],
    notAnsweredOutcomes: [],
  },
}