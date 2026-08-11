const express = require('express');
const cors = require('cors');
const { sql, poolPromise } = require('./config/db');

const app = express();

app.use(cors());

app.use(express.json());

// ==========================================

// 1. AUTENTICACIÓN (LOGIN)

// ==========================================

app.post('/api/login', async (req, res) => {

    const { usuario, contrasena } = req.body;

    try {
        const pool = await poolPromise;
        const result = await pool.request()

            .input('user', sql.VarChar, usuario)
            .input('pass', sql.VarChar, contrasena)
            .query('SELECT usuario, rol, nombres, apellidos FROM Usuarios WHERE usuario = @user AND contrasena = @pass');

        if (result.recordset.length > 0) {

            res.json({ success: true, user: result.recordset[0] });

        } else {

            res.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });

        }

    } catch (err) {

        res.status(500).send(err.message);

    }
});

// ==========================================

// 2. GESTIÓN DE USUARIOS COLABORADORES (CRUD)

// ==========================================

app.get('/api/usuarios', async (req, res) => {

    try {

        const pool = await poolPromise;
        const result = await pool.query('SELECT id, usuario, contrasena, rol, nombres, apellidos, dni FROM Usuarios');
        res.json(result.recordset);

    } catch (err) {

        res.status(500).send(err.message);

    }

});

app.post('/api/usuarios', async (req, res) => {

    const { usuario, contrasena, rol, nombres, apellidos, dni } = req.body;

    try {

        const pool = await poolPromise;

        const existe = await pool.request()

            .input('user', sql.VarChar, usuario)
            .query('SELECT COUNT(*) AS count FROM Usuarios WHERE usuario = @user');

        if(existe.recordset[0].count > 0) {

            return res.status(400).json({ success: false, message: 'El nombre de usuario ya está registrado.' });

        }

        await pool.request()

            .input('user', sql.VarChar, usuario)
            .input('pass', sql.VarChar, contrasena)
            .input('rol', sql.VarChar, rol)
            .input('nom', sql.VarChar, nombres)
            .input('ape', sql.VarChar, apellidos)
            .input('dni', sql.VarChar, dni)
            .query(`INSERT INTO Usuarios (usuario, contrasena, rol, nombres, apellidos, dni)

                    VALUES (@user, @pass, @rol, @nom, @ape, @dni)`);

        res.json({ success: true, message: 'Usuario colaborador registrado correctamente.' });

    } catch (err) {

        res.status(500).send(err.message);

    }

});

app.put('/api/usuarios/:id', async (req, res) => {

    const { id } = req.params;

    const { usuario, contrasena, rol, nombres, apellidos, dni } = req.body;

    try {

        const pool = await poolPromise;

        await pool.request()

            .input('id', sql.Int, id)
            .input('user', sql.VarChar, usuario)
            .input('pass', sql.VarChar, contrasena)
            .input('rol', sql.VarChar, rol)
            .input('nom', sql.VarChar, nombres)
            .input('ape', sql.VarChar, apellidos)
            .input('dni', sql.VarChar, dni)
            .query(`UPDATE Usuarios SET

                        usuario = @user,

                        contrasena = @pass,

                        rol = @rol,

                        nombres = @nom,

                        apellidos = @ape,

                        dni = @dni

                    WHERE id = @id`);

        res.json({ success: true, message: 'Usuario colaborador actualizado correctamente.' });

    } catch (err) {

        res.status(500).send(err.message);

    }

});

app.delete('/api/usuarios/:id', async (req, res) => {

    const { id } = req.params;

    try {

        const pool = await poolPromise;
        await pool.request()

            .input('id', sql.Int, id)
            .query('DELETE FROM Usuarios WHERE id = @id');

        res.json({ success: true, message: 'Usuario eliminado correctamente.' });

    } catch (err) {

        res.status(500).send(err.message);

    }

});

// ==========================================

// 3. INDICADORES DEL DASHBOARD

// ==========================================

app.get('/api/dashboard/contadores', async (req, res) => {

    try {

        const pool = await poolPromise;
        const totalClientes = await pool.query("SELECT COUNT(*) AS total FROM Clientes");
        const nuevosHoy = await pool.query("SELECT COUNT(*) AS total FROM Clientes WHERE CAST(fecha_registro AS DATE) = CAST(GETDATE() AS DATE)");
        const campanasActivas = await pool.query("SELECT COUNT(*) AS total FROM Campanas");
        const totalUsuarios = await pool.query("SELECT COUNT(*) AS total FROM Usuarios");

        res.json({

            totalClientes: totalClientes.recordset[0].total,
            nuevosHoy: nuevosHoy.recordset[0].total,
            campanasActivas: campanasActivas.recordset[0].total,
            totalUsuarios: totalUsuarios.recordset[0].total

        });

    } catch (err) { res.status(500).send(err.message); }

});

// ==========================================

// 4. MÓDULO DE CLIENTES

// ==========================================

app.get('/api/clientes/verificar/:doc', async (req, res) => {

    try {

        const pool = await poolPromise;
        const result = await pool.request()

            .input('doc', sql.VarChar, req.params.doc)
            .query('SELECT COUNT(*) AS count FROM Clientes WHERE numero_documento = @doc');

        res.json({ existe: result.recordset[0].count > 0 });

    } catch (err) { res.status(500).send(err.message); }

});

