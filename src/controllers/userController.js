import User from "../models/userModel.js";
import { userCreatedEvent } from "../services/rabbitService.js";
import jwt from "jsonwebtoken";
// import transporter from '../../../emails/src/config/emailConfig.js';

//OBTENER UN REGISTRO DE LA BD A TRAVES DE UNA ID

export const getUsers=async (req, res) => {
    try{
        const users = await User.findAll();

        if (users.length === 0) {
            return res.status(204).json({ message: "No se encontraron usuarios" });
        }

        res.status(200).json(users);
    } catch(error) {
        console.error('Error al listar usuarios:', error);
        res.status(500)
            .json({message: 'Error al obtener los usuarios'});
    }
};

// CREAR UN NUEVO USUARIO

export const createUsers = async (req, res) => {
    const { password, username, phone, rol } = req.body;

    if (!phone || !username || !password) {
        return res.status(200).json({ message: 'Teléfono, correo y contraseña son obligatorios' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(username)) {
        return res.status(200).json({ message: 'El correo electrónico no es válido' });
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phone)) {
        return res.status(200).json({ message: 'El teléfono debe tener 10 dígitos numéricos' });
    }

    if (password.length < 8) {
        return res.status(200).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
    }

    try {
        const userByPhone = await User.findOne({ where: { phone } });

        const userByUsername = await User.findOne({ where: { username } });

        if (userByPhone || userByUsername) {
            return res.status(400).json({ message: 'El usuario ya está registrado' });
        }

        const newUser = await User.create({
            phone,
            username,
            password,
            status: true,
            creationDate: new Date(),
            rol,
        });

        console.log(newUser);
        //Aqui se añade lo de nuestro servicio de rabbitServices.js para que se registre en la queue
        await userCreatedEvent(newUser);
        return res.status(201).json({ message: 'Usuario creado', data: newUser });

    } catch (error) {
        console.error('Error al crear usuario:', error);
        return res.status(500).json({ message: 'Error al crear el usuario' });
    }
};

// ACTUALIZAR UN USUARIO A TRAVES DE UNA ID EN LA URL

export const updateUser = async (req, res) => {
    const { id } = req.params;
    const { phone, password, username } = req.body;

    try {
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: "Usuario no encontrado." });
        }

        // Validar si el teléfono ya está en uso por otro usuario
        if (phone) {
            const userByPhone = await User.findOne({ where: { phone } });
            if (userByPhone && userByPhone.id !== user.id) {
                return res.status(400).json({ message: 'El teléfono ya está siendo utilizado por otro usuario.' });
            }
        }

        if (username) {
            const userByUsername = await User.findOne({ where: { username } });
            if (userByUsername && userByUsername.id !== user.id) {
                return res.status(400).json({ message: 'El teléfono ya está siendo utilizado por otro usuario.' });
            }
        }

        // Validar la contraseña solo si se proporciona
        if (password && password.length < 8) {
            return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres.' });
        }

        // Actualizar solo los campos proporcionados
        await user.update({
            phone: phone || user.phone,
            password: password || user.password,
            username: username || user.username
        });

        return res.status(200).json({ message: 'Usuario actualizado exitosamente', data: user });

    } catch (error) {
        console.error('Error al editar el usuario:', error);
        res.status(500).json({ message: `Error al editar el usuario con la ID: ${id}` });
    }
};


// DAR DE BAJA UN USUARIO - ELIMINAR USUARIO
export const deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await User.findByPk(id);

        if (!user) {
            return res.status(204).json({ message: "Usuario no encontrado" });
        }

        await user.update({ status: false });
        return res.status(200).json({ message: "El usuario ha sido dado de baja correctamente" });

    } catch (error) {
        console.error("Error al dar de baja al usuario:", error);
        return res.status(500).json({ message: `Error al dar de baja al usuario con la ID: ${id}` });
    }
};


export const login = async (req, res) => {
    const { username, password } = req.body;

    try {
        if (!username || !password) {
            return res.status(400).json({ mensaje: "Username y password son requeridos" });
        }

        // Buscar usuario en la BD
        const user = await User.findOne({ where: { username } });

        if (!user) {
            return res.status(401).json({ mensaje: "Credenciales inválidas" }); // 203 no es lo más apropiado, mejor 401
        }

        // Comparar contraseñas (SIN ENCRIPTAR)
        if (user.password !== password) {
            return res.status(401).json({ mensaje: "Credenciales inválidas" });
        }

        // Definir claves secretas por rol (mejor guardarlas en variables de entorno)
        const SECRET_KEYS = {
            admin: "adminSecretKey12345678901234567890123456789012", // 42 caracteres > 256 bits
            customer: "customerSecretKey1234567890123456789012345678", // 46 caracteres > 256 bits
            seller: "sellerSecretKey123456789012345678901234567890"  // 44 caracteres > 256 bits
            //  admin: process.env.ADMIN_SECRET_KEY || "adminSecretKey123",
            // customer: process.env.CUSTOMER_SECRET_KEY || "customerSecretKey123",
            // seller: process.env.SELLER_SECRET_KEY || "sellerSecretKey123"
        };

        // Seleccionar la clave secreta según el rol
        const secretKey = SECRET_KEYS[user.rol];
        
        // Generar JWT incluyendo el rol en el payload
        const token = jwt.sign(
            { 
                id: user.id, 
                username: user.username,
                rol: user.rol 
            },
            secretKey,
            { expiresIn: "1h" }
        );

        return res.status(200).json({ 
            mensaje: "Inicio de sesión exitoso", 
            token,
            rol: user.rol 
        });
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        return res.status(500).json({ mensaje: "Error al iniciar sesión" });
    }
};



import crypto from "crypto";
import { userPasswordChangedEvent, userPasswordChangedEventConfirm  } from "../services/rabbitService.js";

export const changePasswordByEmail = async (req, res) => {
    const { email } = req.params;

    if (!email) {
        return res.status(400).json({ message: "El correo electrónico es obligatorio." });
    }

    try {
        const user = await User.findOne({ where: { username: email } });

        if (!user) {
            return res.status(404).json({ message: "No se encontró ningún usuario con ese correo." });
        }

        // Generar nueva contraseña aleatoria
        const newPassword = crypto.randomBytes(5).toString("hex"); // genera 10 caracteres
        user.password = newPassword;

        await user.save();

        // Publicar evento a RabbitMQ
        await userPasswordChangedEvent({
            email: user.username,
            newPassword,
        });

        return res.status(200).json({
            message: "Se ha generado una nueva contraseña y se enviará al correo.",
        });
    } catch (error) {
        console.error("Error al cambiar la contraseña:", error);
        return res.status(500).json({ message: "Error interno del servidor." });
    }
};

export const changePassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "El correo electrónico es obligatorio." });
    }

    try {
        const user = await User.findOne({ where: { username: email } });

        if (!user) {
            return res.status(404).json({ message: "No se encontró ningún usuario con ese correo." });
        }
        // Publicar evento a RabbitMQ
        await userPasswordChangedEventConfirm({
            email: user.username,
        });

        return res.status(200).json({
            message: "Se ha se enviado confirmacion al correo.",
        });
    } catch (error) {
        console.error("Error al cambiar la contraseña:", error);
        return res.status(500).json({ message: "Error interno del servidor." });
    }
};
