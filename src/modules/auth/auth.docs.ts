/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registra una nueva cuenta
 *     description: Crea el usuario. La tienda se configura después en el onboarding (POST /auth/setup).
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterDto'
 *     responses:
 *       201:
 *         description: Cuenta creada. needsOnboarding será true hasta que configures tu tienda.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResult'
 *       400:
 *         description: Email ya registrado o datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Inicia sesión con email y contraseña
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginDto'
 *     responses:
 *       200:
 *         description: >
 *           Login exitoso. Revisa needsOnboarding y needsTenantSelection para saber
 *           qué pantalla mostrar: wizard de tienda o selector de tienda.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResult'
 *       401:
 *         description: Credenciales inválidas o cuenta desactivada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Inicia sesión o registra con Google
 *     description: >
 *       El frontend obtiene el credential del botón de Google (@react-oauth/google)
 *       y lo envía aquí. Si el usuario no existe se crea automáticamente.
 *       Mismo comportamiento que /auth/login respecto a needsOnboarding.
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [credential]
 *             properties:
 *               credential:
 *                 type: string
 *                 description: ID token de Google (googleUser.credential)
 *                 example: eyJhbGciOiJSUzI1NiIsImtpZCI6...
 *     responses:
 *       200:
 *         description: Autenticación con Google exitosa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResult'
 *       401:
 *         description: Token de Google inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/setup:
 *   post:
 *     summary: Configura la tienda durante el onboarding (o agrega una nueva tienda)
 *     description: >
 *       Llamar cuando needsOnboarding es true, o cuando el dueño quiere agregar
 *       una segunda tienda. Retorna un nuevo token con tenantId incluido.
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SetupTenantDto'
 *     responses:
 *       201:
 *         description: Tienda creada. El token retornado reemplaza al anterior — tiene tenantId.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResult'
 *       400:
 *         description: Datos inválidos o ig_page_id ya registrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Token requerido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/select-tenant:
 *   post:
 *     summary: Selecciona con qué tienda trabajar en esta sesión
 *     description: >
 *       Llamar cuando needsTenantSelection es true (usuario con más de una tienda).
 *       Retorna un nuevo token con el tenantId de la tienda elegida.
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenantId]
 *             properties:
 *               tenantId:
 *                 type: string
 *                 format: uuid
 *                 example: a1b2c3d4-e5f6-7890-abcd-ef1234567890
 *     responses:
 *       200:
 *         description: Tienda seleccionada. Usa el nuevo token para los siguientes requests.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResult'
 *       400:
 *         description: Tienda no encontrada o no pertenece a tu cuenta
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Token requerido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/tenants:
 *   get:
 *     summary: Lista todas las tiendas del usuario autenticado
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tiendas del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tenants:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TenantInfo'
 *       401:
 *         description: Token requerido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Cierra la sesión e invalida el token en el servidor
 *     description: >
 *       Graba last_logout_at en la BD. Cualquier request posterior con el mismo token
 *       será rechazado aunque no haya expirado. El frontend debe eliminar el token local.
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sesión cerrada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Sesión cerrada correctamente
 *       401:
 *         description: Token requerido o ya inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
