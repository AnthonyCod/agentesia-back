/**
 * @swagger
 * /webhook:
 *   get:
 *     summary: Verificación inicial del webhook por Meta
 *     description: >
 *       Meta llama a este endpoint una sola vez al configurar el webhook para confirmar
 *       que el servidor es el dueño de la URL. Responde con el challenge si el token coincide.
 *     tags: [Webhook]
 *     parameters:
 *       - in: query
 *         name: hub.mode
 *         required: true
 *         schema:
 *           type: string
 *           enum: [subscribe]
 *         description: Siempre es "subscribe" — enviado por Meta
 *       - in: query
 *         name: hub.verify_token
 *         required: true
 *         schema:
 *           type: string
 *         description: Debe coincidir con META_VERIFY_TOKEN del .env
 *       - in: query
 *         name: hub.challenge
 *         required: true
 *         schema:
 *           type: string
 *         description: Número aleatorio que el servidor debe devolver tal cual
 *     responses:
 *       200:
 *         description: Token válido — devuelve el challenge para que Meta confirme la suscripción
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: '1234567890'
 *       403:
 *         description: Token inválido — verificación rechazada
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: Forbidden
 */

/**
 * @swagger
 * /webhook:
 *   post:
 *     summary: Recibe eventos de Instagram y Facebook en tiempo real
 *     description: >
 *       Meta envía aquí cada mensaje nuevo. El servidor responde 200 OK inmediatamente
 *       y procesa el evento de forma asíncrona para no superar el límite de 5 segundos de Meta.
 *       Valida la firma HMAC-SHA256 en el header x-hub-signature-256.
 *     tags: [Webhook]
 *     parameters:
 *       - in: header
 *         name: x-hub-signature-256
 *         required: false
 *         schema:
 *           type: string
 *         description: Firma HMAC-SHA256 del body — enviada por Meta para autenticar el request
 *         example: 'sha256=abc123...'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Payload de evento de Meta (formato oficial de Meta Webhooks)
 *             properties:
 *               object:
 *                 type: string
 *                 enum: [instagram, page]
 *                 example: instagram
 *               entry:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: ig_page_id de la tienda que recibe el mensaje
 *                       example: '123456789'
 *                     messaging:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           sender:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: '987654321'
 *                           message:
 *                             type: object
 *                             properties:
 *                               text:
 *                                 type: string
 *                                 example: 'Hola, ¿tienen vestidos en talla M?'
 *                               attachments:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     type:
 *                                       type: string
 *                                       example: image
 *                                     payload:
 *                                       type: object
 *                                       properties:
 *                                         url:
 *                                           type: string
 *                                           example: 'https://cdn.instagram.com/comprobante.jpg'
 *     responses:
 *       200:
 *         description: Evento recibido — procesamiento iniciado en segundo plano
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: OK
 *       401:
 *         description: Firma HMAC inválida — request rechazado
 *         content:
 *           text/plain:
 *             schema:
 *               type: string
 *               example: Unauthorized
 */
