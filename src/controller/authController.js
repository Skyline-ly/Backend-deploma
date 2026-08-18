import express from 'express'
import { User } from '../model/User.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import asynchandler from 'express-async-handler'

const AuthController = express.Router()


AuthController.post('/register', asynchandler(async (req, res) => {
    const {
        name,
        email,
        password,
        role
    } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            message: 'All fields are required'
        });
    }
    if (role && !['customer', 'seller'].includes(role)) {
        return res.json({
            message: "invalide registion role"
        })
    }
    if (typeof email !== "string") {
        return res.json({
            message: "invalid email fromat"
        })
    }
    const normalizedEmail = email.trim().toLowerCase();


    const userExists = await User.findOne({
        email: normalizedEmail
    });

    if (userExists) {
        return res.status(400).json({
            success: false,
            message: 'Email already registered.'
        });
    }

    const hashPassword = await bcrypt.hash(password, 10)

    const sellerRequset = role === 'seller'

    const cretaeUser = await User.create({
        name: name,
        email: normalizedEmail,
        password: hashPassword,

        role: 'customer',

        sellerStatus: sellerRequset ? 'pending' : 'none'
    })

    res.status(201).json({
        success: true,

        message: sellerRequset
            ? 'Seller registration submitted successfully. Your request is under Admin review.'
            : 'Customer account created successfully.',

        data: {
            id: cretaeUser._id,
            name: cretaeUser.name,
            email: cretaeUser.email,
            role: cretaeUser.role,
            sellerStatus: cretaeUser.sellerStatus
        }
    });

}));



AuthController.post('/login', asynchandler(async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' })
    }

    const user = await User.findOne({ email })
    if (!user) {
        return res.status(401).json({ message: 'Invalid email or password' })
    }

    if (!user.isActive) {
        return res.status(403).json({ message: 'Your account has been deactivated' })
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid email or password' })
    }

    const secretKey = process.env.JWT_SECRET
    const token = jwt.sign(
        { userId: user._id, email: user.email, role: user.role },
        secretKey,
        { expiresIn: '5m' }
    )

    res.status(200).json({
        message: 'Login successful',
        token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            sellerStatus: user.sellerStatus
        }
    })
})
)

export default AuthController