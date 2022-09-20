import bcrypt from 'bcryptjs'
import { pool } from '../db.js'
import jwt from 'jsonwebtoken'
import { serialize } from 'cookie'
import nodemailer from 'nodemailer'
import { google } from 'googleapis'
import hbs from 'nodemailer-express-handlebars'
import path from 'path'
/*
const CLIENT_ID = '606708961766-ttag6051su85n61c05rfcq6nv0kp9p0e.apps.googleusercontent.com'
const CLIENT_SECRET = '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'
const REDIRECT_URI = 'https://developers.google.com/oauthplayground'
const REFRESH_TOKEN = '1//04cj07yNc2vDWCgYIARAAGAQSNwF-L9IrbcQjK5s8G0GCRiGVBSw90Q4_fwmhJIz3Dhw3zjWOBgutxYSCfVFxJU5b_zqgwFtRpOE'


const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN })

*/

export const signUp = async (req, res) => {

    try {

        const { firstName, lastName, email, password, doctorId, HospitalEmail } = req.body

        const [existingUser] = await pool.query("SELECT * FROM registro WHERE email = ?", [email])

        if (existingUser.length !== 0) return res.status(404).json({ message: "El usuario ya existe" });

        const [HospitalData] = await pool.query("INSERT INTO hospitales (email) VALUES (?)", [HospitalEmail])
        
        const id_hospitales = HospitalData.insertId
        
        const hashedPassword = await bcrypt.hash(password, 12)
        /*
        const accessToken = await oAuth2Client.getAccessToken()
        
        const transport = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: 'luisembonstrizzi@gmail.com',
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                // refreshToken: REFRESH_TOKEN,
                accessToken: accessToken
            }
        })

        const handlebarsOptions = {
            viewEngine: {
                extname: ".handlebars",
                partialsDir: path.resolve('./views'),
                defaultLayout: false
            },
            viewPath: path.resolve('./views'),
            extName: ".handlebars"
        }

        transport.use('compile', hbs(handlebarsOptions))

        const mailOptions = {
            from: 'Verificación <luisembonstrizzi@gmail.com>',
            to: HospitalEmail,
            subject: 'Verificación',
            template: 'email'
        }

        await transport.sendMail(mailOptions)

        */
        const transport = nodemailer.createTransport({
            host: 'smtp-relay.sendinblue.com',
            port: 587,
            auth: {
                user: 'luisembonstrizzi@gmail.com',
                pass: 'AHETbVDxSMfUs30I'
            }
        })

        const handlebarsOptions = {
            viewEngine: {
                extname: ".handlebars",
                partialsDir: path.resolve('./views'),
                defaultLayout: false
            },
            viewPath: path.resolve('./views'),
            extName: ".handlebars"
        }

        transport.use('compile', hbs(handlebarsOptions))

        const mailOptions = {
            from: 'Verificación <luisembonstrizzi@gmail.com>',
            to: HospitalEmail,
            subject: 'Verificación',
            template: 'email'
        }

        await transport.sendMail(mailOptions)

        await pool.query("INSERT INTO registro (nombre, apellido, email, contrasenia, matricula, id_Hospital) VALUES (?, ?, ?, ?, ?, ?)", [firstName, lastName, email, hashedPassword, doctorId, id_hospitales])
        
        res.json({ message: "Nos estamos contactando con el hospital el cual corresponde el usuario con el objetivo de verificar su integridad" })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: error.message })
    }

}

export const signIn = async (req, res) => {

    try {
        const { email, password } = req.body

        const [existingUser] = await pool.query("SELECT * FROM registro WHERE email = ?", [email])

        if (existingUser.length === 0) return res.status(404).json({ message: "El usuario no existe" })

        const isPasswordCorrect = await bcrypt.compare(password, existingUser[0].contrasenia)

        if (!isPasswordCorrect) return res.status(400).json({ message: "La contraseña es inválida" })

        const token = jwt.sign({ id: existingUser[0].id }, process.env.SECRET, { expiresIn: "2m" })

        const refreshToken = jwt.sign({ id: existingUser[0].id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "1h" })

        console.log(token)

        console.log(refreshToken)

        const serializeAccessToken = serialize('AccessToken', token, {
            httpOnly: true,
            expiresIn: 0,
            path: '/'
        })



        const serializeRefreshToken = serialize('RefreshToken', refreshToken, {
            httpOnly: true,
            expiresIn: 0,
            path: '/'
        })

        return res.setHeader('Set-Cookie', [serializeAccessToken, serializeRefreshToken]).json({ message: "El usuario se ha logueado con éxito" })


    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

export const refreshToken = async (req, res) => {

    try {

        const refreshToken = req.cookies.RefreshToken;

        if (!refreshToken) return res.status(401).json("No estas autenticado")

        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        const [existingUser] = await pool.query("SELECT * FROM registro WHERE id = ?", [decoded.id])

        if (existingUser.length === 0) return res.status(403).json("El token no es válido")

        const token = jwt.sign({ id: existingUser[0].id }, process.env.SECRET, { expiresIn: "2m" })

        const serializeAccessToken = serialize('AccessToken', token, {
            httpOnly: true,
            expiresIn: 0,
            path: '/'
        })

        return res.setHeader('Set-Cookie', serializeAccessToken).json({ message: "El nuevo access token ha sido creado correctamente" })

    } catch (error) {
        return res.status(500).json({ message: error.message })
    }
}

export const logout = async (req, res) => {

    const serializedAccessToken = serialize('AccessToken', null, {
        maxAge: 0,
        path: '/'
    })


    const serializedRefreshToken = serialize('RefreshToken', null, {
        maxAge: 0,
        path: '/'
    })

    return res.setHeader('Set-Cookie', [serializedAccessToken, serializedRefreshToken]).json({message: "Se ha deslogueado correctamente"})
}

export const forgotPassword = async (req, res) => {
    res.json("Recuperando contraseña")
}

export const updatePassword = async (req, res) => {
    res.json("Actualizando contraseña")
}

