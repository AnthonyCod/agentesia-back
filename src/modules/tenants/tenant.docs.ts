/**
 * @swagger
 * /tenants/{ig_page_id}:
 *   get:
 *     summary: Busca una tienda por su ID de página de Instagram
 *     description: Usado internamente por el webhook para resolver qué tienda corresponde a un mensaje entrante.
 *     tags: [Tiendas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ig_page_id
 *         required: true
 *         schema:
 *           type: string
 *         example: '123456789'
 *     responses:
 *       200:
 *         description: Tienda encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tenant'
 *       401:
 *         description: Token requerido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: No existe ninguna tienda con ese ig_page_id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /tenants/{id}:
 *   put:
 *     summary: Actualiza la configuración de tu tienda
 *     description: >
 *       El dueño puede editar nombre, system_prompt, bot_name, access_token y fb_page_id.
 *       Solo puedes editar una tienda que te pertenezca — se valida contra el JWT.
 *     tags: [Tiendas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID de la tienda a editar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateTenantDto'
 *     responses:
 *       200:
 *         description: Tienda actualizada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tenant'
 *       400:
 *         description: Datos inválidos
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
 *       403:
 *         description: No tienes permiso para editar esta tienda
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Tienda no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