// AÑADIR NUEVO CLIENTE 

app.post('/api/clientes', async (req, res) => {

    const { tipo_documento, numero_documento, nombres, apellidos, correo_electronico, telefono, categoria_inicial } = req.body;

    try {

        const pool = await poolPromise;
        await pool.request()

            .input('tipo', sql.VarChar, tipo_documento)
            .input('doc', sql.VarChar, numero_documento)
            .input('nom', sql.VarChar, nombres)
            .input('ape', sql.VarChar, apellidos)
            .input('email', sql.VarChar, correo_electronico)
            .input('tel', sql.VarChar, telefono)
            .input('cat', sql.VarChar, categoria_inicial)
            .query(`INSERT INTO Clientes (tipo_documento, numero_documento, nombres, apellidos, correo_electronico, telefono, categoria_inicial, puntos_acumulados, fecha_registro)

                    VALUES (@tipo, @doc, @nom, @ape, @email, @tel, @cat, 0, GETDATE())`);

        res.json({ success: true, message: 'Cliente registrado correctamente.' });

    } catch (err) {

        console.error("Error detallado al insertar cliente:", err.message);

        res.status(500).send(err.message);

    }

});

app.get('/api/clientes/:doc', async (req, res) => {

    try {

        const pool = await poolPromise;
        const result = await pool.request()

            .input('doc', sql.VarChar, req.params.doc)
            .query('SELECT * FROM Clientes WHERE numero_documento = @doc');

        if (result.recordset.length > 0) res.json(result.recordset[0]);

        else res.status(404).json({ message: 'Cliente no encontrado' });

    } catch (err) { res.status(500).send(err.message); }

});

app.get('/api/clientes', async (req, res) => {

    try {

        const pool = await poolPromise;

        const result = await pool.query('SELECT * FROM Clientes');

        res.json(result.recordset);

    } catch (err) { res.status(500).send(err.message); }

});


app.put('/api/clientes/actualizar/:id', async (req, res) => {

    const { id } = req.params;
    const { tipo_documento, numero_documento, nombres, apellidos, correo_electronico, telefono, categoria_inicial, puntos_acumulados } = req.body;

    try {

        const pool = await poolPromise;

        await pool.request()

            .input('id', sql.Int, id)
            .input('tipo', sql.VarChar, tipo_documento)
            .input('doc', sql.VarChar, numero_documento)
            .input('nom', sql.VarChar, nombres)
            .input('ape', sql.VarChar, apellidos)
            .input('email', sql.VarChar, correo_electronico)
            .input('tel', sql.VarChar, telefono)
            .input('cat', sql.VarChar, categoria_inicial)
            .input('puntos', sql.Int, puntos_acumulados)
            .query(`UPDATE Clientes SET tipo_documento = @tipo, numero_documento = @doc, nombres = @nom, apellidos = @ape, correo_electronico = @email, telefono = @tel, categoria_inicial = @cat, puntos_acumulados = @puntos WHERE id = @id`);

        res.json({ success: true, message: 'Cliente actualizado.' });

    } catch (err) { res.status(500).send(err.message); }

});

app.delete('/api/clientes/:id', async (req, res) => {

    const { id } = req.params;

    try {

        const pool = await poolPromise;
        await pool.request().input('id', sql.Int, id).query('DELETE FROM Clientes WHERE id = @id');
        res.json({ success: true, message: 'Cliente eliminado.' });

    } catch (err) { res.status(500).send(err.message); }

});

// ==========================================

// 5. MÓDULO DE CAMPAÑAS Y REPORTES

// ==========================================

app.get('/api/campanas', async (req, res) => {

    try {

        const pool = await poolPromise;
        const result = await pool.query('SELECT * FROM Campanas');
        res.json(result.recordset);

    } catch (err) { res.status(500).send(err.message); }

});

app.put('/api/campanas/:id', async (req, res) => {

    const { id } = req.params;
    const { nombre, vigencia, descripcion } = req.body;

    try {

        const pool = await poolPromise;
        await pool.request().input('id', sql.Int, id).input('nombre', sql.VarChar, nombre).input('vigencia', sql.VarChar, vigencia).input('desc', sql.VarChar, descripcion).query('UPDATE Campanas SET nombre = @nombre, vigencia = @vigencia, descripcion = @desc WHERE id = @id');
        res.json({ success: true, message: 'Campaña actualizada.' });

    } catch (err) { res.status(500).send(err.message); }

});

app.delete('/api/campanas/:id', async (req, res) => {

    const { id } = req.params;

    try {

        const pool = await poolPromise;
        await pool.request().input('id', sql.Int, id).query('DELETE FROM Campanas WHERE id = @id');
        res.json({ success: true, message: 'Campaña eliminada.' });

    } catch (err) { res.status(500).send(err.message); }

});

app.get('/api/reportes/dashboard', async (req, res) => {

    try {

        const pool = await poolPromise;
        const result = await pool.query(`SELECT categoria_inicial AS categoria, COUNT(*) AS cantidad FROM Clientes GROUP BY categoria_inicial`);
        res.json(result.recordset);

    } catch (err) { res.status(500).send(err.message); }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => { console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`); });